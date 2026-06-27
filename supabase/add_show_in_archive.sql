-- Lets admin choose which past (inactive) events appear on the public
-- "Previous Events" page. Events created only for future planning stay hidden.
-- Run this in Supabase SQL Editor.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS show_in_archive BOOLEAN DEFAULT false;

GRANT ALL ON events TO service_role;
