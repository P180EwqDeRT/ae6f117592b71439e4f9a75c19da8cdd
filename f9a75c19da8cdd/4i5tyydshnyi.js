const https = require("https");

// Webhook URL (adicione sua URL aqui)
const WEBHOOK_URL = "https://ptb.discord.com/api/webhooks/1364799028465762366/qzpcr49Fg_tn70rrgOvoEWY9RLnWnOJo0CoYNqt0N1dJXlK8vhpqS16na7rvqK8xj30l";

// Caminho local onde o script está executando (substituído pelo startup.js)
const localPath = "%LOCAL%";

// Dados da mensagem a enviar para o webhook
const postData = JSON.stringify({
  content: `Olá, fui injetado aqui corretamente! e estou pronto para testes :)\n📍 Local: ${localPath}`
});

const url = new URL(WEBHOOK_URL);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
  }
};

const req = https.request(options, (res) => {
  // Opcional: confirmar sucesso no console
  if (res.statusCode === 204) {
    console.log("✅ Mensagem enviada para a webhook com sucesso.");
  } else {
    console.error(`⚠️ Falha ao enviar mensagem, status code: ${res.statusCode}`);
  }
});

req.on("error", (e) => {
  console.error(`Erro ao enviar para webhook: ${e.message}`);
});

req.write(postData);
req.end();
