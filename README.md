# Bot WhatsApp Novembro Rosa

Este é um projeto de POC (Proof of Concept) para um bot WhatsApp não oficial que utiliza IA para fornecer orientações éticas sobre conscientização do câncer de mama durante a campanha Novembro Rosa. O bot age como um profissional de saúde, respondendo dúvidas sobre prevenção, sintomas e autoexame, sempre com o disclaimer de consultar um médico para diagnóstico.

## Objetivo

Criar um bot simples e eficaz para campanhas de baixo volume, focando em simplicidade, ética e estratégias anti-ban para 2025.

## Stack Tecnológica

- **Node.js** (v20+)
- **Express.js** para servidor HTTP simples
- **whatsapp-web.js** (v1.23+) para integração WhatsApp
- **OpenAI SDK** (v4+) com GPT-4o-mini para chat, Whisper para STT, Vision para análise de imagens, TTS para áudio
- **Postgres** via 'pg' lib para armazenamento de conversas
- **dotenv** para variáveis de ambiente

## Funcionalidades

- Recebe mensagens de texto, áudio e imagens
- Processa áudio com Whisper (transcrição)
- Analisa imagens com Vision (contexto de saúde mamária, sem diagnóstico)
- Responde com texto e áudio TTS (voz 'alloy')
- Armazena histórico de conversa (últimas 5 mensagens por usuário)
- Consentimento obrigatório na primeira mensagem
- Rate limiting: máximo 5 mensagens/hora por usuário
- Anti-ban: delays aleatórios, horários comerciais, mensagens personalizadas

## Setup Local

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Copie `.env.example` para `.env` e preencha as variáveis
4. Execute: `node index.js`
5. Escaneie o QR code no terminal para autenticar o WhatsApp

## Deploy no Render

1. Crie um repositório no GitHub
2. No Render Dashboard:
   - New > Web Service
   - Conecte o repo GitHub
   - Build Command: `npm install`
   - Start Command: `node index.js`
3. Configure as variáveis de ambiente:
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (use INTERNAL_DB_URL do Postgres)
4. Crie um banco Postgres no Render (New > Postgres > Free)
5. Configure health check: endpoint `/health` com UptimeRobot

## Estrutura de Arquivos

- `index.js`: Código principal do bot
- `package.json`: Dependências e scripts
- `.env.example`: Template de variáveis
- `.gitignore`: Arquivos ignorados
- `render.yaml`: Configuração de deploy (opcional)

## Troubleshooting

- **Ban do WhatsApp**: Troque o número, faça warm-up manual
- **Erro de DB**: Verifique logs do Render, conexão Postgres
- **QR Code não aparece**: Reinicie o processo, verifique internet

## Disclaimer

Este bot não substitui consulta médica. Sempre consulte um profissional de saúde para diagnóstico e tratamento.