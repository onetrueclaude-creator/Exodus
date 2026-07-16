// @vitest-environment node
// KnowledgeIndex conformance suite — house StorageBackend-suite style: one
// behavior set, every implementation (design §12). The Postgres leg runs when
// VAULT_INDEX_TEST_DB is set (from apps/game: docker compose up -d && npm run vault:migrate):
//   VAULT_INDEX_TEST_DB=postgresql://zkagentic:devpass@localhost:5432/zkagentic
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import pg from 'pg';
import {
  EntryInput, KnowledgeIndex, PrivateContentError, makeExcerpt,
} from '../types';
import { MemoryKnowledgeIndex, PostgresKnowledgeIndex } from '../knowledgeIndex';

const OWNER = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);

function entry(over: Partial<EntryInput> = {}): EntryInput {
  return {
    cid: over.cid ?? 'c'.repeat(64),
    ownerHex: OWNER, author: 'neo', kind: 'agent_note',
    visibility: 'public', origin: 'token_authorized',
    body: 'a packet drifts on the grid', meta: {},
    vaultRoot: 'r'.repeat(64), shardId: 3, createdBlock: 7,
    ...over,
  };
}

const TEST_DB = process.env.VAULT_INDEX_TEST_DB;
const pool = TEST_DB ? new pg.Pool({ connectionString: TEST_DB, max: 2 }) : null;
afterAll(async () => { await pool?.end(); });

type Leg = { name: string; make: () => Promise<KnowledgeIndex> };
const legs: Leg[] = [
  { name: 'memory', make: async () => new MemoryKnowledgeIndex() },
  ...(pool ? [{
    name: 'postgres',
    make: async () => {
      await pool.query("DELETE FROM vault_index.entries");
      return new PostgresKnowledgeIndex(pool);
    },
  }] : []),
];

