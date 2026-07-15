// Dedicated pg.Pool for the vault_index schema. Deliberately NOT the Prisma
// client: the bounded context speaks raw SQL only, so extraction (design §7
// A3) carries zero ORM baggage. globalThis-cached like lib/prisma.ts.
import pg from 'pg';

const globalForVault = globalThis as unknown as { vaultIndexPool?: pg.Pool };

export function getVaultPool(): pg.Pool {
  if (!globalForVault.vaultIndexPool) {
    const url = process.env.VAULT_INDEX_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error('vault_index: DATABASE_URL not set');
    globalForVault.vaultIndexPool = new pg.Pool({ connectionString: url, max: 5 });
  }
  return globalForVault.vaultIndexPool;
}
