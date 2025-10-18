# Plano Detalhado para Arquivos de Código - Bot WhatsApp Outubro Rosa

Este documento detalha o plano para criação dos arquivos de código restantes, que devem ser implementados em um modo que permita edição de arquivos não-.md (ex.: Code mode).

## 1. package.json

Atualizar com dependências e scripts:

```json
{
  "name": "novembro-rosa",
  "version": "1.0.0",
  "description": "Bot WhatsApp POC para campanha Outubro Rosa com IA",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "keywords": ["whatsapp", "bot", "ia", "novembro-rosa", "saude"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^5.1.0",
    "whatsapp-web.js": "^1.23.0",
    "openai": "^4.0.0",
    "pg": "^8.11.0",
    "dotenv": "^16.3.0",
    "qrcode-terminal": "^0.12.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 2. index.js

Arquivo principal com ~300 linhas de código:

### Imports e Setup Inicial
- require express, whatsapp-web.js, openai, pg, dotenv, qrcode-terminal
- dotenv.config()
- const app = express()
- const port = process.env.PORT || 3000

### Configuração OpenAI
- const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

### Configuração Postgres
- const pool = new Pool({ connectionString: process.env.DATABASE_URL })
- Função para criar tabela conversations se não existir
- Função para testar conexão DB

### Configuração WhatsApp Client
- const client = new Client({ authStrategy: new LocalAuth() })
- Eventos: qr, ready, message

### Lógica do Bot

#### Função getUserConsent(userId)
- Verifica se usuário deu consentimento (SIM)

#### Função checkRateLimit(userId)
- Conta mensagens na última hora (max 5)

#### Função getConversationHistory(userId)
- Busca últimas 5 mensagens do usuário

#### Função processTextMessage(message)
- Chama OpenAI com prompt system + histórico + mensagem

#### Função processAudioMessage(message)
- Baixa áudio, transcreve com Whisper, processa como texto

#### Função processImageMessage(message)
- Baixa imagem, analisa com Vision, descreve no contexto saúde

#### Função generateTTS(text)
- Gera áudio com TTS 'alloy'

#### Função sendResponse(message, text, audioBuffer)
- Envia texto via reply, áudio se existir
- Salva resposta no DB
- Delay aleatório 2-5s

#### Event Handler message
- Verifica horário comercial (9h-18h BR)
- Se primeira msg, pede consentimento
- Se não consentiu, bloqueia
- Check rate limit
- Processa tipo de mensagem (texto/áudio/imagem)
- Trata erros (ex.: "Desculpe, não entendi. Tente texto simples.")

### Servidor Express
- app.get('/health', (req, res) => res.send('OK'))
- app.listen(port, () => console.log(`Bot rodando na porta ${port}`))

### Inicialização
- client.initialize()
- Teste DB connection

## 3. .env.example

```
# Template de variáveis de ambiente
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
```

## 4. .gitignore (atualização)

Adicionar ao .gitignore existente:
```
# WhatsApp auth
.wwebjs_auth/
.wwebjs_cache/

# Environment
.env
.env.local

# Logs
logs/
*.log

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
```

## 5. render.yaml (opcional)

```
services:
  - type: web
    name: bot-novembro-rosa
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: bot-novembro-db
          property: connectionString
      - key: PORT
        value: 10000
    healthCheckPath: /health
```

## Estratégias Anti-Ban Implementadas

- Rate limiting por usuário (5/hora)
- Delays aleatórios entre respostas (2-5s)
- Horários comerciais apenas (9h-18h BR)
- Mensagens personalizadas (usa nome do contato)
- Limite áudio/imagem (1/min)
- Monitoramento de erros para detectar ban
- Warm-up manual recomendado
- Não usa broadcast/grupos

## Fluxo de Mensagem

1. Recebe mensagem
2. Verifica horário
3. Check consentimento
4. Check rate limit
5. Identifica tipo (texto/áudio/imagem)
6. Processa com IA apropriada
7. Gera resposta texto + TTS
8. Salva no DB
9. Envia com delay
10. Log para monitoramento

## Error Handling

- Try-catch em todas funções async
- Logs detalhados para debugging
- Respostas padrão para mensagens inválidas
- Graceful shutdown se DB falha
- Monitoramento de erros WhatsApp

Este plano cobre todos os requisitos técnicos, focando em simplicidade, ética e anti-ban para 2025.