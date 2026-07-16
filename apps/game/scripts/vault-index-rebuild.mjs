#!/usr/bin/env node
// Operator rebuild: project every vault DAG entry atom into vault_index.
// Envs: DATABASE_URL (+VAULT_INDEX_DATABASE_URL), TESTNET_API,
// VAULT_SERVICE_TOKEN, VAULT_INDEX_EMBEDDER (local|off).
// Uses the compiled TS via tsx-free dynamic import of the Next.js-transpiled
// sources is NOT available in plain node — so this script re-implements the
// thin loop against the same chain wire contract. Kept in lockstep with
// src/services/vaultIndex/rebuild.ts by the Task-15 unit tests on
// entryItemToInput (any contract drift fails there first).
import pg from 'pg';

const api = process.env.TESTNET_API ?? 'http://localhost:8080';
const svc = process.env.VAULT_SERVICE_TOKEN;
const dbUrl = process.env.VAULT_INDEX_DATABASE_URL ?? process.env.DATABASE_URL;
if (!svc || !dbUrl) { console.error('need VAULT_SERVICE_TOKEN and DATABASE_URL'); process.exit(1); }

const KINDS = ['haiku_ncp', 'agent_intro', 'agent_note'];
const VIS = ['public', 'network'];
const pool = new pg.Pool({ connectionString: dbUrl });
const excerpt = (body) => {
  const buf = Buffer.from(body, 'utf8');
  return buf.length <= 1024 ? body : buf.subarray(0, 1024).toString('utf8').replace(/�+$/u, '');
};

let offset = 0, projected = 0, skipped = 0;
for (;;) {
  const res = await fetch(`${api}/api/vault/entries?offset=${offset}&limit=200`,
    { headers: { 'X-Service-Token': svc } });
  if (!res.ok) { console.error(`chain listing → ${res.status}`); process.exit(1); }
  const page = await res.json();
  for (const item of page.entries) {
    const e = item.entry;
    if (!e || e.v !== 1 || !KINDS.includes(e.kind) || !VIS.includes(e.visibility)) { skipped++; continue; }
    await pool.query(
      `INSERT INTO vault_index.entries
         (cid, owner_hex, author, kind, visibility, origin, body, excerpt,
          embed_model_id, meta, vault_root, shard_id, created_block)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,$10,$11,$12)
       ON CONFLICT (cid) DO UPDATE SET body=EXCLUDED.body, excerpt=EXCLUDED.excerpt, meta=EXCLUDED.meta`,
      [item.cid, e.owner_hex, e.author, e.kind, e.visibility, e.origin,
       e.text, excerpt(e.text), JSON.stringify(e.meta ?? {}), item.vault_root, item.shard_id, e.created_block]);
    projected++;
  }
  offset += 200;
  if (offset >= page.total || page.entries.length === 0) break;
}
await pool.end();
console.log(JSON.stringify({ projected, skipped, note: 'embeddings backfill lazily via drain/re-embed (embed_model_id=NULL rows)' }));
