// Prompts e mensagens do sistema para IA generativa
// Melhorados para maior naturalidade e variações contextuais

// Prompt base do sistema - conciso e ético
const systemPrompt = `Você é um profissional de saúde empático para campanha Outubro Rosa. Responda dúvidas sobre câncer de mama (prevenção, sintomas, autoexame) de forma natural, humana e curta (80-120 palavras max). Use listas curtas para orientações. Tom: Acolhedor, use 😊 ou 💕 ocasionalmente. Idioma: Português BR. Varie respostas – evite repetições ou perguntas que soem como consentimento (ex.: não pergunte "Quer continuar?" se já consentido). Disclaimer médico só no fim de respostas completas ou transições. Se user agradece, responda leve ("De nada! Fico feliz em ajudar. 😊") sem forçar mais info.`;

// Função para obter prompt dinâmico baseado no contexto
function getDynamicPrompt(context = 'geral') {
  const basePrompt = systemPrompt;

  if (context === 'agradecimento') {
    return `${basePrompt} Para agradecimentos, responda de forma leve e acolhedora, sem frases repetitivas. Exemplo: "De nada! Fico feliz em ajudar. 😊"`;
  }

  return `${basePrompt} Varie respostas como humano: curtas, empáticas, com perguntas abertas e emojis leves. Use frase sobre consulta médica apenas em transições ou fim de tópico, não em toda resposta.`;
}

// Prompts e mensagens organizados
const prompts = {
  // Prompt para análise de imagens
  imageAnalysisPrompt: 'Descreva esta imagem no contexto de saúde mamária, sem fazer diagnóstico médico. Seja breve e ético.',

  // Mensagens de consentimento
  consent: {
    request: 'Oi! 👋 Sou a assistente da campanha Outubro Rosa. Posso te ajudar com dúvidas sobre saúde mamária? Digite "SIM" para continuar ou "SAIR" para parar.',
    granted: 'Perfeito! 💕 Agora podemos conversar sobre prevenção, exames e cuidados. O que você gostaria de saber?',
  },

  // Mensagens de erro e limite
  errors: {
    rateLimit: 'Ops, você atingiu o limite de mensagens por hora. Vamos conversar mais tarde? 😊',
    invalidMessage: 'Hmm, não entendi bem. Pode tentar com uma mensagem mais simples?',
    processingError: 'Desculpe, deu um probleminha técnico. Pode tentar novamente?',
    audioDownloadError: 'Não consegui baixar o áudio. Pode tentar enviar novamente?',
    audioProcessingError: 'Tive dificuldade para entender o áudio. Pode repetir por texto?',
    imageDownloadError: 'Não foi possível baixar a imagem. Tenta enviar de novo?',
    imageAnalysisError: 'Desculpe, não consegui analisar bem a imagem. 😔',
  },

  // Mensagens de status
  status: {
    initializing: '🚀 Iniciando Bot WhatsApp Outubro Rosa...',
    serverRunning: '🌐 Servidor rodando na porta',
    whatsappReady: '✅ Bot WhatsApp pronto e conectado!',
    tableCreated: '✅ Tabela conversations criada/verificada',
    qrGenerated: '📱 QR Code gerado. Escaneie com WhatsApp:',
    businessHoursIgnored: '📅 Mensagem fora do horário comercial, ignorada',
    shuttingDown: '🛑 Encerrando bot...',
    devTip: '💡 Use "npm run dev" para desenvolvimento com nodemon',
  },

  // Logs de erro
  logErrors: {
    tableCreation: '❌ Erro ao criar tabela:',
    consentCheck: '❌ Erro ao verificar consentimento:',
    rateLimitCheck: '❌ Erro ao verificar rate limit:',
    historyRetrieval: '❌ Erro ao obter histórico:',
    messageSave: '❌ Erro ao salvar mensagem:',
    textProcessing: '❌ Erro ao processar texto:',
    audioTranscription: '❌ Erro ao transcrever áudio:',
    imageAnalysis: '❌ Erro ao analisar imagem:',
    ttsGeneration: '❌ Erro ao gerar TTS:',
    responseSend: '❌ Erro ao enviar resposta:',
    messageHandler: '❌ Erro no handler de mensagem:',
    initialization: '❌ Erro na inicialização:',
  },

  // Exemplos de respostas contextuais para diferentes situações
  contextualResponses: {
    agradecimento: [
      'De nada! Fico feliz em ajudar. 😊',
      'Que bom que pude ajudar! 💕',
      'Disponha sempre! Estou aqui para o que precisar.',
      'Fico feliz em contribuir! 😊',
    ],
    duvidaGeral: [
      'Ótima pergunta! Vamos esclarecer isso juntos.',
      'Essa é uma dúvida comum. Vou explicar de forma simples.',
      'Muito bom questionar! Vamos entender melhor.',
    ],
    transicaoTopico: [
      'Espero ter ajudado com essas informações. Lembre-se: consulte sempre um médico para diagnóstico profissional. O que mais gostaria de saber?',
      'Essas são as principais orientações. Para avaliação personalizada, procure um profissional de saúde. Tem mais alguma dúvida?',
    ],
  },
};

module.exports = {
  prompts,
  systemPrompt,
  getDynamicPrompt
};