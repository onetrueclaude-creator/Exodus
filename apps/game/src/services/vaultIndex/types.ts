// vault_index bounded context — shared types (design §5.3, D3/A2 extraction
// seam). RULES: nothing in src/services/vaultIndex/ may import from
// @/components, @/store, or @/generated/prisma (structural test, Task 14);
// extraction to a standalone service (§7 A3) must stay a lift of this module
// + one schema.

export type EntryKind = 'haiku_ncp' | 'agent_intro' | 'agent_note';
export type Visibility = 'public' | 'network';
export type Origin = 'wallet_signed' | 'token_authorized';
export type SearchScope = 'mine' | 'network' | 'public' | 'all_readable';

export const VAULT_ENTRY_MAX_BYTES = 4096;   // mirrors chain params.py (concordance-pinned there)
export const VAULT_EXCERPT_MAX_BYTES = 1024;

/** Global Constraint 5: private content is structurally rejected — the index
 * layer RAISES on private input; filtering would only protect against other
 * users, exclusion protects against us and a DB compromise (design §5.2). */
export class PrivateContentError extends Error {
  constructor() {
    super("private content is never indexed or embedded — the index layer rejects visibility='private' structurally");
    this.name = 'PrivateContentError';
  }
}

export function assertNotPrivate(visibility: string): void {
  if (visibility === 'private') throw new PrivateContentError();
}

/** First VAULT_EXCERPT_MAX_BYTES UTF-8 bytes of the body, valid-UTF-8 safe. */
export function makeExcerpt(body: string): string {
  const buf = Buffer.from(body, 'utf8');
  if (buf.length <= VAULT_EXCERPT_MAX_BYTES) return body;
  return buf.subarray(0, VAULT_EXCERPT_MAX_BYTES).toString('utf8').replace(/�+$/u, '');
}

export interface EntryInput {
  cid: string;
  ownerHex: string;
  author: string;
  kind: EntryKind;
  visibility: Visibility;
  origin: Origin;
  body: string;
  meta: Record<string, unknown>;
  vaultRoot: string;
  shardId: number | null;
  createdBlock: number;
}

export interface EntryRecord extends EntryInput {
  excerpt: string;
  embedModelId: string | null;
  deletedAt: string | null;
}

export interface SearchQuery {
  query: string;
  k: number;
  kind: EntryKind | 'any';
  scope: SearchScope;
  /** token subject (owner_hex) — required for scope='mine'. */
  subOwnerHex: string | null;
}

export interface SearchHit {
  cid: string;
  score: number;
  excerpt: string;
  kind: EntryKind;
  author: string;
  visibility: Visibility;
  origin: Origin;
  createdBlock: number;
  vaultRoot: string;
  shardId: number | null;
}

export interface KnowledgeIndex {
  project(entry: EntryInput, embedding: number[] | null, embedModelId: string | null): Promise<void>;
  search(q: SearchQuery, queryEmbedding: number[] | null): Promise<SearchHit[]>;
  fetch(cid: string): Promise<EntryRecord | null>;
  tombstone(cid: string): Promise<void>;
  countTokenWritesSince(ownerHex: string, since: Date): Promise<number>;
}

export interface Embedder {
  /** null = keyword-only mode (B1). Non-null = the reindex-safe model tag. */
  readonly modelId: string | null;
  /** null when this embedder does not produce vectors. NEVER call with
   * private content — writers must assertNotPrivate() before embedding. */
  embed(text: string): Promise<number[] | null>;
}
