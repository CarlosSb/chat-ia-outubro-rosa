// Prompts e mensagens do sistema para IA generativa
const prompts = {
  // Prompt principal do sistema
  systemPrompt: `Você é um profissional de saúde empático para Novembro Rosa. Responda orientações sobre câncer de mama (prevenção, exames, mitos). Seja ético, sugira consulta médica. Mantenha conversas curtas e acessíveis. Idioma: Português BR. Sempre termine com: "Consulte um médico para diagnóstico."`,

  // Prompt para análise de imagens
  imageAnalysisPrompt: 'Descreva esta imagem no contexto de saúde mamária, sem fazer diagnóstico médico. Seja breve e ético.',

  // Mensagens de consentimento
  consent: {
    request: 'Oi! Sou bot da campanha Novembro Rosa. Autorizo uso para dúvidas de saúde? Digite "SIM" para continuar ou "SAIR" para parar.',
    granted: 'Obrigado! Agora você pode fazer perguntas sobre saúde mamária. Como posso ajudar?',
  },

  // Mensagens de erro e limite
  errors: {
    rateLimit: 'Você atingiu o limite de 5 mensagens por hora. Tente novamente mais tarde.',
    invalidMessage: 'Desculpe, não entendi. Tente texto simples.',
    processingError: 'Desculpe, ocorreu um erro. Tente novamente mais tarde.',
    audioDownloadError: 'Não foi possível baixar o áudio.',
    audioProcessingError: 'Desculpe, não consegui processar o áudio.',
    imageDownloadError: 'Não foi possível baixar a imagem.',
    imageAnalysisError: 'Desculpe, não consegui analisar a imagem.',
  },

  // Mensagens de status
  status: {
    initializing: '🚀 Iniciando Bot WhatsApp Novembro Rosa...',
    serverRunning: '🌐 Servidor rodando na porta',
    whatsappReady: '✅ Bot WhatsApp pronto!',
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
};

module.exports = prompts;