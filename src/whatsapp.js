// Gerenciamento do WhatsApp client
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const db = require('./database');
const openai = require('./openai');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: config.whatsapp.puppeteerArgs,
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
async function sendResponse(message, text, audioBuffer = null) {
  try {
    const delay = getRandomDelay();
    await new Promise(resolve => setTimeout(resolve, delay));

    await message.reply(text);

    if (audioBuffer) {
      // Usar fromBuffer em vez de fromFilePath para evitar erro de path null
      const audioMedia = MessageMedia.fromBuffer(audioBuffer, 'audio/ogg');
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
    if (!isBusinessHours()) {
      console.log(config.prompts.status.businessHoursIgnored);
      return;
    }

    const userId = message.from;

    // Verificar consentimento
    const hasConsent = await db.getUserConsent(userId);
    if (!hasConsent) {
      if (message.body.toUpperCase() === 'SIM') {
        await db.saveMessage(userId, 'consent', 'SIM');
        await message.reply(config.prompts.consent.granted);
        return;
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

    // Enviar resposta
    await sendResponse(message, responseText, audioBuffer);

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
  client.on('qr', (qr) => {
    console.log(config.prompts.status.qrGenerated);
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log(config.prompts.status.whatsappReady);
  });

  client.on('message', handleMessage);
}

// Inicializar WhatsApp
async function initialize() {
  setupEventHandlers();
  await client.initialize();
}

module.exports = {
  initialize,
  client,
};