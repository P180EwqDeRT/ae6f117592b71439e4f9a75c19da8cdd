const { execSync } = require('child_process');
const path = require('path');

const installPath = __dirname;
const packages = [
    'axios',
    'fs-extra',
    'request'
];

function installPackages() {
    console.log('📦 Instalando bibliotecas necessárias...');
    try {
        execSync(`npm install ${packages.join(' ')} --prefix "${installPath}"`, { stdio: 'inherit' });
        console.log('✅ Todas bibliotecas instaladas.');
    } catch (err) {
        console.error('❌ Falha ao instalar bibliotecas:', err.message);
    }
}

installPackages();
