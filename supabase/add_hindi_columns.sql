-- supabase/add_hindi_columns.sql
-- Run this in the Supabase SQL Editor to add Hindi language support.
-- All columns are nullable — existing rows are unaffected.
-- The app shows Hindi text when present, falls back to English otherwise.

-- Event hero content (used by the Home page hero section)
ALTER TABLE page_content
    ADD COLUMN IF NOT EXISTS title_hi TEXT,
    ADD COLUMN IF NOT EXISTS description_text_hi TEXT;

-- Past events (shown on /previous-events)
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS title_hi TEXT,
    ADD COLUMN IF NOT EXISTS short_description_hi TEXT,
    ADD COLUMN IF NOT EXISTS long_description_hi TEXT;

-- Registration category cards (shown on Home page and /register/[id])
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS title_hi TEXT,
    ADD COLUMN IF NOT EXISTS description_hi TEXT,
    ADD COLUMN IF NOT EXISTS detailed_description_hi TEXT;
