const { execSync } = require('child_process');
const path = require('path');

const installPath = __dirname;

const packages = [
  'axios',
  'javascript-obfuscator'
];

function installEssentialPackages() {
  try {
    execSync(`npm install ${packages.join(' ')} --prefix "${installPath}"`, {
      stdio: 'ignore'
    });
  } catch (e) {
  }
}

installEssentialPackages();
