CREATE TABLE IF NOT EXISTS resource_rewards (
    wallet_index INTEGER PRIMARY KEY,
    agntc_earned NUMERIC NOT NULL DEFAULT 0,
    dev_points NUMERIC NOT NULL DEFAULT 0,
    research_points NUMERIC NOT NULL DEFAULT 0,
    storage_size NUMERIC NOT NULL DEFAULT 0,
    secured_chains INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resource_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_rewards" ON resource_rewards FOR SELECT TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE resource_rewards;
