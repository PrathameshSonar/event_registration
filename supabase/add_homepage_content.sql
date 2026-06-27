-- Homepage devotional content: countdown date, helpline, schedule & ritual highlights.
-- Run in Supabase SQL Editor.

-- Countdown target + WhatsApp helpline on the event itself.
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Day-wise programme / schedule.
CREATE TABLE IF NOT EXISTS event_schedule (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    day_label   TEXT,
    day_label_hi TEXT,
    time_label  TEXT,
    title       TEXT NOT NULL,
    title_hi    TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_schedule_event_idx ON event_schedule(event_id);

-- Ritual / highlight cards (Havan, Maha Aarti, Annadān, etc.).
CREATE TABLE IF NOT EXISTS event_highlights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    icon            TEXT DEFAULT '🪔',
    title           TEXT NOT NULL,
    title_hi        TEXT,
    description     TEXT,
    description_hi  TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_highlights_event_idx ON event_highlights(event_id);

GRANT ALL ON event_schedule TO service_role;
GRANT ALL ON event_highlights TO service_role;
