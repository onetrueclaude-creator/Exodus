-- vault_index — S4 knowledge-index bounded context (design §5.3).
-- HARD RULES: no foreign keys into game tables (extraction seam, D3/A2);
-- visibility CHECK has no 'private' value — a private row is unrepresentable
-- (D1/C2, Global Constraint 5); kind CHECK has no 'planet_post' value —
-- adding it later must be a deliberate migration, not a default (D8,
-- Global Constraint 6).
CREATE SCHEMA IF NOT EXISTS vault_index;

CREATE TABLE IF NOT EXISTS vault_index.entries (
  cid            text PRIMARY KEY,              -- S1 DAG atom CID (the anchor)
  owner_hex      text NOT NULL,
  author         text NOT NULL DEFAULT '',      -- public in-game username at write
  kind           text NOT NULL CHECK (kind IN ('haiku_ncp','agent_intro','agent_note')),
  visibility     text NOT NULL CHECK (visibility IN ('public','network')),
  origin         text NOT NULL CHECK (origin IN ('wallet_signed','token_authorized')),
  body           text NOT NULL,                 -- <= VAULT_ENTRY_MAX_BYTES (4096)
  excerpt        text NOT NULL,                 -- <= VAULT_EXCERPT_MAX_BYTES (1024)
  tsv            tsvector GENERATED ALWAYS AS (to_tsvector('simple', body)) STORED,
  embed_model_id text,                          -- reindex-safe: re-embed on model change
  meta           jsonb NOT NULL DEFAULT '{}',
  vault_root     text NOT NULL,                 -- root CID at write (provenance)
  shard_id       integer,
  created_block  integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz                    -- tombstone (design §5.6)
);
CREATE INDEX IF NOT EXISTS entries_tsv_idx   ON vault_index.entries USING GIN (tsv);
CREATE INDEX IF NOT EXISTS entries_owner_idx ON vault_index.entries (owner_hex);
CREATE INDEX IF NOT EXISTS entries_origin_created_idx
  ON vault_index.entries (owner_hex, origin, created_at);

CREATE TABLE IF NOT EXISTS vault_index.projection_outbox (
  cid        text PRIMARY KEY,                  -- chain write succeeded, index write pending
  payload    jsonb NOT NULL,
  attempts   int NOT NULL DEFAULT 0,
  next_retry timestamptz
);

CREATE TABLE IF NOT EXISTS vault_index.revoked_tokens (
  jti        text PRIMARY KEY,                  -- revocation must survive redeploys
  expires_at timestamptz NOT NULL
);
