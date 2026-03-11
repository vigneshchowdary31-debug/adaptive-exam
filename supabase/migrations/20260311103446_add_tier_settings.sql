CREATE TABLE IF NOT EXISTS tier_settings (
    tier text PRIMARY KEY,
    min_score integer NOT NULL
);

-- Insert the current cutoffs as defaults
INSERT INTO tier_settings (tier, min_score) VALUES
('P1', 22),
('P2', 15),
('P3', 0)
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS and create policies to allow anon read and update
ALTER TABLE tier_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
ON tier_settings FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable update access for all users"
ON tier_settings FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
