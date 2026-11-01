const { Pool } = require('pg');
const config = require('./index');

let pool = null;

/**
 * Determine if SSL should be enabled for the connection string.
 * Supabase and most cloud-hosted Postgres providers require SSL with rejectUnauthorized: false.
 */
function shouldEnableSSL(connectionString) {
  if (!connectionString) return false;
  const lower = connectionString.toLowerCase();
  
  // Localhost connections typically do not use SSL
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
    return false;
  }
  
  // Supabase, AWS, Neon, Heroku, etc. require SSL
  return true;
}

/**
 * Initialize or retrieve the PostgreSQL connection pool.
 */
function getPool() {
  const databaseUrl = (process.env.DATABASE_URL || config.DATABASE_URL || '').trim();

  if (!databaseUrl) {
    return null;
  }

  if (pool) {
    return pool;
  }

  const useSSL = shouldEnableSSL(databaseUrl);

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 6000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err.message);
  });

  return pool;
}

/**
 * Execute a query with parameters using the connection pool.
 * @param {string} text - SQL statement
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const activePool = getPool();
  if (!activePool) {
    throw new Error('DATABASE_URL is not configured in backend/.env. Please enter your Supabase connection string.');
  }
  return activePool.query(text, params);
}

/**
 * Test the database connection by executing SELECT NOW().
 * @returns {Promise<{ success: boolean, timestamp: string, database: string, latencyMs: number, version: string }>}
 */
async function testConnection() {
  const activePool = getPool();
  if (!activePool) {
    return {
      success: false,
      error: 'DATABASE_URL is not configured in backend/.env'
    };
  }

  const startTime = Date.now();
  try {
    const res = await activePool.query('SELECT NOW() as now, current_database() as database, version() as version');
    const latencyMs = Date.now() - startTime;
    const row = res.rows[0];

    return {
      success: true,
      timestamp: row.now,
      database: row.database,
      version: row.version,
      latencyMs
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Check if the database URL has been configured.
 */
function isConfigured() {
  const databaseUrl = (process.env.DATABASE_URL || config.DATABASE_URL || '').trim();
  return Boolean(databaseUrl);
}

module.exports = {
  getPool,
  query,
  testConnection,
  isConfigured
};
