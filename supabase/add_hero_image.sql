-- Optional hero background image for the homepage (per event).
-- Run in Supabase SQL Editor.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

GRANT ALL ON events TO service_role;
