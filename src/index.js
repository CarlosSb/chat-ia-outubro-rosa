// Arquivo principal do Bot WhatsApp Novembro Rosa
const express = require('express');
const crypto = require('crypto');
const config = require('./config');
const db = require('./database');
const whatsapp = require('./whatsapp');

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
    <title>Configuração WhatsApp - Bot Novembro Rosa</title>
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
        .loading { display: none; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Configuração WhatsApp</h1>

        <div id="status" class="status ${status.isConnected ? 'connected' : 'disconnected'}">
            ${status.isConnected ?
                '<strong>✅ Conectado</strong>' :
                '<strong>❌ Desconectado</strong><br>Aguardando conexão...'
            }
        </div>

        ${!status.isConnected && status.qrCode ?
            '<div class="qr-container"><p><strong>Escaneie o QR Code abaixo com o WhatsApp:</strong></p><img src="' + status.qrCode + '" alt="QR Code WhatsApp" class="qr-code"></div>' :
            ''
        }

        ${status.isConnected ?
            '<div class="info"><p><strong>📱 Informações da Conexão:</strong></p><p><strong>Número:</strong> +' + status.connectedNumber + '</p><p><strong>Data de Conexão:</strong> ' + new Date().toLocaleString('pt-BR') + '</p><p><strong>Dispositivo:</strong> WhatsApp Web</p><p><strong>Status:</strong> Ativo e respondendo mensagens</p></div><button class="btn" onclick="disconnect()">🔌 Desconectar e Limpar Cache</button><div id="loading" class="loading">Desconectando...</div>' :
            '<div class="info"><p>O WhatsApp não está conectado. Escaneie o QR Code acima para conectar.</p></div>'
        }
    </div>

    <script>
        let currentStatus = ${JSON.stringify(status)};

        async function updateStatus() {
            try {
                const response = await fetch('/status?token=${req.query.token}');
                const newStatus = await response.json();

                if (JSON.stringify(newStatus) !== JSON.stringify(currentStatus)) {
                    currentStatus = newStatus;
                    updateUI(newStatus);
                }
            } catch (error) {
                console.error('Erro ao atualizar status:', error);
            }
        }

        function updateUI(status) {
            const statusDiv = document.getElementById('status');
            const qrContainer = document.querySelector('.qr-container');
            const infoDiv = document.querySelector('.info');
            const btn = document.querySelector('.btn');

            if (status.isConnected) {
                statusDiv.className = 'status connected';
                statusDiv.innerHTML = '<strong>✅ Conectado</strong>';

                if (qrContainer) qrContainer.style.display = 'none';
                if (infoDiv) {
                    infoDiv.innerHTML = '<p><strong>📱 Informações da Conexão:</strong></p><p><strong>Número:</strong> +' + status.connectedNumber + '</p><p><strong>Data de Conexão:</strong> ' + new Date().toLocaleString('pt-BR') + '</p><p><strong>Dispositivo:</strong> WhatsApp Web</p><p><strong>Status:</strong> Ativo e respondendo mensagens</p>';
                }
                if (btn) btn.style.display = 'inline-block';
            } else {
                statusDiv.className = 'status disconnected';
                statusDiv.innerHTML = '<strong>❌ Desconectado</strong><br>Aguardando conexão...';

                if (status.qrCode) {
                    if (!qrContainer) {
                        const newQrContainer = document.createElement('div');
                        newQrContainer.className = 'qr-container';
                        newQrContainer.innerHTML = '<p><strong>Escaneie o QR Code abaixo com o WhatsApp:</strong></p><img src="' + status.qrCode + '" alt="QR Code WhatsApp" class="qr-code">';
                        statusDiv.insertAdjacentElement('afterend', newQrContainer);
                    } else {
                        qrContainer.style.display = 'block';
                        qrContainer.innerHTML = '<p><strong>Escaneie o QR Code abaixo com o WhatsApp:</strong></p><img src="' + status.qrCode + '" alt="QR Code WhatsApp" class="qr-code">';
                    }
                }

                if (infoDiv) {
                    infoDiv.innerHTML = '<p>O WhatsApp não está conectado. Escaneie o QR Code acima para conectar.</p>';
                }
                if (btn) btn.style.display = 'none';
            }
        }

        async function disconnect() {
            if (!confirm('⚠️ Tem certeza que deseja desconectar o WhatsApp?\\n\\nIsso irá remover a conexão e limpar o cache. Você precisará escanear o QR Code novamente para reconectar.')) {
                return;
            }

            const btn = document.querySelector('.btn');
            const loading = document.getElementById('loading');

            btn.disabled = true;
            loading.style.display = 'block';

            try {
                const response = await fetch('/disconnect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: '${req.query.token}' })
                });

                if (response.ok) {
                    updateStatus();
                    loading.style.display = 'none';
                } else {
                    alert('❌ Erro ao desconectar. Tente novamente.');
                    btn.disabled = false;
                    loading.style.display = 'none';
                }
            } catch (error) {
                alert('❌ Erro de rede. Tente novamente.');
                btn.disabled = false;
                loading.style.display = 'none';
            }
        }

        // Atualizar status a cada 2 segundos
        setInterval(updateStatus, 2000);
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