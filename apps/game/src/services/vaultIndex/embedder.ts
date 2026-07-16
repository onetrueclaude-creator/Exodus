// Embedder seam (design §7 axis B). Task-1 sizing spike verdict: PASS —
// S4 ships the B3 local open-weights embedder (MiniLM-class, 384-dim, ONNX
// CPU, quantized) with B1 keyword-only as the config fallback
// (VAULT_INDEX_EMBEDDER=off). Player content NEVER egresses to a third-party
// embedding API (B2 rejected, design §7). Init failure degrades loudly to
// NullEmbedder instead of taking writes down.
// VAULT_INDEX_EMBED_MODEL_ID must equal chain/agentic/params.py
// VAULT_INDEX_EMBED_MODEL_ID (concordance-pinned there, currently
// "minilm-l6-v2-q8-384"): rows are tagged so a model change is a background
// re-embed, not a migration (design §5.3).
//
// C3 correction (2026-07-15 vault-audit, plan Revision Log — verified gap):
// all-MiniLM-L6-v2's tokenizer hard-truncates at model_max_length = 512
// tokens (Xenova/all-MiniLM-L6-v2/tokenizer_config.json); 256 is the model
// card's quality/eval window, not the truncation mechanism (corrected per
// REV-S4-T10 D4 — the practical conclusion is unchanged: 180-token chunks
// sit safely under both figures). Vault entries run up to
// VAULT_ENTRY_MAX_BYTES (4096 bytes, ~1000+ tokens). Handing the raw body
// straight to the pipeline lets the underlying tokenizer silently truncate
// at 512 tokens — everything past that point is invisible to search, with
// no error or signal. Fix (scope-contained to this file, no
// Task-9/schema change): chunk inputs longer than the model's window into
// fixed, newline/sentence-aware windows, embed each chunk (the pipeline
// already mean-pools + normalizes per chunk), then mean-pool the per-chunk
// vectors into ONE normalized 384-dim vector. This keeps the
// one-vector-per-entry contract Task 9's KnowledgeIndex.project() consumes.
// Short inputs (the common case) still embed directly, unchanged.
// Documented T18-eval upgrade options (not done here): per-chunk INDEXING
// (multiple rows per entry, finer retrieval granularity) and swapping to
// nomic-embed-text-v1.5 (Apache-2.0, 8192-token ctx — solves truncation at
// the model level instead of the application level).
import { Embedder } from './types';

const DEFAULT_MODEL_TAG = 'minilm-l6-v2-q8-384';
const ONNX_MODEL = 'Xenova/all-MiniLM-L6-v2';

// Conservative chars-per-token estimate for a wordpiece English tokenizer.
// Deliberately on the low side (fewer chars assumed per token = more tokens
// assumed per char) so punctuation-dense or unusual text (haiku line
// breaks, code-like content) doesn't blow past the model's 256-token
// quality window (see the file header — the tokenizer's actual hard
// truncation cutoff is 512) even though the true ratio is usually a bit
// higher for common vocabulary.
const CHARS_PER_TOKEN_ESTIMATE = 3.5;
// Leaves headroom under the model's 256-token quality window for [CLS]/
// [SEP] and estimation slop rather than targeting it exactly.
const CHUNK_TOKEN_BUDGET = 180;
export const CHUNK_CHAR_BUDGET = Math.floor(CHUNK_TOKEN_BUDGET * CHARS_PER_TOKEN_ESTIMATE); // 630 chars

/** Split `text` into chunks no longer than `budget` characters, preferring to
 * break on paragraph, then newline, then sentence, then whitespace
 * boundaries so a cut doesn't land mid-word unless nothing else is
 * available. Short inputs (the common case) return as a single, unchanged
 * chunk. Exported for direct unit testing (C3 correction proof). */
