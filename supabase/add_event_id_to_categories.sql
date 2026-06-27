-- Links categories to their parent event.
-- Run this in Supabase SQL Editor.
-- After running, reassign existing categories to their event via Admin → Ticket Tiers.

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Index for fast per-event category lookup
CREATE INDEX IF NOT EXISTS categories_event_id_idx ON categories(event_id);

GRANT ALL ON categories TO service_role;
