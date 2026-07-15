// @vitest-environment node
// Embedder seam tests. The local-model leg is opt-in (downloads a model):
//   VAULT_INDEX_TEST_EMBEDDER=1 npm run test:run -- src/services/vaultIndex/__tests__/embedder.test.ts
import { describe, it, expect } from 'vitest';
import { NullEmbedder, createEmbedderFromEnv, chunkText, LocalOnnxEmbedder } from '../embedder';
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

// C3 correction (vault-audit, plan Revision Log): all-MiniLM-L6-v2 has a
// 256-token context window; vault entries run up to VAULT_ENTRY_MAX_BYTES
// (4096 bytes, ~1000+ tokens). These are pure, always-on unit tests of the
// chunking helper itself — no model download required — proving inputs
// longer than the model window are split into multiple chunks whose
// concatenation still carries content past what a naive first-256-token
// truncation would ever see.
describe('chunkText (C3 correction — pure, no model needed)', () => {
  it('returns short input as a single unchanged chunk', () => {
    const short = 'a quiet audit passes on the grid';
    expect(chunkText(short)).toEqual([short]);
  });

  it('splits input longer than the chunk budget into multiple chunks', () => {
    const long = 'the vault records a quiet grid entry. '.repeat(40); // ~1560 chars
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk must individually fit comfortably under the model window —
    // this is the guarantee that replaces silent truncation.
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(700);
    }
  });

  it('discriminating: a naive first-N-char truncation drops trailing content that chunking preserves', () => {
    const base = 'the vault records a quiet grid entry. '.repeat(40);
    const marker = 'UNIQUE_TAIL_MARKER_ZQX';
    const withTail = base + marker;

    // Stand-in for "what a truncating impl would ever see": the first
    // ~256-token window, approximated the same conservative way the
    // chunker itself budgets (see CHUNK_CHAR_BUDGET in embedder.ts).
    const naiveTruncated = withTail.slice(0, 630);
    expect(naiveTruncated).not.toContain(marker);

    // Our chunker must not lose it: the marker survives in *some* chunk,
    // available to be embedded.
    const chunks = chunkText(withTail);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((c) => c.includes(marker))).toBe(true);
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
  }, 120_000);
});
