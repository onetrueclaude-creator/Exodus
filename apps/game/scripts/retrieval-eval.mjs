#!/usr/bin/env node
// Internal retrieval eval (design §12): recall@5 per kind over the golden
// set. GATES the word "semantic" in public copy (honesty-ledger row 4): the
// word is permitted only in a future PR quoting a SEMANTIC_OK verdict from
// this harness. Our numbers only; no third-party benchmarks cited (row 12).
// Modes: VAULT_INDEX_EMBEDDER=off (keyword baseline) | local (hybrid).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(path.join(here, 'retrieval-golden.json'), 'utf8'));
const K = 5;
const THRESHOLD = 0.8;
const mode = process.env.VAULT_INDEX_EMBEDDER ?? 'off';

let embed = async () => null;
if (mode === 'local') {
  const { pipeline } = await import('@huggingface/transformers');
  const fe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
  embed = async (t) => Array.from((await fe(t, { pooling: 'mean', normalize: true })).data);
}

const cosine = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d; };
const kw = (q, body) => {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const b = body.toLowerCase();
  return terms.filter((t) => b.includes(t)).length / terms.length;
};

const vectors = new Map();
for (const doc of golden.corpus) vectors.set(doc.cid, await embed(doc.text));

const perKind = {};
let hitSum = 0;
for (const { q, expect } of golden.queries) {
  const qv = await embed(q);
  const ranked = golden.corpus
    .map((d) => ({ cid: d.cid, kind: d.kind,
      score: qv && vectors.get(d.cid) ? cosine(qv, vectors.get(d.cid)) : Math.min(0.5, kw(q, d.text)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, K);
  const top = new Set(ranked.map((r) => r.cid));
  const hit = expect.some((cid) => top.has(cid)) ? 1 : 0;
  hitSum += hit;
  for (const cid of expect) {
    const kind = golden.corpus.find((d) => d.cid === cid).kind;
    perKind[kind] ??= { hits: 0, total: 0 };
    perKind[kind].total++;
    if (top.has(cid)) perKind[kind].hits++;
  }
}
const overall = hitSum / golden.queries.length;
const verdict = mode === 'local' && overall >= THRESHOLD ? 'SEMANTIC_OK'
  : mode === 'local' ? 'SEMANTIC_NOT_CLEARED' : 'KEYWORD_BASELINE';
console.log(JSON.stringify({
  mode, k: K, queries: golden.queries.length,
  recallAt5: +overall.toFixed(3),
  perKind: Object.fromEntries(Object.entries(perKind)
    .map(([k, v]) => [k, +(v.hits / v.total).toFixed(3)])),
  threshold: THRESHOLD, verdict,
}, null, 2));
