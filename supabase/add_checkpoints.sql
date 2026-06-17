-- Replaces add_checkin.sql. Run this instead.
-- Creates checkpoint stations and a per-scan audit table.
-- Each volunteer's kiosk scans into a specific checkpoint.

CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Each individual scan event — one row per scan, full audit trail
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkins_registration_id_idx ON checkins(registration_id);
CREATE INDEX IF NOT EXISTS checkins_checkpoint_id_idx ON checkins(checkpoint_id);

-- Add checkpoints in Admin → Entry Checkpoints after running this migration.

GRANT ALL ON checkpoints TO service_role;
GRANT ALL ON checkins TO service_role;
