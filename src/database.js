// Gerenciamento do banco de dados Postgres
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.database.connectionString,
});

// Criar tabela se não existir
async function createTableIfNotExists() {
  try {
    // Primeiro, criar tabela sem a coluna consented se ela não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        message_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        response TEXT,
        consented BOOLEAN DEFAULT FALSE
      );
    `);

    // Adicionar coluna consented se ela não existir
    await pool.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS consented BOOLEAN DEFAULT FALSE;
    `);

    console.log(config.prompts.status.tableCreated);
  } catch (error) {
    console.error(config.prompts.logErrors.tableCreation, error);
    throw error;
  }
}

// Verificar consentimento do usuárioconsented
async function getUserConsent(userId) {
  try {
    const result = await pool.query(
      'SELECT consented FROM conversations WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].consented : false;
  } catch (error) {
    console.error(config.prompts.logErrors.consentCheck, error);
    return false;
  }
}

// Verificar rate limit
async function checkRateLimit(userId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM conversations WHERE user_id = $1 AND timestamp > NOW() - INTERVAL \'1 hour\'',
      [userId]
    );
    return parseInt(result.rows[0].count) < config.rateLimit.maxMessagesPerHour;
  } catch (error) {
    console.error(config.prompts.logErrors.rateLimitCheck, error);
    return false;
  }
}

// Obter histórico de conversa
async function getConversationHistory(userId) {
  try {
    const result = await pool.query(
      'SELECT content, response FROM conversations WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, config.conversation.maxHistoryMessages]
    );
    return result.rows.reverse(); // Ordem cronológica
  } catch (error) {
    console.error(config.prompts.logErrors.historyRetrieval, error);
    return [];
  }
}

// Atualizar consentimento do usuário
async function updateConsent(userId, consented) {
  try {
    // Primeiro tenta fazer UPDATE
    const updateResult = await pool.query(
      'UPDATE conversations SET consented = $1 WHERE user_id = $2',
      [consented, userId]
    );

    // Se nenhuma linha foi afetada, significa que o usuário não existe na tabela
    // Então fazemos INSERT com consented = true
    if (updateResult.rowCount === 0) {
      await pool.query(
        'INSERT INTO conversations (user_id, consented) VALUES ($1, $2)',
        [userId, consented]
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar consentimento:', error);
  }
}

// Salvar mensagem
async function saveMessage(userId, messageType, content, response = null) {
  try {
    // Primeiro, obter o valor atual de consented para este usuário
    const currentConsent = await pool.query(
      'SELECT consented FROM conversations WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [userId]
    );

    const consentedValue = currentConsent.rows.length > 0 ? currentConsent.rows[0].consented : false;

    // Inserir mensagem preservando o valor de consented
    await pool.query(
      'INSERT INTO conversations (user_id, message_type, content, response, consented) VALUES ($1, $2, $3, $4, $5)',
      [userId, messageType, content, response, consentedValue]
    );
  } catch (error) {
    console.error(config.prompts.logErrors.messageSave, error);
  }
}

// Fechar conexão
async function closeConnection() {
  await pool.end();
}

module.exports = {
  createTableIfNotExists,
  getUserConsent,
  updateConsent,
  checkRateLimit,
  getConversationHistory,
  saveMessage,
  closeConnection,
};