describe.each(legs)('KnowledgeIndex conformance [$name]', ({ make }) => {
  let idx: KnowledgeIndex;
  beforeEach(async () => { idx = await make(); });

  it('projects then finds by keyword with full hit shape', async () => {
    await idx.project(entry(), null, null);
    const hits = await idx.search(
      { query: 'packet grid', k: 8, kind: 'any', scope: 'all_readable', subOwnerHex: OWNER }, null);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      cid: 'c'.repeat(64), kind: 'agent_note', author: 'neo',
      visibility: 'public', origin: 'token_authorized',
      createdBlock: 7, vaultRoot: 'r'.repeat(64), shardId: 3,
    });
    expect(hits[0].excerpt).toBe('a packet drifts on the grid');
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it('RAISES on private input — the structural rule, not a filter', async () => {
    const poisoned = { ...entry(), visibility: 'private' } as unknown as EntryInput;
    await expect(idx.project(poisoned, null, null)).rejects.toThrow(PrivateContentError);
    const hits = await idx.search(
      { query: 'packet', k: 8, kind: 'any', scope: 'all_readable', subOwnerHex: null }, null);
    expect(hits).toHaveLength(0);           // nothing leaked through
  });

  it('filters by kind and scope (D7: network = all-players shared layer)', async () => {
    await idx.project(entry({ cid: '1'.repeat(64), kind: 'haiku_ncp', body: 'lattice haiku one' }), null, null);
    await idx.project(entry({ cid: '2'.repeat(64), kind: 'agent_note', visibility: 'network', ownerHex: OTHER, body: 'lattice note two' }), null, null);
    const haiku = await idx.search({ query: 'lattice', k: 8, kind: 'haiku_ncp', scope: 'all_readable', subOwnerHex: OWNER }, null);
    expect(haiku.map(h => h.cid)).toEqual(['1'.repeat(64)]);
    const network = await idx.search({ query: 'lattice', k: 8, kind: 'any', scope: 'network', subOwnerHex: OWNER }, null);
    expect(network.map(h => h.cid)).toEqual(['2'.repeat(64)]);   // OTHER's network entry readable (D7)
    const mine = await idx.search({ query: 'lattice', k: 8, kind: 'any', scope: 'mine', subOwnerHex: OWNER }, null);
    expect(mine.map(h => h.cid)).toEqual(['1'.repeat(64)]);
    const pub = await idx.search({ query: 'lattice', k: 8, kind: 'any', scope: 'public', subOwnerHex: null }, null);
    expect(pub.map(h => h.cid)).toEqual(['1'.repeat(64)]);
  });

  it('tombstoned entries vanish from search and fetch', async () => {
    await idx.project(entry(), null, null);
    await idx.tombstone('c'.repeat(64));
    expect(await idx.search({ query: 'packet', k: 8, kind: 'any', scope: 'all_readable', subOwnerHex: null }, null)).toHaveLength(0);
    expect(await idx.fetch('c'.repeat(64))).toBeNull();
  });

  it('project is an idempotent upsert (outbox retries + rebuild)', async () => {
    await idx.project(entry(), null, null);
    await idx.project(entry({ body: 'a packet drifts on the grid' }), null, null);
    const hits = await idx.search({ query: 'packet', k: 8, kind: 'any', scope: 'all_readable', subOwnerHex: null }, null);
    expect(hits).toHaveLength(1);
  });

  it('caps the excerpt at 1024 bytes', async () => {
    const long = 'x'.repeat(3000);
    await idx.project(entry({ body: long }), null, null);
    const rec = await idx.fetch('c'.repeat(64));
    expect(Buffer.from(rec!.excerpt, 'utf8').length).toBeLessThanOrEqual(1024);
    expect(rec!.body).toBe(long);           // full body kept
  });

  it('counts only token_authorized writes in the window', async () => {
    await idx.project(entry({ cid: '4'.repeat(64), origin: 'token_authorized' }), null, null);
    await idx.project(entry({ cid: '5'.repeat(64), origin: 'wallet_signed' }), null, null);
    await idx.project(entry({ cid: '6'.repeat(64), origin: 'token_authorized', ownerHex: OTHER }), null, null);
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    expect(await idx.countTokenWritesSince(OWNER, since)).toBe(1);
  });

  // --- RRF fusion (plan Revision Log 2026-07-15, vault-audit finding C4) ---
  // The plan's original fusion rule was `score = vscore ?? Math.min(0.5, kscore)`:
  // ANY cosine value — however weak or even negative — wins outright over a
  // keyword score, and a keyword-only hit is hard-capped at 0.5. That rule
  // under-ranks exactly the poetic/haiku vocabulary the design's own §10 risk 1
  // worries embeddings handle badly. This test pins the replacement:
  // Reciprocal Rank Fusion (score = Σ 1/(60+rank_i) over the candidate lists a
  // doc appears in) must let a strong keyword hit with a weak vector outrank a
  // vector-only hit with a merely mediocre cosine.
  it('RRF ranks a strong-keyword/weak-vector hit above a mediocre vector-only hit (pins the C4 fusion fix)', async () => {
    const queryEmbedding = [1, 0];
    // KEY: exact match on both query terms ("packet grid"), but only a WEAK
    // cosine (0.05) against the query embedding.
    await idx.project(
      entry({ cid: '1'.repeat(64), body: 'a packet drifts across the grid tonight' }),
      [0.05, 0.99875], 'test-model');
    // VEC: zero keyword overlap with the query (vector-only candidate), but a
    // MEDIOCRE-GOOD cosine (0.6) — under the old rule this alone scores 0.6,
    // unconditionally beating KEY's bare 0.05.
    await idx.project(
      entry({ cid: '2'.repeat(64), body: 'an unrelated haiku about something else entirely' }),
      [0.6, 0.8], 'test-model');

    const hits = await idx.search(
      { query: 'packet grid', k: 8, kind: 'any', scope: 'all_readable', subOwnerHex: null },
      queryEmbedding);

    // Old rule would rank VEC (0.6) above KEY (0.05) — see report for the
    // reproduced red/green proof. RRF must reverse that: KEY earns rank
    // contributions from BOTH the keyword list (rank 1, VEC has zero keyword
    // overlap so never enters that list) and the vector list (rank 2, behind
    // VEC's stronger cosine), while VEC earns only a single rank-1 vector
    // contribution — KEY's combined score must win.
    expect(hits.map(h => h.cid)).toEqual(['1'.repeat(64), '2'.repeat(64)]);
    expect(hits[0].score).toBeGreaterThan(hits[1].score);
  });
});

describe('makeExcerpt', () => {
  it('never splits a multibyte character', () => {
    const s = '灯'.repeat(600);              // 3 bytes each → 1800 bytes
    const e = makeExcerpt(s);
    expect(Buffer.from(e, 'utf8').length).toBeLessThanOrEqual(1024);
    expect(e).toMatch(/^灯+$/u);             // no replacement chars
  });
});
