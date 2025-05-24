const https = require("https");

const webhook = "https://ptb.discord.com/api/webhooks/1364799028465762366/qzpcr49Fg_tn70rrgOvoEWY9RLnWnOJo0CoYNqt0N1dJXlK8vhpqS16na7rvqK8xj30l";
const mensagem = {
  content: "Olá, fui injetado aqui corretamente! e estou pronto para testes :)",
  embeds: [{
    title: "Dr4g0nSec",
    description: "Executado em: %LOCAL%",
    color: 0x00ff00
  }]
};

const req = https.request(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" }
});
req.write(JSON.stringify(mensagem));
req.end();
