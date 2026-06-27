-- FAQ accordion + reminder opt-ins for the homepage.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS event_faqs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    question_hi TEXT,
    answer      TEXT NOT NULL,
    answer_hi   TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_faqs_event_idx ON event_faqs(event_id);

CREATE TABLE IF NOT EXISTS event_reminders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID REFERENCES events(id) ON DELETE CASCADE,
    email      TEXT,
    phone      TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_reminders_event_idx ON event_reminders(event_id);

GRANT ALL ON event_faqs TO service_role;
GRANT ALL ON event_reminders TO service_role;
