-- 002_vector — the B3 hybrid-retrieval leg. Applied ONLY where pgvector is
-- installable; when it is not, S4 runs keyword-only (B1 fallback flag,
-- design §5.3 ops checkpoint) and no "semantic" copy ships anywhere.
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE vault_index.entries ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX IF NOT EXISTS entries_embedding_idx
  ON vault_index.entries USING hnsw (embedding vector_cosine_ops);
