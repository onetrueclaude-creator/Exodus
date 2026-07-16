#!/usr/bin/env node
// vault_index migration runner (S4). 001 is mandatory; 002 (pgvector) is
// best-effort — its failure downgrades retrieval to keyword-only (B1), it
// never blocks the deploy. Idempotent: everything is IF NOT EXISTS.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '..', 'src', 'services', 'vaultIndex', 'migrations');
const url = process.env.VAULT_INDEX_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('vault:migrate: DATABASE_URL (or VAULT_INDEX_DATABASE_URL) not set');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url });
try {
  await pool.query(readFileSync(path.join(dir, '001_schema.sql'), 'utf8'));
  console.log('vault:migrate 001_schema.sql applied');
  try {
    await pool.query(readFileSync(path.join(dir, '002_vector.sql'), 'utf8'));
    console.log('vault:migrate 002_vector.sql applied — pgvector available, hybrid retrieval on');
  } catch (err) {
    console.warn(`vault:migrate 002_vector.sql skipped (${err.message}) — keyword-only retrieval (B1 fallback)`);
  }
} finally {
  await pool.end();
}
