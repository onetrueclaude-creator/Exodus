// @vitest-environment node
// Embedder seam tests. The local-model leg is opt-in (downloads a model):
//   VAULT_INDEX_TEST_EMBEDDER=1 npm run test:run -- src/services/vaultIndex/__tests__/embedder.test.ts
import { describe, it, expect } from 'vitest';
import {
  NullEmbedder,
  createEmbedderFromEnv,
  chunkText,
  LocalOnnxEmbedder,
  CHUNK_CHAR_BUDGET,
  meanPoolAndNormalize,
} from '../embedder';
import { VAULT_ENTRY_MAX_BYTES } from '../types';

describe('NullEmbedder (B1 keyword-only mode)', () => {
  it('has null modelId and produces no vectors', async () => {
    const e = new NullEmbedder();
    expect(e.modelId).toBeNull();
    expect(await e.embed('a packet drifts on the grid')).toBeNull();
  });
});

describe('createEmbedderFromEnv', () => {
  it("returns NullEmbedder when VAULT_INDEX_EMBEDDER='off'", async () => {
    process.env.VAULT_INDEX_EMBEDDER = 'off';
    const e = await createEmbedderFromEnv();
    expect(e.modelId).toBeNull();
  });
});

// C3 correction (vault-audit, plan Revision Log): all-MiniLM-L6-v2's
// tokenizer hard-truncates at 512 tokens (256 is the model card's
// quality/eval window, not the truncation mechanism — see embedder.ts's
// header comment, REV-S4-T10 D4); vault entries run up to
// VAULT_ENTRY_MAX_BYTES (4096 bytes, ~1000+ tokens). These are pure,
// always-on unit tests of the chunking helper itself — no model download
// required — proving inputs longer than the model window are split into
// multiple chunks whose concatenation still carries content past what a
// naive truncation at the chunker's own budget would ever see.
describe('chunkText (C3 correction — pure, no model needed)', () => {
  it('returns short input as a single unchanged chunk', () => {
    const short = 'a quiet audit passes on the grid';
    expect(chunkText(short)).toEqual([short]);
  });

  it('splits input longer than the chunk budget into multiple chunks', () => {
    const long = 'the vault records a quiet grid entry. '.repeat(40); // ~1560 chars
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk must individually fit under the model window — this is
    // the guarantee that replaces silent truncation. Derived from
    // CHUNK_CHAR_BUDGET (REV-S4-T10 D3) so a budget tune can't silently
    // desync this from the chunker's actual invariant.
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(CHUNK_CHAR_BUDGET);
    }
  });

  it('discriminating: a naive first-N-char truncation drops trailing content that chunking preserves', () => {
    const base = 'the vault records a quiet grid entry. '.repeat(40);
    const marker = 'UNIQUE_TAIL_MARKER_ZQX';
    const withTail = base + marker;

    // Stand-in for "what a truncating impl would ever see": the chunker's
    // own budget (REV-S4-T10 D3: derived from CHUNK_CHAR_BUDGET, not
    // hardcoded, so this stays in sync if the budget is ever tuned).
    const naiveTruncated = withTail.slice(0, CHUNK_CHAR_BUDGET);
    expect(naiveTruncated).not.toContain(marker);

    // Our chunker must not lose it: the marker survives in *some* chunk,
    // available to be embedded.
    const chunks = chunkText(withTail);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((c) => c.includes(marker))).toBe(true);
  });
});

// REV-S4-T10 D1: chunkText trims every piece (see the tests above), so a
// whitespace-only input of any length returns zero chunks. embed() must
// treat "nothing to embed" as the Embedder contract's null value (types.ts:
// "null when this embedder does not produce vectors") instead of falling
// through to meanPoolAndNormalize([]), which reads vectors[0].length of
// undefined and throws a TypeError. Always-on and pure: chunkText's
// zero-chunk early return means embedChunk — and so the model — is never
// reached on this path, so no model download or cache is required.
describe('LocalOnnxEmbedder.embed — empty-chunk guard (D1, pure, no model needed)', () => {
  it('resolves to null for whitespace-only input longer than the chunk budget, instead of throwing', async () => {
    const e = new LocalOnnxEmbedder();
    const whitespaceOnly = ' '.repeat(CHUNK_CHAR_BUDGET + 70);
    expect(chunkText(whitespaceOnly)).toEqual([]); // pins the root cause
    await expect(e.embed(whitespaceOnly)).resolves.toBeNull();
  });
});

