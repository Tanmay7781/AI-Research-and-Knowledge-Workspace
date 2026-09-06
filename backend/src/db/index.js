const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Ensure root .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to local .env if present

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ai_knowledge_workspace',
      user: process.env.DB_USER || undefined,
      password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute parameterized query
 * @param {string} text 
 * @param {Array} params 
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Executed query (${duration}ms):`, { text: text.trim().substring(0, 80), rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('PostgreSQL query error:', {
      message: error.message,
      detail: error.detail,
      query: text.trim().substring(0, 100)
    });
    throw error;
  }
}

/**
 * Checks connection to PostgreSQL and verifies expected tables.
 * Does NOT reset or drop any tables.
 */
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT current_database(), current_user, version()');
      const dbInfo = res.rows[0];
      console.log(`Connected to PostgreSQL: database="${dbInfo.current_database}", user="${dbInfo.current_user}"`);

      // Verify table existence without modifying
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('users', 'workspaces', 'documents', 'document_analyses');
      `);
      const existingTables = tableCheck.rows.map(r => r.table_name);
      console.log('Detected database tables:', existingTables.join(', ') || 'None found yet');

      return {
        connected: true,
        database: dbInfo.current_database,
        tables: existingTables
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('PostgreSQL connection check notice:', error.message);
    return {
      connected: false,
      error: error.message
    };
  }
}

module.exports = {
  pool,
  query,
  checkDatabaseConnection
};
