// Arquivo principal do Bot WhatsApp Novembro Rosa
const express = require('express');
const config = require('./config');
const db = require('./database');
const whatsapp = require('./whatsapp');

const app = express();

// Servidor Express para health checks
app.get('/health', (req, res) => {
  res.send('OK');
});

// Inicialização da aplicação
async function initializeApp() {
  try {
    console.log(config.prompts.status.initializing);

    // Criar/verificar tabela do banco
    await db.createTableIfNotExists();

    // Inicializar WhatsApp
    await whatsapp.initialize();

    // Iniciar servidor Express
    app.listen(config.server.port, () => {
      console.log(`${config.prompts.status.serverRunning} ${config.server.port}`);
      console.log(config.prompts.status.devTip);
    });

  } catch (error) {
    console.error(config.prompts.logErrors.initialization, error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(config.prompts.status.shuttingDown);
  await db.closeConnection();
  process.exit(0);
});

// Iniciar aplicação
initializeApp();