-- Run in Supabase SQL Editor
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS date_time      TEXT,
    ADD COLUMN IF NOT EXISTS date_time_hi   TEXT,
    ADD COLUMN IF NOT EXISTS venue          TEXT,
    ADD COLUMN IF NOT EXISTS venue_hi       TEXT,
    ADD COLUMN IF NOT EXISTS map_url        TEXT;