// REV-S4-T10 D2(a): the re-normalization step in meanPoolAndNormalize is
// the load-bearing math the C3 fix depends on — "mean of unit vectors is
// not itself unit-norm" (embedder.ts comment). Proven here with synthetic
// vectors, no model required, so the invariant is CI-visible on every run.
// This strengthens the review's own suggested fix, which only extended the
// opt-in, model-gated long-input test below (D2(b)) — that leg needs
// VAULT_INDEX_TEST_EMBEDDER=1 and a cached model, so it is skipped by
// default and CI never exercises it. This test carries the invariant in
// the always-on suite instead, independent of D2(b).
describe('meanPoolAndNormalize (D2(a), pure, no model needed) — synthetic re-normalization invariant', () => {
  it('re-normalizes the mean of two orthogonal unit vectors back to unit length', () => {
    const a = [1, 0];
    const b = [0, 1];

    // Ground truth, computed independently of the function under test: the
    // mean of two orthogonal unit vectors is [0.5, 0.5], with norm
    // sqrt(0.5) ≈ 0.70710678 — NOT unit length.
    const rawMean = [0.5, 0.5];
    const rawMeanNorm = Math.sqrt(rawMean[0] ** 2 + rawMean[1] ** 2);
    expect(rawMeanNorm).toBeCloseTo(0.70710678, 6);
    const expectedRenormalized = rawMean.map((x) => x / rawMeanNorm);

    const result = meanPoolAndNormalize([a, b]);

    // The function's output must be unit-norm...
    const resultNorm = Math.sqrt(result.reduce((s, x) => s + x * x, 0));
    expect(resultNorm).toBeGreaterThan(0.99);
    expect(resultNorm).toBeLessThan(1.01);

    // ...and equal the independently-computed renormalized mean,
    // componentwise. If the re-normalization step is ever deleted, `result`
    // becomes the raw mean [0.5, 0.5] (norm ≈ 0.7071) and both the norm
    // assertions above and the equality assertions below fail.
    expect(result[0]).toBeCloseTo(expectedRenormalized[0], 6);
    expect(result[1]).toBeCloseTo(expectedRenormalized[1], 6);
  });
});

// Local-model leg — only meaningful on a PASS verdict; skipped otherwise.
const RUN_LOCAL = process.env.VAULT_INDEX_TEST_EMBEDDER === '1';
describe.skipIf(!RUN_LOCAL)('LocalOnnxEmbedder (B3, spike-gated)', () => {
  it('produces normalized 384-dim vectors deterministically', async () => {
    process.env.VAULT_INDEX_EMBEDDER = 'local';
    const e = await createEmbedderFromEnv();
    expect(e.modelId).toBe(process.env.VAULT_INDEX_EMBED_MODEL_ID ?? 'minilm-l6-v2-q8-384');
    const v1 = await e.embed('a quiet audit passes');
    const v2 = await e.embed('a quiet audit passes');
    expect(v1).not.toBeNull();
    expect(v1!.length).toBe(384);
    expect(v1).toEqual(v2);
    const norm = Math.sqrt(v1!.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeGreaterThan(0.99);
    expect(norm).toBeLessThan(1.01);
  }, 120_000);

  // C3 correction, proven against the REAL model+pipeline (not just the
  // pure chunker above), at a size representative of an actual max-size
  // vault entry (VAULT_ENTRY_MAX_BYTES = 4096 bytes): two long texts that
  // share every chunk except the last must produce DIFFERENT embeddings.
  // Empirically confirmed (throwaway probe script, not committed) that
  // calling this exact pipeline directly on raw text at this length
  // produces BYTE-IDENTICAL vectors regardless of trailing content — real
  // silent truncation, not a hypothetical. A truncating implementation
  // sees an identical shared prefix for both texts and — being
  // deterministic — emits the exact same vector for both, failing this
  // assertion. Chunk+mean-pool must not.
  it('chunk-pools long inputs instead of truncating: distinct trailing content changes the embedding', async () => {
    const e = new LocalOnnxEmbedder();
    const unit = 'the vault records a quiet grid entry. ';
    const base = unit.repeat(Math.ceil(VAULT_ENTRY_MAX_BYTES / unit.length)).slice(0, VAULT_ENTRY_MAX_BYTES - 100);
    const withTail = base + ' zzz a wholly distinct trailing marker sentence unlike anything above zzz';

    const v1 = await e.embed(base);
    const v2 = await e.embed(withTail);
    expect(v1).not.toBeNull();
    expect(v2).not.toBeNull();
    expect(v1!.length).toBe(384);
    expect(v2!.length).toBe(384);
    expect(v1).not.toEqual(v2);

    // REV-S4-T10 D2(b): the committed norm assertion in the test above this
    // one only exercises a short, single-chunk input, where the pipeline
    // itself already normalizes — it never proves the multi-chunk
    // mean-pool-then-renormalize path (meanPoolAndNormalize) holds the
    // "normalized" contract on a real, multi-chunk embedding. Assert it
    // here against the real model, on both long (>5-chunk) inputs.
    const norm1 = Math.sqrt(v1!.reduce((s, x) => s + x * x, 0));
    const norm2 = Math.sqrt(v2!.reduce((s, x) => s + x * x, 0));
    expect(norm1).toBeGreaterThan(0.99);
    expect(norm1).toBeLessThan(1.01);
    expect(norm2).toBeGreaterThan(0.99);
    expect(norm2).toBeLessThan(1.01);

    // Determinism: re-embedding the same multi-chunk input is byte-identical
    // — the sequential embedChunk loop + mean-pool must not introduce
    // nondeterminism across calls.
    const v2Again = await e.embed(withTail);
    expect(v2Again).toEqual(v2);
  }, 120_000);
});
