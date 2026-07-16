// @vitest-environment node
// Tool handlers: per-call enforcement (§4.2 — the JWT is a hint; quotas and
// scopes are re-checked server-side per call), §4.1 shapes, §4.4 disclosure.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));
vi.mock('../chainVault', () => ({
  postVaultEntry: postMock,
  ChainWriteError: class ChainWriteError extends Error {
    constructor(public status: number, msg: string) { super(msg); }
  },
}));

import { MemoryKnowledgeIndex } from '../knowledgeIndex';
import { MemoryOutbox } from '../outbox';
import { RateWindow } from '../quota';
import { ChainWriteError } from '../chainVault';
import {
  makeSearchHandler, makeWriteHandler, makeFetchHandler, MEMORY_DISCLOSURE, type McpDeps,
} from '../mcpTools';
import type { Embedder } from '../types';

const OWNER = 'a'.repeat(64);
const PARAMS = {
  quotaTiers: {
    read_only: { search_per_min: 20, writes_per_day: 0 },
    wallet: { search_per_min: 30, writes_per_day: 8 },
    standing: { search_per_min: 30, writes_per_day: 32 },
    veteran: { search_per_min: 60, writes_per_day: 128 },
  },
  standingPassWindows: 7, standingGateTime: 2, veteranGateTime: 5, timeEpochBlocks: 1440,
};

function deps(): McpDeps {
  const embedder: Embedder = { modelId: null, embed: async () => null };
  return {
    index: new MemoryKnowledgeIndex(), embedder, outbox: new MemoryOutbox(),
    rateWindow: new RateWindow(),
    getQuotaParams: async () => PARAMS,
    getAuditSummary: async () => ({ block: 500, beacon_stale: false, shards: { '3': 480 } }),
  };
}

function caller(over: Record<string, unknown> = {}) {
  return { sub: OWNER, username: 'neo', scope: ['memory:read', 'memory:write'],
    quotaTier: 'wallet' as const, ...over };
}

beforeEach(() => {
  postMock.mockReset();
  postMock.mockResolvedValue({ cid: 'c'.repeat(64), block: 7, shard_id: 3, vault_root: 'r'.repeat(64) });
});

describe('memory_write → memory_search → memory_fetch round trip', () => {
  it('writes an agent_note, finds it with provenance + disclosure, fetches the body', async () => {
    const d = deps();
    const write = makeWriteHandler(d);
    const search = makeSearchHandler(d);
    const fetchH = makeFetchHandler(d);

    const w = await write({ kind: 'agent_note', text: 'a packet drifts on the grid',
      visibility: 'public', meta: {} }, caller());
    const wBody = JSON.parse(w.content[0].text);
    expect(wBody).toEqual({ cid: 'c'.repeat(64), block: 7, shard_id: 3, indexed: true });

    const s = await search({ query: 'packet grid', k: 8, kind: 'any', scope: 'all_readable' }, caller());
    const sBody = JSON.parse(s.content[0].text);
    expect(sBody.disclosure).toBe(MEMORY_DISCLOSURE);
    expect(sBody.hits).toHaveLength(1);
    expect(sBody.hits[0]).toMatchObject({
      cid: 'c'.repeat(64), kind: 'agent_note', author: 'neo',
      visibility: 'public', origin: 'token_authorized', created_block: 7,
      provenance: { vault_root: 'r'.repeat(64), shard_id: 3, last_pass_block: 480, beacon_stale: false },
    });

    const f = await fetchH({ cid: 'c'.repeat(64) }, caller());
    const fBody = JSON.parse(f.content[0].text);
    expect(fBody.entry.body).toBe('a packet drifts on the grid');
    expect(fBody.disclosure).toBe(MEMORY_DISCLOSURE);
  });
});

describe('per-call enforcement', () => {
  it('rejects a write without memory:write scope', async () => {
    const w = await makeWriteHandler(deps())(
      { kind: 'agent_note', text: 'x', visibility: 'public', meta: {} },
      caller({ scope: ['memory:read'] }));
    expect(w.isError).toBe(true);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('enforces writes/day from the durable count, keyed by subject', async () => {
    const d = deps();
    const write = makeWriteHandler(d);
    // wallet tier: 8/day. Seed 8 token-authorized rows for OWNER.
    for (let i = 0; i < 8; i++) {
      await d.index.project({
        cid: String(i).repeat(64).slice(0, 64), ownerHex: OWNER, author: 'neo',
        kind: 'agent_note', visibility: 'public', origin: 'token_authorized',
        body: `n${i}`, meta: {}, vaultRoot: 'r'.repeat(64), shardId: 1, createdBlock: i,
      }, null, null);
    }
    const w = await write({ kind: 'agent_note', text: 'the 9th', visibility: 'public', meta: {} }, caller());
    expect(w.isError).toBe(true);
    expect(JSON.parse(w.content[0].text).error).toMatch(/write quota/i);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('enforces search rate per subject (sliding minute)', async () => {
    const d = deps();
    const search = makeSearchHandler(d);
    for (let i = 0; i < 30; i++) {
      const r = await search({ query: 'x', k: 1, kind: 'any', scope: 'public' }, caller());
      expect(r.isError).toBeUndefined();
    }
    const throttled = await search({ query: 'x', k: 1, kind: 'any', scope: 'public' }, caller());
    expect(throttled.isError).toBe(true);
    // another subject sails through (Global Constraint 7)
    const other = await search({ query: 'x', k: 1, kind: 'any', scope: 'public' },
      caller({ sub: 'b'.repeat(64) }));
    expect(other.isError).toBeUndefined();
  });

  it('surfaces the structural private rejection as a clean tool error', async () => {
    const w = await makeWriteHandler(deps())(
      { kind: 'agent_note', text: 'x', visibility: 'private' as never, meta: {} }, caller());
    expect(w.isError).toBe(true);
    expect(JSON.parse(w.content[0].text).error).toMatch(/never indexed/);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('memory_fetch returns a not-found error for unknown or tombstoned cids', async () => {
    const f = await makeFetchHandler(deps())({ cid: 'd'.repeat(64) }, caller());
    expect(f.isError).toBe(true);
  });
});

describe('write path is chain-gated (the ONE door, no alternate path)', () => {
  it('a ChainWriteError from postVaultEntry (e.g. a 503 shard-unauth refusal) ' +
     'surfaces as isError, never swallowed into a false success', async () => {
    const d = deps();
    postMock.mockRejectedValueOnce(new ChainWriteError(503, 'shard route unauthenticated'));
    const w = await makeWriteHandler(d)(
      { kind: 'agent_note', text: 'x', visibility: 'network', meta: {} }, caller());
    expect(w.isError).toBe(true);
    expect(JSON.parse(w.content[0].text).error).toMatch(/shard route unauthenticated/);
    // nothing was indexed or queued on a chain failure — chain stays authoritative
    expect(await d.index.fetch('c'.repeat(64))).toBeNull();
  });
});
