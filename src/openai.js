// Serviços OpenAI (Chat, Whisper, Vision, TTS)
const { OpenAI } = require('openai');
const fs = require('fs');
const tmp = require('tmp');
const config = require('./config');
const { getDynamicPrompt } = require('./prompts');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Detectar contexto da mensagem
function detectMessageContext(messageBody) {
  const text = messageBody.toLowerCase();

  // Palavras de agradecimento
  const agradecimentos = ['obrigado', 'obrigada', 'agradeço', 'valeu', 'muito obrigado', 'muito obrigada', 'thanks', 'thank you'];
  if (agradecimentos.some(palavra => text.includes(palavra))) {
    return 'agradecimento';
  }

  return 'geral';
}

// Processar mensagem de texto
async function processTextMessage(message, history) {
  try {
    // Detectar contexto da mensagem
    const context = detectMessageContext(message.body);

    // Usar prompt dinâmico baseado no contexto
    const dynamicPrompt = getDynamicPrompt(context);

    // Construir contexto completo
    let fullContext = dynamicPrompt + '\n\nHistórico da conversa:\n';
    history.forEach(item => {
      fullContext += `Usuário: ${item.content}\n`;
      if (item.response) fullContext += `Bot: ${item.response}\n`;
    });
    fullContext += `Usuário: ${message.body}\nBot:`;

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: fullContext }],
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
  let tempFile = null;
  try {
    // Verificar se media existe e tem dados
    if (!media || !media.data) {
      throw new Error('Media ou dados não disponíveis');
    }

    // Criar arquivo temporário
    tempFile = tmp.fileSync({ postfix: '.ogg' });

    // Salvar dados base64 como arquivo
    const buffer = Buffer.from(media.data, 'base64');
    fs.writeFileSync(tempFile.name, buffer);

    // Criar stream para OpenAI
    const audioStream = fs.createReadStream(tempFile.name);

    // Transcrever com Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: config.openai.whisperModel,
      language: 'pt',
    });

    return transcription.text;
  } catch (error) {
    console.error(config.prompts.logErrors.audioTranscription, error);
    throw error;
  } finally {
    // Limpar arquivo temporário
    if (tempFile) {
      try {
        fs.unlinkSync(tempFile.name);
      } catch (cleanupError) {
        console.warn('Erro ao limpar arquivo temporário:', cleanupError);
      }
    }
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
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: config.openai.ttsVoice,
      input: text,
    });

    return Buffer.from(await speechResponse.arrayBuffer());
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