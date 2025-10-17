// Serviços OpenAI (Chat, Whisper, Vision, TTS)
const { OpenAI } = require('openai');
const config = require('./config');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Processar mensagem de texto
async function processTextMessage(message, history) {
  try {
    // Construir contexto
    let context = config.prompts.systemPrompt + '\n\nHistórico da conversa:\n';
    history.forEach(item => {
      context += `Usuário: ${item.content}\n`;
      if (item.response) context += `Bot: ${item.response}\n`;
    });
    context += `Usuário: ${message.body}\nBot:`;

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: context }],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error(config.prompts.logErrors.textProcessing, error);
    return config.prompts.errors.processingError;
  }
}

// Processar áudio (transcrição)
async function processAudioMessage(media) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: Buffer.from(media.data, 'base64'),
      model: config.openai.whisperModel,
      language: 'pt',
    });

    return transcription.text;
  } catch (error) {
    console.error(config.prompts.logErrors.audioTranscription, error);
    throw error;
  }
}

// Processar imagem (análise)
async function processImageMessage(media) {
  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: config.prompts.imageAnalysisPrompt },
            { type: 'image_url', image_url: { url: `data:${media.mimetype};base64,${media.data}` } }
          ]
        }
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content.trim() + '\n\nConsulte um médico para diagnóstico.';
  } catch (error) {
    console.error(config.prompts.logErrors.imageAnalysis, error);
    return config.prompts.errors.imageAnalysisError;
  }
}

// Gerar TTS
async function generateTTS(text) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: config.openai.ttsVoice,
      input: text,
    });

    return Buffer.from(await mp3.arrayBuffer());
  } catch (error) {
    console.error(config.prompts.logErrors.ttsGeneration, error);
    return null;
  }
}

module.exports = {
  processTextMessage,
  processAudioMessage,
  processImageMessage,
  generateTTS,
};