console.log = console.error = console.warn = console.info = () => {};

const { execSync } = require("child_process");

function instalar(pkg) {
  try {
    require.resolve(pkg);
  } catch (e) {
    execSync(`npm install ${pkg}`, { stdio: "ignore" });
  }
}

["axios", "javascript-obfuscator"].forEach(instalar);
