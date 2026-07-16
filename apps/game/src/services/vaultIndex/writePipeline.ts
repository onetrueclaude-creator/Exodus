// The §5.4 write path, end to end: validate (private is refused at the mouth)
// → chain POST /api/vault/entry (authoritative, FIRST) → embed → project
// (or outbox). An MCP-written memory is a first-class audited vault atom.
import { postVaultEntry } from './chainVault';
import { ProjectionOutbox } from './outbox';
import {
  EntryInput, Embedder, KnowledgeIndex, Visibility,
  VAULT_ENTRY_MAX_BYTES, assertNotPrivate,
} from './types';

export interface WriteDeps {
  index: KnowledgeIndex;
  embedder: Embedder;
  outbox: ProjectionOutbox;
}

export interface MemoryWriteInput {
  ownerHex: string;
  author: string;
  kind: 'agent_note';               // v0: the ONLY MCP-writable kind (D2/D6)
  text: string;
  visibility: Visibility;
  meta: Record<string, unknown>;
}

export async function writeMemory(deps: WriteDeps, input: MemoryWriteInput):
    Promise<{ cid: string; block: number; shard_id: number; indexed: boolean }> {
  assertNotPrivate(input.visibility);   // §5.2: refused BEFORE chain, BEFORE embedding
  const nBytes = Buffer.byteLength(input.text, 'utf8');
  if (nBytes > VAULT_ENTRY_MAX_BYTES) {
    throw new Error(`text exceeds ${VAULT_ENTRY_MAX_BYTES} bytes (${nBytes})`);
  }
  const chain = await postVaultEntry({
    kind: input.kind, text: input.text, visibility: input.visibility,
    owner_hex: input.ownerHex, author: input.author,
    origin: 'token_authorized', meta: input.meta,
  });
  const entry: EntryInput = {
    cid: chain.cid, ownerHex: input.ownerHex, author: input.author,
    kind: input.kind, visibility: input.visibility, origin: 'token_authorized',
    body: input.text, meta: input.meta, vaultRoot: chain.vault_root,
    shardId: chain.shard_id, createdBlock: chain.block,
  };
  let indexed = true;
  try {
    const embedding = await deps.embedder.embed(input.text);
    await deps.index.project(entry, embedding, deps.embedder.modelId);
  } catch {
    indexed = false;
    // NOTE: countTokenWritesSince (quota §6) counts index rows only — an
    // outbox-parked write (indexed=false) doesn't count toward writes/day
    // until drained. Accepted small slack while Postgres is degraded; the
    // chain write itself (the source of truth) already succeeded.
    await deps.outbox.enqueue(entry);   // eventually consistent (§5.3)
  }
  return { cid: chain.cid, block: chain.block, shard_id: chain.shard_id, indexed };
}

export async function drainOutbox(deps: WriteDeps, limit = 50): Promise<number> {
  return deps.outbox.drain(async (e) => {
    const embedding = await deps.embedder.embed(e.body);
    await deps.index.project(e, embedding, deps.embedder.modelId);
  }, limit);
}
