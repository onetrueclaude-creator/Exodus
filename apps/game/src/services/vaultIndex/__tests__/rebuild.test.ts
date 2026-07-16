// @vitest-environment node
// Global Constraint 8 / design §5.3: the index is a DERIVED projection.
// Equivalence proof shape: write N entries through the live pipeline into
// index A; rebuild index B from the chain's entry listing (the same canonical
// docs the DAG holds); assert A ≡ B on every queryable field.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { postMock, listMock } = vi.hoisted(() => ({ postMock: vi.fn(), listMock: vi.fn() }));
vi.mock('../chainVault', () => ({
  postVaultEntry: postMock,
  listVaultEntries: listMock,
  ChainWriteError: class ChainWriteError extends Error {
    constructor(public status: number, msg: string) { super(msg); }
  },
}));

import { MemoryKnowledgeIndex } from '../knowledgeIndex';
import { MemoryOutbox } from '../outbox';
import { writeMemory } from '../writePipeline';
import { rebuildFromChain, entryItemToInput } from '../rebuild';
import type { Embedder } from '../types';

const OWNER = 'a'.repeat(64);
const nullEmbedder: Embedder = { modelId: null, embed: async () => null };

function chainDoc(i: number, text: string) {
  return {
    cid: String(i).repeat(64).slice(0, 64),
    vault_root: 'r'.repeat(64), block: 100 + i, shard_id: 5,
    entry: {
      v: 1, kind: 'agent_note', text, visibility: i % 2 ? 'network' : 'public',
      owner_hex: OWNER, author: 'neo', origin: 'token_authorized',
      meta: { n: i }, created_block: 100 + i,
    },
  };
}

beforeEach(() => { postMock.mockReset(); listMock.mockReset(); });

describe('rebuild equivalence (the projection property, proven not asserted)', () => {
  it('index-by-write ≡ index-by-rebuild on every queryable field', async () => {
    const docs = [chainDoc(1, 'packet drifts on the grid'),
                  chainDoc(2, 'a quiet audit passes'),
                  chainDoc(3, 'tenure counts the days')];
    // A: live write path.
    const a = new MemoryKnowledgeIndex();
    for (const d of docs) {
      postMock.mockResolvedValueOnce({ cid: d.cid, block: d.block, shard_id: 5, vault_root: d.vault_root });
      await writeMemory({ index: a, embedder: nullEmbedder, outbox: new MemoryOutbox() }, {
        ownerHex: d.entry.owner_hex, author: d.entry.author, kind: 'agent_note',
        text: d.entry.text, visibility: d.entry.visibility as 'public' | 'network',
        meta: d.entry.meta,
      });
    }
    // B: rebuild from the chain listing (paginated).
    listMock
      .mockResolvedValueOnce({ total: 3, offset: 0,
        entries: docs.slice(0, 2).map(d => ({ ...d, entry: { ...d.entry } })) })
      .mockResolvedValueOnce({ total: 3, offset: 2, entries: [docs[2]] });
    const b = new MemoryKnowledgeIndex();
    const res = await rebuildFromChain(b, nullEmbedder, 2);
    expect(res).toEqual({ projected: 3, skipped: 0 });

    for (const d of docs) {
      const ra = await a.fetch(d.cid);
      const rb = await b.fetch(d.cid);
      // Global Constraint 8: full-row equivalence, shard_id included — the
      // chain listing now carries shard_id (shard_of_cid(cid)), so there is
      // no field left to paper over with an override; A and B must match
      // exactly (proven, not asserted around).
      expect(rb).toEqual(ra);
      expect(rb!.shardId).toBe(5);
      expect(rb!.body).toBe(d.entry.text);
      expect(rb!.vaultRoot).toBe(d.vault_root);
    }
    // identical search behavior
    const q = { query: 'audit', k: 8, kind: 'any' as const, scope: 'all_readable' as const, subOwnerHex: OWNER };
    expect((await b.search(q, null)).map(h => h.cid))
      .toEqual((await a.search(q, null)).map(h => h.cid));
  });

  it('skips non-entry docs and anything not public/network (belt-and-suspenders)', () => {
    expect(entryItemToInput({ cid: 'x'.repeat(64), vault_root: '', block: 1, shard_id: 1,
      entry: { v: 1, kind: 'agent_note', text: 't', visibility: 'private',
        owner_hex: OWNER, author: '', origin: 'token_authorized', meta: {}, created_block: 1 } }))
      .toBeNull();
    expect(entryItemToInput({ cid: 'x'.repeat(64), vault_root: '', block: 1, shard_id: 1,
      entry: { v: 1, kind: 'planet_post', text: 't', visibility: 'public',
        owner_hex: OWNER, author: '', origin: 'wallet_signed', meta: {}, created_block: 1 } }))
      .toBeNull();   // D8: planet_post never enters the index, even via rebuild
  });
});
