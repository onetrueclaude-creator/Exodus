CREATE TABLE IF NOT EXISTS subgrid_allocations (
    wallet_index INTEGER PRIMARY KEY,
    secure_cells INTEGER NOT NULL DEFAULT 0,
    develop_cells INTEGER NOT NULL DEFAULT 0,
    research_cells INTEGER NOT NULL DEFAULT 0,
    storage_cells INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subgrid_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_subgrid" ON subgrid_allocations FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE subgrid_allocations;
