// Lazy process-wide singletons for the MCP surface. globalThis-cached (house
// lib/prisma.ts pattern) — one pool, one embedder, one rate window per
// instance. Quota params + audit summary are chain-read with a short cache
// so a founder retune (server restart) propagates within a minute.
import { getVaultPool } from './db';
import { PostgresKnowledgeIndex } from './knowledgeIndex';
import { createEmbedderFromEnv } from './embedder';
import { PostgresOutbox } from './outbox';
import { RateWindow, type VaultQuotaParams } from './quota';
import { getAuditSummary as chainAuditSummary } from './chainVault';
import type { McpDeps } from './mcpTools';

const apiBase = () => process.env.TESTNET_API ?? 'http://localhost:8080';
const CACHE_MS = 30_000;

const globalForRuntime = globalThis as unknown as { vaultMcpDeps?: Promise<McpDeps> };

async function build(): Promise<McpDeps> {
  const pool = getVaultPool();
  const embedder = await createEmbedderFromEnv();
  let paramsCache: { at: number; value: VaultQuotaParams } | null = null;
  let auditCache: { at: number; value: Awaited<ReturnType<typeof chainAuditSummary>> } | null = null;
  return {
    index: new PostgresKnowledgeIndex(pool),
    embedder,
    outbox: new PostgresOutbox(pool),
    rateWindow: new RateWindow(),
    async getQuotaParams() {
      if (paramsCache && Date.now() - paramsCache.at < CACHE_MS) return paramsCache.value;
      const res = await fetch(`${apiBase()}/api/params`);
      if (!res.ok) throw new Error(`chain /api/params → ${res.status}`);
      const value = (await res.json()).vault as VaultQuotaParams;
      paramsCache = { at: Date.now(), value };
      return value;
    },
    async getAuditSummary() {
      if (auditCache && Date.now() - auditCache.at < CACHE_MS) return auditCache.value;
      const value = await chainAuditSummary();
      auditCache = { at: Date.now(), value };
      return value;
    },
  };
}

export function getMcpDeps(): Promise<McpDeps> {
  if (!globalForRuntime.vaultMcpDeps) globalForRuntime.vaultMcpDeps = build();
  return globalForRuntime.vaultMcpDeps;
}
