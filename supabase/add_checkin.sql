-- Run in Supabase SQL Editor
-- Adds check-in tracking columns to registrations.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checked_in_count INTEGER DEFAULT 0;
