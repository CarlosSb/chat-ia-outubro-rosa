// Gerenciamento do WhatsApp client
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrCodeLib = require('qrcode');
const config = require('./config');
const db = require('./database');
const openai = require('./openai');

// Variáveis de estado do WhatsApp
let isConnected = false;
let connectedNumber = null;
let currentQrCode = null;
let lastQrGeneration = 0;
const QR_GENERATION_COOLDOWN = 30000; // 30 segundos entre gerações de QR

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: config.whatsapp.puppeteerArgs,
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
});

// Verificar horário comercial
function isBusinessHours() {
  const now = new Date();
  const hour = now.getHours() + config.antiBan.timezoneOffset; // UTC-3 para BR
  return hour >= config.antiBan.businessHoursStart && hour <= config.antiBan.businessHoursEnd;
}

// Delay aleatório para anti-ban
function getRandomDelay() {
  return Math.random() * (config.antiBan.maxDelay - config.antiBan.minDelay) + config.antiBan.minDelay;
}

// Enviar resposta com delay
async function sendResponse(message, text=null, audioBuffer = null) {
  try {
    const delay = getRandomDelay();
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if(text){
      await message.reply(text);
    }

    if (audioBuffer) {
      // Usar fromBuffer em vez de fromFilePath para evitar erro de path null
      const audioMedia = new MessageMedia('audio/ogg', audioBuffer.toString('base64'));
      await message.reply(audioMedia);
    }

    // Salvar resposta no DB
    await db.saveMessage(message.from, message.type, message.body, text);
  } catch (error) {
    console.error('❌ Erro ao enviar resposta:', error);
  }
}

// Processar mensagem recebida
async function handleMessage(message) {
  try {
    // Verificar horário comercial
    /*
    if (!isBusinessHours()) {
      console.log(config.prompts.status.businessHoursIgnored);
      return;
    }*/

    const userId = message.from;

    // Verificar consentimento
    const hasConsent = await db.getUserConsent(userId);
    if (!hasConsent) {
      if (message.body.toUpperCase() === 'SIM') {
        // Definir flag de consentimento como verdadeira
        await db.updateConsent(userId, true);
        // Salvar mensagem de consentimento
        await db.saveMessage(userId, 'consent', 'SIM');
        // Responder confirmação
        await message.reply(config.prompts.consent.granted);
        console.log('✅ Consentimento definido + prosseguindo para IA');
        // Não retorna - prossegue para processamento de IA na mesma mensagem
      } else {
        await message.reply(config.prompts.consent.request);
        return;
      }
    }

    // Verificar rate limit
    if (!(await db.checkRateLimit(userId))) {
      await message.reply(config.prompts.errors.rateLimit);
      return;
    }

    let responseText = '';
    const history = await db.getConversationHistory(userId);

    // Processar tipo de mensagem
    if (message.type === 'chat') {
      responseText = await openai.processTextMessage(message, history);
    } else if (message.type === 'audio' || message.type === 'ptt') {
      const media = await message.downloadMedia();
      if (!media || !media.data) {
        responseText = config.prompts.errors.audioDownloadError;
      } else {
        try {
          const transcription = await openai.processAudioMessage(media);
          const textMessage = { ...message, body: transcription };
          responseText = await openai.processTextMessage(textMessage, history);
        } catch (error) {
          console.error('Erro específico no processamento de áudio:', error);
          if (error.status === 400) {
            responseText = 'Áudio inválido ou muito longo. Tente um áudio mais curto.';
          } else if (error.message && error.message.includes('transcription')) {
            responseText = 'Não consegui entender bem o áudio. Pode repetir sua pergunta por escrito?';
          } else {
            responseText = config.prompts.errors.audioProcessingError;
          }
        }
      }
    } else if (message.type === 'image') {
      const media = await message.downloadMedia();
      if (!media) {
        responseText = config.prompts.errors.imageDownloadError;
      } else {
        responseText = await openai.processImageMessage(media);
      }
    } else {
      responseText = config.prompts.errors.invalidMessage;
    }

    // Gerar áudio TTS (com try-catch para não falhar se TTS der erro)
    let audioBuffer = null;
    try {
      audioBuffer = await openai.generateTTS(responseText);
    } catch (ttsError) {
      console.warn('TTS falhou, enviando apenas texto:', ttsError.message);
    }

    // Lógica de resposta baseada no tipo de input (mirror)
    if (message.type === 'audio' || message.type === 'ptt') {
      // Input áudio → resposta só TTS (econômico e natural)
      if (audioBuffer) {
        await sendResponse(message, null, audioBuffer); // Só áudio
        console.log('✅ Resposta enviada: só áudio (input era áudio)');
      } else {
        // TTS falhou para áudio → enviar texto (como se fosse input texto)
        await sendResponse(message, responseText, null);
        console.log('✅ Resposta enviada: texto (TTS falhou para input áudio)');
      }
    } else {
      // Input texto/imagem → resposta texto 
      await sendResponse(message, responseText, null);
      console.log('✅ Resposta enviada: texto');
    }

  } catch (error) {
    console.error(config.prompts.logErrors.messageHandler, error);
    try {
      await message.reply(config.prompts.errors.processingError);
    } catch (replyError) {
      console.error(config.prompts.logErrors.responseSend, replyError);
    }
  }
}

