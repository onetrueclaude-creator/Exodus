-- Per-node subgrid allocation. Supersedes subgrid_allocations (kept read-only
-- until PR C for rollback safety). See docs/superpowers/specs/2026-04-16-empire-panel-design.md.

CREATE TABLE IF NOT EXISTS node_subgrids (
  node_id       TEXT PRIMARY KEY,
  owner_wallet  INTEGER NOT NULL,
  cells         JSONB NOT NULL,
  type_levels   JSONB NOT NULL DEFAULT '{"secure":1,"develop":1,"research":1,"storage":1}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS node_subgrids_owner_idx
  ON node_subgrids(owner_wallet);

ALTER TABLE node_subgrids ENABLE ROW LEVEL SECURITY;

-- Anonymous read (public testnet). Mainnet migration will tighten this.
CREATE POLICY "anon_read_node_subgrids"
  ON node_subgrids FOR SELECT
  USING (true);

-- Only service_role can write (python miner does the upsert via supabase_sync.py).
CREATE POLICY "service_role_write_node_subgrids"
  ON node_subgrids FOR ALL
  TO service_role
  USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE node_subgrids;
