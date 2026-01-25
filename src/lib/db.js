// Database configuration and connection management for the allergen assistant app.
// Provides a cached MySQL connection pool and helper functions to safely execute queries.
// Handles environment variable validation and connection lifecycle in both development and production.
'use strict';

import 'server-only';
import mysql from 'mysql2/promise';

let cachedPool;

// Build and validate the MySQL configuration from environment variables.
const getConfig = () => {
  const {
    MYSQL_HOST,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
    MYSQL_PORT,
    MYSQL_CONNECTION_LIMIT,
  } = process.env;

  const missing = [
    ['MYSQL_HOST', MYSQL_HOST],
    ['MYSQL_USER', MYSQL_USER],
    ['MYSQL_PASSWORD', MYSQL_PASSWORD],
    ['MYSQL_DATABASE', MYSQL_DATABASE],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Error(
      `Missing required MySQL environment variables: ${missing
        .map(([key]) => key)
        .join(', ')}`
    );
  }

  const connectionLimit = Number.parseInt(MYSQL_CONNECTION_LIMIT ?? '10', 10);

  return {
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    port: MYSQL_PORT ? Number.parseInt(MYSQL_PORT, 10) : undefined,
    waitForConnections: true,
    connectionLimit: Number.isNaN(connectionLimit) ? 10 : connectionLimit,
  };
};

// Return a cached MySQL connection pool, creating it if necessary.
export function getDbPool() {
  if (cachedPool) {
    return cachedPool;
  }

  const globalForMysql = globalThis;

  if (globalForMysql.__mysqlPool) {
    cachedPool = globalForMysql.__mysqlPool;
    return cachedPool;
  }

  const config = getConfig();
  cachedPool = mysql.createPool(config);

  if (process.env.NODE_ENV !== 'production') {
    globalForMysql.__mysqlPool = cachedPool;
  }

  return cachedPool;
}

// Execute a callback with a database connection, ensuring the connection is released.
export async function withConnection(callback) {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}
