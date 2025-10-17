// Gerenciamento do banco de dados Postgres
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.database.connectionString,
});

// Criar tabela se não existir
async function createTableIfNotExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        message_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        response TEXT
      );
    `);
    console.log(config.prompts.status.tableCreated);
  } catch (error) {
    console.error(config.prompts.logErrors.tableCreation, error);
    throw error;
  }
}

// Verificar consentimento do usuário
async function getUserConsent(userId) {
  try {
    const result = await pool.query(
      'SELECT content FROM conversations WHERE user_id = $1 AND message_type = $2 ORDER BY timestamp DESC LIMIT 1',
      [userId, 'consent']
    );
    return result.rows.length > 0 && result.rows[0].content === 'SIM';
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

// Salvar mensagem
async function saveMessage(userId, messageType, content, response = null) {
  try {
    await pool.query(
      'INSERT INTO conversations (user_id, message_type, content, response) VALUES ($1, $2, $3, $4)',
      [userId, messageType, content, response]
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
  checkRateLimit,
  getConversationHistory,
  saveMessage,
  closeConnection,
};