// Configurar event handlers
function setupEventHandlers() {
  client.on('qr', async (qr) => {
    const now = Date.now();
    if (now - lastQrGeneration < QR_GENERATION_COOLDOWN) {
      console.log('⏳ QR code gerado recentemente, pulando geração...');
      return;
    }

    console.log(config.prompts.status.qrGenerated);
    qrcode.generate(qr, { small: true });
    currentQrCode = await qrCodeLib.toDataURL(qr);
    lastQrGeneration = now;
    isConnected = false;
    connectedNumber = null;
  });

  client.on('ready', async () => {
    console.log(config.prompts.status.whatsappReady);
    isConnected = true;
    const info = client.info;
    connectedNumber = info.wid.user;
    currentQrCode = null;
  });

  client.on('disconnected', async(reason) => {
    console.log('WhatsApp desconectado:', reason);
    isConnected = false;
    connectedNumber = null;
    currentQrCode = null;
    console.log('Reconectando...');
    if(reason === 'LOGOUT') {
      await disconnect()
      return; // Não reconectar após logout
    }
    setTimeout(() => {
      client.destroy();
      client.initialize();
    }, 5000);
  });

  client.on('authenticated', () => {
    console.log('WhatsApp autenticado com sucesso');
  });

  client.on('error', async (error) => {
    console.error('Erro no cliente WhatsApp:', error);

    // Verificar se é erro de desconexão abrupta do Puppeteer
    const isPuppeteerError = error.message?.includes('Session closed') ||
                            error.message?.includes('Target closed') ||
                            error.message?.includes('Browser has disconnected') ||
                            error.message?.includes('Protocol error') ||
                            error.message?.includes('Connection lost');

    if (isPuppeteerError) {
      console.log('🔌 Detectada desconexão abrupta do dispositivo/browser');
      console.log('🛡️ Limpando estado e preparando reinicialização segura...');

      // Limpar estado imediatamente
      isConnected = false;
      connectedNumber = null;
      currentQrCode = null;

      // Aguardar um pouco antes de tentar destruir (evitar conflitos)
      setTimeout(async () => {
        try {
          // Tentar destroy de forma segura
          if (client && typeof client.destroy === 'function') {
            await client.destroy();
            console.log('✅ Cliente destruído com segurança');
          }
        } catch (destroyError) {
          console.warn('⚠️ Erro ao destruir cliente (pode ser normal):', destroyError.message);
        }

        // Reinicializar após limpeza completa
        console.log('🔄 Reinicializando cliente após desconexão abrupta...');
        setTimeout(() => {
          try {
            initialize();
            console.log('✅ Cliente reinicializado após desconexão abrupta');
          } catch (initError) {
            console.error('❌ Falha crítica na reinicialização:', initError);
            // Em caso de falha crítica, tentar novamente após mais tempo
            setTimeout(() => initialize(), 10000);
          }
        }, 3000);
      }, 2000);

    } else {
      // Para outros tipos de erro, manter comportamento original
      console.log('🔧 Erro não relacionado a desconexão abrupta, aplicando tratamento padrão');
      try {
        await client.destroy();
        console.log('Cliente destruído, reinicializando...');
        setTimeout(() => initialize(), 5000);
      } catch (destroyError) {
        console.error('Erro ao destruir cliente:', destroyError);
      }
    }
  });

  client.on('message', handleMessage);
}

