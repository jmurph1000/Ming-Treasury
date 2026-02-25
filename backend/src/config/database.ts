import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger.js';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

/**
 * Execute a query with automatic connection handling
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.substring(0, 100), duration, rowCount: result.rowCount });
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (error) {
    logger.error('Query error', { text: text.substring(0, 100), error: (error as Error).message });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient() {
  const client = await pool.connect();
  const release = client.release.bind(client);

  // Set timeout for the client
  const timeout = setTimeout(() => {
    logger.error('Client has been checked out for too long');
  }, 30000);

  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: Awaited<ReturnType<typeof pool.connect>>) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set session variables for audit logging
 */
export async function setSessionContext(
  client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  userId?: string,
  userEmail?: string,
  clientIp?: string,
  sessionId?: string
): Promise<void> {
  if (userId) {
    await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
  }
  if (userEmail) {
    await client.query(`SET LOCAL app.current_user_email = '${userEmail}'`);
  }
  if (clientIp) {
    await client.query(`SET LOCAL app.client_ip = '${clientIp}'`);
  }
  if (sessionId) {
    await client.query(`SET LOCAL app.session_id = '${sessionId}'`);
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Graceful shutdown
 */
export async function shutdown(): Promise<void> {
  logger.info('Closing database pool...');
  await pool.end();
  logger.info('Database pool closed');
}
