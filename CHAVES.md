# Como Obter as Chaves de API

Este documento explica como obter as chaves necessárias para o funcionamento do bot: OpenAI API Key e configuração do Postgres no Render.

## OpenAI API Key (2025)

1. Acesse [platform.openai.com/signup](https://platform.openai.com/signup) e crie uma conta gratuita (inclui $5 de crédito inicial).
2. Faça login na plataforma.
3. Vá para [API Keys](https://platform.openai.com/api-keys).
4. Clique em "Create new secret key".
5. Copie a chave gerada e guarde em local seguro (não commite no código).
6. Adicione a chave na variável `OPENAI_API_KEY` no arquivo `.env`.

### Best Practices para Segurança:
- Use variáveis de organização se disponível.
- Rotacione chaves periodicamente se suspeitar de vazamento.
- Monitore uso em [platform.openai.com/usage](https://platform.openai.com/usage).

## Postgres no Render

1. Acesse o [Render Dashboard](https://dashboard.render.com).
2. Clique em "New > Postgres".
3. Selecione o plano "Free".
4. Dê um nome ao banco, ex.: `bot-novembro-db`.
5. Crie o banco.
6. Na aba "Connections", copie a `INTERNAL_DB_URL`.
7. Adicione essa URL na variável `DATABASE_URL` no arquivo `.env`.

### Configuração no Código:
O código usa a lib 'pg' para conectar via pool. Teste a conexão no startup do app.

## Variáveis de Ambiente

Arquivo `.env`:
```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

Copie de `.env.example` para começar.