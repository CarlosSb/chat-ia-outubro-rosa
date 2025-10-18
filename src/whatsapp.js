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
    console.log(config.prompts.status.qrGenerated);
    qrcode.generate(qr, { small: true });
    currentQrCode = await qrCodeLib.toDataURL(qr);
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

  client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
    isConnected = false;
    connectedNumber = null;
    currentQrCode = null;
    console.log('Reconectando...');
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
    // Auto-restart em caso de erro crítico
    try {
      await client.destroy();
      console.log('Cliente destruído, reinicializando...');
      setTimeout(() => initialize(), 5000); // Reinicializar após 5 segundos
    } catch (destroyError) {
      console.error('Erro ao destruir cliente:', destroyError);
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
  try {
    if (client && client.info) {
      await client.logout();
    }
    await client.destroy();
    isConnected = false;
    connectedNumber = null;
    currentQrCode = null;
    return true;
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    return false;
  }
}

module.exports = {
  initialize,
  client,
  getStatus,
  disconnect,
};