const { execSync } = require('child_process');
const path = require('path');

const installPath = __dirname;  // Instala na pasta onde o script está salvo
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
        console.log('⏳ Instalando dependências...');
        execSync(`npm install ${packages.join(' ')} --prefix "${installPath}"`, { stdio: 'inherit' });
        console.log('✅ Dependências instaladas com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao instalar pacotes:', err.message);
    }
}

installPackages();
