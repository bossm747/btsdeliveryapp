import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool limits to prevent resource exhaustion
  max: 20,                        // Maximum number of connections in pool
  min: 2,                         // Minimum connections to maintain
  idleTimeoutMillis: 30000,       // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Fail connection attempts after 10 seconds
  // Statement timeout to prevent queries from hanging indefinitely
  statement_timeout: 30000,       // 30 second query timeout
  query_timeout: 30000,           // 30 second query timeout
});

// Log pool errors to prevent silent failures
pool.on('error', (err) => {
  console.error('[Database Pool] Unexpected error on idle client:', err);
});

export const db = drizzle(pool, { schema });