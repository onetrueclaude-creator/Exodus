// @vitest-environment node
// §5.4 consistency rule: chain write is authoritative and FIRST. Chain
// failure → error, nothing indexed. Index failure → outbox, eventually
// consistent. Private input → PrivateContentError BEFORE any chain call or
// embedding (the §5.2 structural rule at the pipeline mouth).
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
import { writeMemory, drainOutbox, type WriteDeps } from '../writePipeline';
import { PrivateContentError, type Embedder } from '../types';

const OWNER = 'a'.repeat(64);

function deps(over: Partial<WriteDeps> = {}): WriteDeps {
  const embedder: Embedder = { modelId: 'test-model', embed: vi.fn(async () => [0.1, 0.2]) };
  return { index: new MemoryKnowledgeIndex(), embedder, outbox: new MemoryOutbox(), ...over };
}

function input(over: Record<string, unknown> = {}) {
  return { ownerHex: OWNER, author: 'neo', kind: 'agent_note' as const,
    text: 'a packet drifts on the grid', visibility: 'public' as const, meta: {}, ...over };
}

beforeEach(() => {
  postMock.mockReset();
  postMock.mockResolvedValue({ cid: 'c'.repeat(64), block: 7, shard_id: 3, vault_root: 'r'.repeat(64) });
});

describe('writeMemory', () => {
  it('chain-first, then projection: returns indexed=true and the hit is searchable', async () => {
    const d = deps();
    const res = await writeMemory(d, input());
    expect(res).toEqual({ cid: 'c'.repeat(64), block: 7, shard_id: 3, indexed: true });
    expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'agent_note', visibility: 'public', owner_hex: OWNER,
      author: 'neo', origin: 'token_authorized',
    }));
    const hits = await d.index.search(
      { query: 'packet', k: 8, kind: 'any', scope: 'all_readable', subOwnerHex: OWNER }, null);
    expect(hits.map(h => h.cid)).toEqual(['c'.repeat(64)]);
  });

  it('private input throws BEFORE the chain call and BEFORE any embedding', async () => {
    const d = deps();
    await expect(writeMemory(d, input({ visibility: 'private' })))
      .rejects.toThrow(PrivateContentError);
    expect(postMock).not.toHaveBeenCalled();
    expect(d.embedder.embed).not.toHaveBeenCalled();      // never computed for private
  });

  it('oversize text is rejected locally (chain remains authoritative)', async () => {
    await expect(writeMemory(deps(), input({ text: 'x'.repeat(4097) })))
      .rejects.toThrow(/4096/);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('chain failure → throws, nothing indexed, nothing queued', async () => {
    postMock.mockRejectedValue(new Error('chain 502'));
    const d = deps();
    await expect(writeMemory(d, input())).rejects.toThrow('chain 502');
    expect(await d.index.fetch('c'.repeat(64))).toBeNull();
    expect(await d.outbox.drain(async () => {}, 10)).toBe(0);
  });

  it('index failure → outbox holds the entry, indexed=false; drain projects it', async () => {
    const d = deps();
    const failOnce = vi.spyOn(d.index, 'project').mockRejectedValueOnce(new Error('pg down'));
    const res = await writeMemory(d, input());
    expect(res.indexed).toBe(false);
    failOnce.mockRestore();
    const n = await drainOutbox(d);
    expect(n).toBe(1);
    expect(await d.index.fetch('c'.repeat(64))).not.toBeNull();
    expect(await drainOutbox(d)).toBe(0);                 // drained exactly once
  });
});
