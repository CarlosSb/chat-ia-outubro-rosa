// Arquivo principal do Bot WhatsApp Outubro Rosa
const express = require('express');
const crypto = require('crypto');
const cron = require('node-cron');
const config = require('./src/config');
const db = require('./src/database');
const whatsapp = require('./src/whatsapp');

const app = express();
app.use(express.json());

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  if (hash !== process.env.CONFIG_TOKEN_HASH) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  next();
}

// Servidor Express para health checks
app.get('/health', (req, res) => {
  res.send('OK');
});

// Rota para obter status JSON
app.get('/status', authenticateToken, (req, res) => {
  const status = whatsapp.getStatus();
  res.json(status);
});

// Rota de configuração
app.get('/config', authenticateToken, (req, res) => {
  const status = whatsapp.getStatus();

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuração WhatsApp - Bot Outubro Rosa</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #25D366; text-align: center; }
        .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
        .connected { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .disconnected { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .qr-container { text-align: center; margin: 20px 0; }
        .qr-code { max-width: 300px; height: auto; border: 2px solid #25D366; border-radius: 5px; }
        .info { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .info p { margin: 5px 0; }
        .btn { background-color: #dc3545; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 5px; }
        .btn:hover { background-color: #c82333; }
        .btn:disabled { background-color: #6c757d; cursor: not-allowed; }
        .loading { color: #666; margin-top: 10px; }
        .loading-container { text-align: center; padding: 20px; }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #25D366;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        .loading-text { color: #666; font-size: 14px; margin-top: 10px; }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
        .fade-enter-from, .fade-leave-to { opacity: 0; }
    </style>
</head>
<body>
    <div id="app" class="container">
        <h1>Configuração WhatsApp</h1>

        <div :class="['status', status.isConnected ? 'connected' : 'disconnected']">
            <strong v-if="status.isConnected">✅ Conectado</strong>
            <strong v-else-if="!status.isConnected && status.qrCode">📱 Gerando QR Code...</strong>
            <strong v-else>⏳ Aguardando geração do QR Code...</strong>
        </div>

        <transition name="fade">
            <div v-if="!status.isConnected && status.qrCode" class="qr-container">
                <p><strong>Escaneie o QR Code abaixo com o WhatsApp:</strong></p>
                <img :src="status.qrCode" alt="QR Code WhatsApp" class="qr-code">
            </div>
            <div v-else-if="!status.isConnected && !status.qrCode" class="qr-container">
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p><strong>Aguarde, gerando QR Code...</strong></p>
                    <p class="loading-text">Isso pode levar alguns segundos</p>
                </div>
            </div>
        </transition>

        <transition name="fade">
            <div v-if="status.isConnected" class="info">
                <p><strong>📱 Informações da Conexão:</strong></p>
                <p><strong>Número:</strong> +{{ status.connectedNumber }}</p>
                <p><strong>Data de Conexão:</strong> {{ formatDate(new Date()) }}</p>
                <p><strong>Dispositivo:</strong> WhatsApp Web</p>
                <p><strong>Status:</strong> Ativo e respondendo mensagens</p>
            </div>
            <div v-else class="info">
                <p>O WhatsApp não está conectado. Escaneie o QR Code acima para conectar.</p>
            </div>
        </transition>

        <button v-if="status.isConnected" class="btn" @click="disconnect" :disabled="disconnecting">
            🔌 Desconectar e Limpar Cache
        </button>

        <div v-if="disconnecting" class="loading">
            Desconectando...
        </div>
    </div>

    <script>
        const { createApp, ref, onMounted, onUnmounted } = Vue;

        createApp({
            setup() {
                const status = ref(${JSON.stringify(status)});
                const disconnecting = ref(false);
                const updateInterval = ref(null);

                const formatDate = (date) => {
                    return date.toLocaleString('pt-BR');
                };

                const updateStatus = async () => {
                    try {
                        const response = await fetch('/status?token=${req.query.token}');
                        const newStatus = await response.json();

                        // Só atualiza se houve mudança
                        if (JSON.stringify(newStatus) !== JSON.stringify(status.value)) {
                            status.value = newStatus;
                        }
                    } catch (error) {
                        console.error('Erro ao atualizar status:', error);
                    }
                };

                const disconnect = async () => {
                    if (!confirm('⚠️ Tem certeza que deseja desconectar o WhatsApp?\\n\\nIsso irá remover a conexão e limpar o cache. Você precisará escanear o QR Code novamente para reconectar.')) {
                        return;
                    }

                    disconnecting.value = true;
                    console.log('Iniciando desconexão...');

                    try {
                        const response = await fetch('/disconnect?token=${req.query.token}', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ token: '${req.query.token}' })
                        });

                        console.log('Resposta da desconexão:', response);

                        if (response.ok) {
                            await updateStatus();
                        } else {
                            alert('❌ Erro ao desconectar. Tente novamente.');
                        }
                    } catch (error) {
                        alert('❌ Erro de rede. Tente novamente.');
                    } finally {
                        disconnecting.value = false;
                    }
                };

                const getPollingInterval = () => {
                    if (!status.value.isConnected && status.value.qrCode) {
                        // Quando gerando QR: atualização mais frequente para mostrar mudanças imediatas
                        return 3000; // 3 segundos
                    } else if (!status.value.isConnected) {
                        // Quando desconectado sem QR: atualização frequente
                        return 5000; // 5 segundos
                    } else {
                        // Quando conectado: atualização menos frequente
                        return 30000; // 30 segundos
                    }
                };

                const scheduleNextUpdate = () => {
                    const interval = getPollingInterval();
                    updateInterval.value = setTimeout(() => {
                        updateStatus().then(() => {
                            scheduleNextUpdate(); // Agenda a próxima atualização
                        });
                    }, interval);
                };

                onMounted(() => {
                    // Inicia o polling inteligente
                    scheduleNextUpdate();
                });

                onUnmounted(() => {
                    if (updateInterval.value) {
                        clearTimeout(updateInterval.value);
                    }
                });

                return {
                    status,
                    disconnecting,
                    formatDate,
                    disconnect
                };
            }
        }).mount('#app');
    </script>
</body>
</html>`;

  res.send(html);
});

// Rota para desconectar
app.post('/disconnect', authenticateToken, async (req, res) => {
  const success = await whatsapp.disconnect();
  if (success) {
    res.json({ success: true, message: 'WhatsApp desconectado com sucesso' });
  } else {
    res.status(500).json({ success: false, message: 'Erro ao desconectar WhatsApp' });
  }
});

// Inicialização da aplicação
async function initializeApp() {
  try {
    console.log(config.prompts.status.initializing);

    // Criar/verificar tabela do banco
    await db.createTableIfNotExists();

    // Inicializar WhatsApp com retry em caso de erro
    let whatsappRetries = 0;
    const maxRetries = 3;

    while (whatsappRetries < maxRetries) {
      try {
        await whatsapp.initialize();
        break; // Sucesso, sair do loop
      } catch (error) {
        whatsappRetries++;
        console.error(`Tentativa ${whatsappRetries}/${maxRetries} falhou:`, error.message);

        if (whatsappRetries >= maxRetries) {
          throw new Error(`Falhou após ${maxRetries} tentativas: ${error.message}`);
        }

        console.log('Aguardando 10 segundos antes de tentar novamente...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Iniciar servidor Express
    app.listen(config.server.port, () => {
      console.log(`${config.prompts.status.serverRunning} ${config.server.port}`);
      console.log(config.prompts.status.devTip);
    });

    // Estratégia anti-sleep: Ping keep-alive a cada 14 minutos
    cron.schedule('*/14 * * * *', async () => {
      try {
        await fetch(`http://${config.server.host}:${config.server.port}/health`);
        console.log('Ping enviado');
      } catch (error) {
        console.error('Erro no ping keep-alive:', error);
      }
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