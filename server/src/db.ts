import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/palatki';

export const sql = postgres(DATABASE_URL);

// Export db alias for compatibility during migration
export const db = sql;

export async function initSchema() {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    // sql.unsafe executes raw SQL string directly, allowing multiple queries
    await sql.unsafe(schema);
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  }
}
