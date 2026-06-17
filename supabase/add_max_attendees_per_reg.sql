-- Run in Supabase SQL Editor
-- Adds a per-category cap on how many attendees a single registration can include.
-- Default 5 preserves existing behaviour.
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS max_attendees_per_reg INTEGER DEFAULT 5;