// Inicializar WhatsApp
async function initialize() {
  try {
    setupEventHandlers();
    await client.initialize();
  } catch (error) {
    console.error('Erro ao inicializar WhatsApp:', error);
    throw error;
  }
}

function getStatus() {
  return {
    isConnected,
    connectedNumber,
    qrCode: currentQrCode
  };
}

async function disconnect() {
  console.log('🔌 Iniciando desconexão do WhatsApp...');
  try {
    console.log('🔌 Iniciando desconexão do WhatsApp...');

    // Verificar se o cliente existe
    if (!client) {
      console.log('⚠️ Cliente não existe, limpando estado...');
      isConnected = false;
      connectedNumber = null;
      currentQrCode = null;
      return true;
    }

    // Tentar logout se estiver conectado
    if (isConnected && client.info) {
      console.log('📤 Fazendo logout...');
      try {
        await client.logout();
        console.log('✅ Logout realizado');
      } catch (logoutError) {
        console.warn('⚠️ Logout falhou, continuando com destroy:', logoutError.message);
      }
    }

    // Destruir cliente
    console.log('💥 Destruindo cliente...');
    try {
      await client.destroy();
      console.log('✅ Cliente destruído');
    } catch (destroyError) {
      console.warn('⚠️ Destroy falhou:', destroyError.message);
      // Propaga se crítico (ex.: destroy é essencial)
      throw destroyError;
    }

    // Limpar cache de autenticação (async pra non-blocking)
    const fs = require('fs').promises;
    const path = require('path');
    const authPath = path.join(__dirname, '..', '.wwebjs_auth');

    try {
      if (await fs.access(authPath).then(() => true).catch(() => false)) {
        console.log('🗑️ Removendo cache de autenticação...');
        await fs.rm(authPath, { recursive: true, force: true });
        console.log('✅ Cache de autenticação removido');
      } else {
        console.log('ℹ️ Cache de autenticação não encontrado');
      }
    } catch (fsError) {
      console.warn('⚠️ Erro ao remover cache:', fsError.message);
    }

    // Limpar estado
    isConnected = false;
    connectedNumber = null;
    currentQrCode = null;

    // Reinicializar cliente para gerar novo QR code
    console.log('🔄 Reinicializando cliente para gerar novo QR...');
    try {
      setTimeout(() => {
        initialize();
        console.log('✅ Cliente reinicializado, novo QR será gerado');
      }, 1000); // Pequeno delay para garantir limpeza completa
    } catch (initError) {
      console.warn('⚠️ Erro ao reinicializar cliente:', initError.message);
    }

    console.log('✅ Desconexão completa realizada');
    return true;
  } catch (error) {
    console.error('❌ Erro geral ao desconectar:', error);

    // Sempre limpa estado, mesmo em erro
    try {
      isConnected = false;
      connectedNumber = null;
      currentQrCode = null;
      console.log('⚠️ Estado limpo apesar do erro');
    } catch (stateError) {
      console.error('❌ Erro crítico ao limpar estado:', stateError);
    }

    return false;
  }
}

module.exports = {
  initialize,
  client,
  getStatus,
  disconnect,
};