export function chunkText(text: string, budget: number = CHUNK_CHAR_BUDGET): string[] {
  if (text.length <= budget) return [text];

  const boundaryPatterns = [/\n\s*\n/g, /\n/g, /(?<=[.!?])\s+/g, /\s+/g];
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > budget) {
    const window = remaining.slice(0, budget + 1);
    let cut = -1;
    for (const pattern of boundaryPatterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      let lastIndex = -1;
      while ((match = pattern.exec(window)) !== null) {
        lastIndex = match.index;
        if (pattern.lastIndex === match.index) pattern.lastIndex += 1; // zero-width guard
      }
      if (lastIndex > 0) {
        cut = lastIndex;
        break;
      }
    }
    if (cut <= 0) cut = budget; // no natural boundary — hard slice
    const piece = remaining.slice(0, cut).trim();
    if (piece.length > 0) chunks.push(piece);
    remaining = remaining.slice(cut).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/** Mean-pool several vectors, then re-normalize to unit length so the
 * multi-chunk path returns a vector with the same "normalized" contract as
 * the single-chunk path (mean of unit vectors is not itself unit-norm).
 * Exported for direct unit testing (REV-S4-T10 D2: the re-normalization step
 * is the load-bearing math and needs an always-on, model-free proof — see
 * the synthetic orthogonal-vector test in embedder.test.ts). */
export function meanPoolAndNormalize(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  const mean = sum.map((x) => x / vectors.length);
  const norm = Math.sqrt(mean.reduce((s, x) => s + x * x, 0));
  if (norm === 0) return mean;
  return mean.map((x) => x / norm);
}

export class NullEmbedder implements Embedder {
  readonly modelId = null;
  async embed(_text: string): Promise<number[] | null> { return null; }
}

type FeaturePipeline = (text: string, opts: { pooling: 'mean'; normalize: boolean })
  => Promise<{ data: Float32Array | number[] }>;

export class LocalOnnxEmbedder implements Embedder {
  readonly modelId: string;
  private pipe: Promise<FeaturePipeline> | null = null;

  constructor(modelId: string = process.env.VAULT_INDEX_EMBED_MODEL_ID ?? DEFAULT_MODEL_TAG) {
    this.modelId = modelId;
  }

  private load(): Promise<FeaturePipeline> {
    if (!this.pipe) {
      this.pipe = import('@huggingface/transformers').then(async (m) => {
        const p = await m.pipeline('feature-extraction', ONNX_MODEL, { dtype: 'q8' });
        return p as unknown as FeaturePipeline;
      });
    }
    return this.pipe;
  }

  private async embedChunk(chunk: string): Promise<number[]> {
    const fe = await this.load();
    const out = await fe(chunk, { pooling: 'mean', normalize: true });
    return Array.from(out.data as ArrayLike<number>);
  }

  async embed(text: string): Promise<number[] | null> {
    const chunks = chunkText(text);
    // REV-S4-T10 D1: whitespace-only input (any length) trims away to zero
    // chunks (chunkText drops every empty piece). Nothing to embed — return
    // the contract's "no vector" value instead of falling through to
    // meanPoolAndNormalize([]), which would read vectors[0].length of
    // undefined and throw. No model touched on this path.
    if (chunks.length === 0) return null;
    if (chunks.length === 1) return this.embedChunk(chunks[0]);
    // Sequential, not Promise.all: one long-lived pipeline instance backed
    // by a native ONNX Runtime addon with its own thread pool (see the T1
    // spike's teardown-quirk note) — avoid concurrent calls into it.
    const vectors: number[][] = [];
    for (const chunk of chunks) {
      vectors.push(await this.embedChunk(chunk));
    }
    return meanPoolAndNormalize(vectors);
  }
}

export async function createEmbedderFromEnv(): Promise<Embedder> {
  const mode = process.env.VAULT_INDEX_EMBEDDER ?? 'local';   // PASS default
  if (mode !== 'local') return new NullEmbedder();
  try {
    const e = new LocalOnnxEmbedder();
    await e.embed('warmup');   // fail fast at boot, not on the first player write
    return e;
  } catch (err) {
    console.error('vault_index: local embedder init failed — degrading to keyword-only (B1):', err);
    return new NullEmbedder();
  }
}
