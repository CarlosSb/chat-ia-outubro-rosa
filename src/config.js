// Configurações do bot
require('dotenv').config();

module.exports = {
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    whisperModel: 'whisper-1',
    ttsVoice: process.env.TTS_VOICE || 'alloy',
    maxTokens: 500,
    temperature: 0.7,
  },

  // WhatsApp
  whatsapp: {
    puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  },

  // Database
  database: {
    connectionString: process.env.DATABASE_URL,
  },

  // Server
  server: {
    port: process.env.PORT || 3000,
  },

  // Rate limiting
  rateLimit: {
    maxMessagesPerHour: 20,
  },

  // Anti-ban
  antiBan: {
    minDelay: 2000, // 2s
    maxDelay: 5000, // 5s
    businessHoursStart: 9, // 9h BR
    businessHoursEnd: 18, // 18h BR
    timezoneOffset: -3, // UTC-3
  },

  // Conversation
  conversation: {
    maxHistoryMessages: 5,
  },

  // Prompts importados do módulo prompts.js
  prompts: require('./prompts'),
};