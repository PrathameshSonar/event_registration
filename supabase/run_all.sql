-- =============================================================================
-- run_all.sql — All feature migrations in one script.
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS,
-- so running it again won't error or duplicate anything.
--
-- Assumes the base tables already exist: events, categories, registrations,
-- event_media, page_content. Everything else (columns, tables, RLS) is here.
-- =============================================================================


-- 0a) ── Event date / venue columns ─────────────────────────────────────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS date_time    TEXT,
    ADD COLUMN IF NOT EXISTS date_time_hi TEXT,
    ADD COLUMN IF NOT EXISTS venue        TEXT,
    ADD COLUMN IF NOT EXISTS venue_hi     TEXT,
    ADD COLUMN IF NOT EXISTS map_url      TEXT;


-- 0b) ── Hindi language columns ─────────────────────────────────────────────
ALTER TABLE page_content
    ADD COLUMN IF NOT EXISTS title_hi TEXT,
    ADD COLUMN IF NOT EXISTS description_text_hi TEXT;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS title_hi TEXT,
    ADD COLUMN IF NOT EXISTS short_description_hi TEXT,
    ADD COLUMN IF NOT EXISTS long_description_hi TEXT;

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS title_hi TEXT,
    ADD COLUMN IF NOT EXISTS description_hi TEXT,
    ADD COLUMN IF NOT EXISTS detailed_description_hi TEXT;


-- 1) ── Per-category attendee cap ───────────────────────────────────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS max_attendees_per_reg INTEGER DEFAULT 5;


-- 2) ── Entry checkpoints + per-scan audit trail ────────────────────────────
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkins_registration_id_idx ON checkins(registration_id);
CREATE INDEX IF NOT EXISTS checkins_checkpoint_id_idx ON checkins(checkpoint_id);

GRANT ALL ON checkpoints TO service_role;
GRANT ALL ON checkins TO service_role;


-- 3) ── Link categories to their parent event ───────────────────────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS categories_event_id_idx ON categories(event_id);


-- 4) ── Show inactive events on the public archive (opt-in per event) ────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS show_in_archive BOOLEAN DEFAULT false;


-- 5) ── Dynamic registration form field catalog ─────────────────────────────
CREATE TABLE IF NOT EXISTS form_fields (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key   TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL,
    label_hi    TEXT,
    field_type  TEXT NOT NULL DEFAULT 'text',
    options     JSONB,
    is_custom   BOOLEAN DEFAULT false,
    is_core     BOOLEAN DEFAULT false,
    is_visible  BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

GRANT ALL ON form_fields TO service_role;
-- Built-in field rows are auto-seeded by the admin dashboard on first load.


-- 6) ── Per-category field configuration (run after form_fields) ────────────
CREATE TABLE IF NOT EXISTS category_field_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_id    UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    is_visible  BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    sort_order  INTEGER DEFAULT 0,
    UNIQUE (category_id, field_id)
);
CREATE INDEX IF NOT EXISTS cfs_category_idx ON category_field_settings(category_id);

GRANT ALL ON category_field_settings TO service_role;


-- 7) ── Homepage: countdown, helpline, schedule, ritual highlights ──────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT;

CREATE TABLE IF NOT EXISTS event_schedule (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    day_label    TEXT,
    day_label_hi TEXT,
    time_label   TEXT,
    title        TEXT NOT NULL,
    title_hi     TEXT,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_schedule_event_idx ON event_schedule(event_id);

CREATE TABLE IF NOT EXISTS event_highlights (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    icon           TEXT DEFAULT '🪔',
    title          TEXT NOT NULL,
    title_hi       TEXT,
    description    TEXT,
    description_hi TEXT,
    sort_order     INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_highlights_event_idx ON event_highlights(event_id);

GRANT ALL ON event_schedule TO service_role;
GRANT ALL ON event_highlights TO service_role;


-- 8) ── Homepage hero background image (per event) ──────────────────────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT;


-- 9) ── FAQ accordion + reminder opt-ins ────────────────────────────────────
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


-- 10) ── Row Level Security ──────────────────────────────────────────────────
-- registrations hold PII: enable RLS with NO anon policy (service role bypasses).
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read registrations"  ON public.registrations;
DROP POLICY IF EXISTS "public insert registrations" ON public.registrations;
DROP POLICY IF EXISTS "anon all registrations"      ON public.registrations;

-- Public marketing tables: anon may READ only.
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories read for all" ON public.categories;
CREATE POLICY "categories read for all" ON public.categories FOR SELECT USING (true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events read for all" ON public.events;
CREATE POLICY "events read for all" ON public.events FOR SELECT USING (true);

ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_media read for all" ON public.event_media;
CREATE POLICY "event_media read for all" ON public.event_media FOR SELECT USING (true);

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_content read for all" ON public.page_content;
CREATE POLICY "page_content read for all" ON public.page_content FOR SELECT USING (true);

-- Note: the feature tables added above (checkpoints, form_fields, event_schedule,
-- event_highlights, event_faqs, event_reminders, etc.) are read server-side via
-- the service-role key, so they need no anon policy.

-- =============================================================================
-- Done. Next steps in the app:
--   • Storage → create a PRIVATE bucket named "qr-codes" (for QR entry passes)
--   • Vercel env: SCANNER_PIN, NEXT_PUBLIC_SITE_URL (+ Resend / WhatsApp keys)
--   • Admin → assign each ticket tier to an event, configure form fields,
--     and fill in Home Page Content.
-- =============================================================================
