// KnowledgeIndex implementations (design §5.3). The index is a DERIVED
// projection over vault DAG atoms — rebuildable (Global Constraint 8), never
// a source of truth. Retrieval v0 = hybrid: a tsvector keyword candidate list
// and a cosine vector candidate list, ranked separately and fused by
// Reciprocal Rank Fusion (RRF).
//
// CORRECTION (plan Revision Log 2026-07-15, vault-audit finding C4): this
// replaces the plan's original rule `score = vscore ?? Math.min(0.5, kscore)`
// — that rule hard-capped keyword-only hits at 0.5 while ANY cosine value
// (however weak, or even negative) won outright over a keyword score. That is
// a cross-scale defect: raw cosine similarity and keyword overlap fraction
// are not comparable numbers, so blending them arithmetically always favors
// whichever scale happens to run "hot," and it under-ranks exactly the
// poetic/haiku vocabulary the design's own §10 risk 1 already flags as weak
// for embeddings (where keyword should be allowed to dominate). RRF sidesteps
// the scale problem entirely: each candidate list is ranked on its own terms,
// and a doc's fused score is Σ 1/(RRF_K + rank_i) over every list it appears
// in (1-based rank; RRF_K=60, the standard constant — rank-based and
// scale-free, no weight tuning between keyword and vector scores).
import type pg from 'pg';
import {
  EntryInput, EntryRecord, KnowledgeIndex, SearchHit, SearchQuery,
  assertNotPrivate, makeExcerpt,
} from './types';

const RRF_K = 60;

/** RRF contribution of a 0-based position in a ranked candidate list. */
function rrfTerm(rankIndex0: number): number {
  return 1 / (RRF_K + rankIndex0 + 1);
}

