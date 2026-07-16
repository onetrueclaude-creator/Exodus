// Rebuild the vault_index projection from the vault DAG (via the chain's
// service-gated entry listing). Losing Postgres loses NO memory content —
// only search availability until this runs (design §2; Global Constraint 8).
// Idempotent: project() is an upsert keyed by cid.
import { listVaultEntries, type ChainEntryListItem } from './chainVault';
import { Embedder, EntryInput, EntryKind, KnowledgeIndex, Visibility } from './types';

const KINDS: readonly string[] = ['haiku_ncp', 'agent_intro', 'agent_note'];
const VISIBILITIES: readonly string[] = ['public', 'network'];

/** Map one chain listing item to a projectable entry. Returns null for
 * non-S4 docs and — belt-and-suspenders under Global Constraints 5/6 — for
 * any doc whose kind/visibility is outside the S4 index universe (the chain
 * already refuses these at ingest; the rebuild refuses them again). */
export function entryItemToInput(item: ChainEntryListItem): EntryInput | null {
  const e = item.entry;
  if (!e || e.v !== 1) return null;
  if (!KINDS.includes(e.kind)) return null;          // excludes planet_post (D8)
  if (!VISIBILITIES.includes(e.visibility)) return null;   // excludes private (D1)
  return {
    cid: item.cid,
    ownerHex: e.owner_hex,
    author: e.author,
    kind: e.kind as EntryKind,
    visibility: e.visibility as Visibility,
    origin: e.origin as EntryInput['origin'],
    body: e.text,
    meta: e.meta ?? {},
    vaultRoot: item.vault_root,
    shardId: item.shard_id,   // carried by the chain listing (shard_of_cid(cid)); load-bearing for search-hit provenance (§4.1) — must not be lost on rebuild
    createdBlock: e.created_block,
  };
}

export async function rebuildFromChain(
  index: KnowledgeIndex,
  embedder: Embedder,
  pageSize = 200,
): Promise<{ projected: number; skipped: number }> {
  let offset = 0;
  let projected = 0;
  let skipped = 0;
  for (;;) {
    const page = await listVaultEntries(offset, pageSize);
    for (const item of page.entries) {
      const input = entryItemToInput(item);
      if (!input) { skipped++; continue; }
      const embedding = await embedder.embed(input.body);
      await index.project(input, embedding, embedder.modelId);
      projected++;
    }
    offset += pageSize;
    if (offset >= page.total || page.entries.length === 0) break;
  }
  return { projected, skipped };
}