function scopeCheck(q: SearchQuery, visibility: string, ownerHex: string): boolean {
  switch (q.scope) {
    case 'mine': return q.subOwnerHex !== null && ownerHex === q.subOwnerHex;
    case 'public': return visibility === 'public';
    case 'network': return visibility === 'network';   // D7: all-players shared layer
    case 'all_readable': return visibility === 'public' || visibility === 'network';
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

type MemRow = EntryRecord & { embedding: number[] | null; createdAt: Date };

export class MemoryKnowledgeIndex implements KnowledgeIndex {
  private rows = new Map<string, MemRow>();

  async project(entry: EntryInput, embedding: number[] | null, embedModelId: string | null): Promise<void> {
    assertNotPrivate(entry.visibility);
    this.rows.set(entry.cid, {
      ...entry, excerpt: makeExcerpt(entry.body),
      embedModelId, deletedAt: null, embedding, createdAt: new Date(),
    });
  }

  async search(q: SearchQuery, queryEmbedding: number[] | null): Promise<SearchHit[]> {
    const terms = q.query.toLowerCase().split(/\s+/).filter(Boolean);
    const candidates: MemRow[] = [];
    for (const r of this.rows.values()) {
      if (r.deletedAt !== null) continue;
      if (q.kind !== 'any' && r.kind !== q.kind) continue;
      if (!scopeCheck(q, r.visibility, r.ownerHex)) continue;
      candidates.push(r);
    }

    // Keyword-ranked candidate list — only actual term matches qualify
    // (mirrors Postgres's `tsv @@ plainto_tsquery` predicate: no match means
    // not a candidate at all, not a zero-scored one).
    const kwRanked = candidates
      .map(r => {
        const body = r.body.toLowerCase();
        const kscore = terms.length ? terms.filter(t => body.includes(t)).length / terms.length : 0;
        return { r, kscore };
      })
      .filter(x => x.kscore > 0)
      .sort((a, b) => b.kscore - a.kscore || a.r.cid.localeCompare(b.r.cid))
      .slice(0, q.k);

    // Vector-ranked candidate list — top-k nearest by cosine, same "top-k
    // regardless of absolute score" semantics as the Postgres ANN query below.
    const vecRanked = queryEmbedding
      ? candidates
          .filter(r => r.embedding !== null)
          .map(r => ({ r, vscore: cosine(queryEmbedding, r.embedding!) }))
          .sort((a, b) => b.vscore - a.vscore || a.r.cid.localeCompare(b.r.cid))
          .slice(0, q.k)
      : [];

    const rrf = new Map<string, number>();
    const byCid = new Map<string, MemRow>();
    kwRanked.forEach(({ r }, i) => {
      byCid.set(r.cid, r);
      rrf.set(r.cid, (rrf.get(r.cid) ?? 0) + rrfTerm(i));
    });
    vecRanked.forEach(({ r }, i) => {
      byCid.set(r.cid, r);
      rrf.set(r.cid, (rrf.get(r.cid) ?? 0) + rrfTerm(i));
    });

    const scored: SearchHit[] = [...byCid.entries()].map(([cid, r]) => ({
      cid, score: rrf.get(cid)!, excerpt: r.excerpt, kind: r.kind, author: r.author,
      visibility: r.visibility, origin: r.origin, createdBlock: r.createdBlock,
      vaultRoot: r.vaultRoot, shardId: r.shardId,
    }));
    return scored.sort((a, b) => b.score - a.score || a.cid.localeCompare(b.cid)).slice(0, q.k);
  }

  async fetch(cid: string): Promise<EntryRecord | null> {
    const r = this.rows.get(cid);
    if (!r || r.deletedAt !== null) return null;
    const { embedding: _e, createdAt: _c, ...rec } = r;
    return rec;
  }

  async tombstone(cid: string): Promise<void> {
    const r = this.rows.get(cid);
    if (r) r.deletedAt = new Date().toISOString();
  }

  async countTokenWritesSince(ownerHex: string, since: Date): Promise<number> {
    let n = 0;
    for (const r of this.rows.values()) {
      if (r.ownerHex === ownerHex && r.origin === 'token_authorized' && r.createdAt >= since) n++;
    }
    return n;
  }
}

export class PostgresKnowledgeIndex implements KnowledgeIndex {
  private vectorReady: boolean | null = null;

  constructor(private pool: pg.Pool) {}

  private async hasVectorColumn(): Promise<boolean> {
    if (this.vectorReady !== null) return this.vectorReady;
    const r = await this.pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema='vault_index' AND table_name='entries' AND column_name='embedding'`);
    this.vectorReady = (r.rowCount ?? 0) > 0;
    return this.vectorReady;
  }

  async project(entry: EntryInput, embedding: number[] | null, embedModelId: string | null): Promise<void> {
    assertNotPrivate(entry.visibility);
    const excerpt = makeExcerpt(entry.body);
    const base = `INSERT INTO vault_index.entries
        (cid, owner_hex, author, kind, visibility, origin, body, excerpt,
         embed_model_id, meta, vault_root, shard_id, created_block)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (cid) DO UPDATE SET
         body=EXCLUDED.body, excerpt=EXCLUDED.excerpt,
         embed_model_id=EXCLUDED.embed_model_id, meta=EXCLUDED.meta`;
    const args = [entry.cid, entry.ownerHex, entry.author, entry.kind,
      entry.visibility, entry.origin, entry.body, excerpt,
      embedModelId, JSON.stringify(entry.meta), entry.vaultRoot,
      entry.shardId, entry.createdBlock];
    await this.pool.query(base, args);
    if (embedding && await this.hasVectorColumn()) {
      await this.pool.query(
        `UPDATE vault_index.entries SET embedding = $2::vector WHERE cid = $1`,
        [entry.cid, `[${embedding.join(',')}]`]);
    }
  }

  private scopeSql(q: SearchQuery, args: unknown[]): string {
    switch (q.scope) {
      case 'mine': args.push(q.subOwnerHex ?? ''); return `owner_hex = $${args.length}`;
      case 'public': return `visibility = 'public'`;
      case 'network': return `visibility = 'network'`;
      case 'all_readable': return `visibility IN ('public','network')`;
    }
  }

  async search(q: SearchQuery, queryEmbedding: number[] | null): Promise<SearchHit[]> {
    const cols = `cid, excerpt, kind, author, visibility, origin, created_block, vault_root, shard_id`;
    const rrf = new Map<string, number>();
    const byCid = new Map<string, Record<string, unknown>>();

    // Keyword-ranked candidate list.
    const kwArgs: unknown[] = [q.query];
    let where = `deleted_at IS NULL AND tsv @@ plainto_tsquery('simple', $1)`;
    if (q.kind !== 'any') { kwArgs.push(q.kind); where += ` AND kind = $${kwArgs.length}`; }
    where += ` AND ${this.scopeSql(q, kwArgs)}`;
    kwArgs.push(q.k);
    const kw = await this.pool.query(
      `SELECT ${cols}
       FROM vault_index.entries WHERE ${where}
       ORDER BY ts_rank(tsv, plainto_tsquery('simple', $1)) DESC, cid
       LIMIT $${kwArgs.length}`, kwArgs);
    kw.rows.forEach((r, i) => {
      byCid.set(r.cid, r);
      rrf.set(r.cid, (rrf.get(r.cid) ?? 0) + rrfTerm(i));
    });

    // Vector-ranked candidate list — top-k nearest neighbors regardless of
    // absolute cosine value (same semantics as the memory fake above).
    if (queryEmbedding && await this.hasVectorColumn()) {
      const vArgs: unknown[] = [`[${queryEmbedding.join(',')}]`];
      let vWhere = `deleted_at IS NULL AND embedding IS NOT NULL`;
      if (q.kind !== 'any') { vArgs.push(q.kind); vWhere += ` AND kind = $${vArgs.length}`; }
      vWhere += ` AND ${this.scopeSql(q, vArgs)}`;
      vArgs.push(q.k);
      const vec = await this.pool.query(
        `SELECT ${cols}
         FROM vault_index.entries WHERE ${vWhere}
         ORDER BY embedding <=> $1::vector LIMIT $${vArgs.length}`, vArgs);
      vec.rows.forEach((r, i) => {
        byCid.set(r.cid, r);
        rrf.set(r.cid, (rrf.get(r.cid) ?? 0) + rrfTerm(i));
      });
    }

    return [...byCid.keys()]
      .map(cid => this.rowToHit(byCid.get(cid)!, rrf.get(cid)!))
      .sort((a, b) => b.score - a.score || a.cid.localeCompare(b.cid))
      .slice(0, q.k);
  }

  private rowToHit(r: Record<string, unknown>, score: number): SearchHit {
    return {
      cid: r.cid as string, score, excerpt: r.excerpt as string,
      kind: r.kind as SearchHit['kind'], author: r.author as string,
      visibility: r.visibility as SearchHit['visibility'],
      origin: r.origin as SearchHit['origin'],
      createdBlock: Number(r.created_block), vaultRoot: r.vault_root as string,
      shardId: r.shard_id === null ? null : Number(r.shard_id),
    };
  }

  async fetch(cid: string): Promise<EntryRecord | null> {
    const r = await this.pool.query(
      `SELECT cid, owner_hex, author, kind, visibility, origin, body, excerpt,
              embed_model_id, meta, vault_root, shard_id, created_block, deleted_at
       FROM vault_index.entries WHERE cid = $1 AND deleted_at IS NULL`, [cid]);
    if (r.rowCount === 0) return null;
    const row = r.rows[0];
    return {
      cid: row.cid, ownerHex: row.owner_hex, author: row.author, kind: row.kind,
      visibility: row.visibility, origin: row.origin, body: row.body,
      excerpt: row.excerpt, embedModelId: row.embed_model_id,
      meta: row.meta ?? {}, vaultRoot: row.vault_root,
      shardId: row.shard_id === null ? null : Number(row.shard_id),
      createdBlock: Number(row.created_block), deletedAt: null,
    };
  }

  async tombstone(cid: string): Promise<void> {
    await this.pool.query(
      `UPDATE vault_index.entries SET deleted_at = now() WHERE cid = $1`, [cid]);
  }

  async countTokenWritesSince(ownerHex: string, since: Date): Promise<number> {
    const r = await this.pool.query(
      `SELECT count(*)::int AS n FROM vault_index.entries
       WHERE owner_hex = $1 AND origin = 'token_authorized' AND created_at >= $2`,
      [ownerHex, since]);
    return r.rows[0].n;
  }
}
