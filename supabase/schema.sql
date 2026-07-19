-- =============================================================================
-- schema.sql — COMPLETE database schema for a FRESH Supabase project.
-- Paste this whole file into the Supabase SQL Editor and run it ONCE.
--
-- This is the self-contained version of the schema: it CREATES the base tables
-- (events, categories, registrations, event_media, page_content) AND everything
-- run_all.sql adds (columns, feature tables, constraints, RLS, grants).
--
-- • New / empty database  → run THIS file (schema.sql).
-- • Existing database that already has the base tables → run run_all.sql instead
--   (it only adds the incremental columns/tables and is safe to re-run).
--
-- Safe to re-run: everything uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--
-- AFTER running, in the app:
--   • Storage → create PRIVATE buckets "qr-codes" and "payment-proofs".
--     (The public "event-media" bucket is auto-created on first image upload.)
--   • Set env vars (see .env.example): Supabase, Razorpay, Resend, WhatsApp,
--     SESSION_SECRET, ADMIN_PASSWORD, SCANNER_PIN, NEXT_PUBLIC_SITE_URL, CRON_SECRET.
--   • Admin → create an event, ticket tiers, form fields, home content.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto (present on Supabase; harmless if already on).
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- BASE TABLES (fresh DB only). run_all.sql assumes these already exist and only
-- extends them; here we create them first, then the run_all body below fills in
-- the rest of the columns via ADD COLUMN IF NOT EXISTS (no-ops if already added).
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT,
    short_description TEXT,
    long_description  TEXT,
    is_active         BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Legacy content table (not used by the current app, kept for parity + RLS below).
CREATE TABLE IF NOT EXISTS page_content (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT,
    description_text TEXT,
    created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                TEXT,
    price                NUMERIC DEFAULT 0,
    description          TEXT,
    detailed_description TEXT,
    media_url            TEXT,
    is_full              BOOLEAN DEFAULT false,
    is_enquiry_only      BOOLEAN DEFAULT false,
    max_capacity         INTEGER DEFAULT 0,
    show_availability    BOOLEAN DEFAULT false,
    created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ DEFAULT now(),
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
    full_name           TEXT,
    salutation          TEXT,
    first_name          TEXT,
    last_name           TEXT,
    gotra               TEXT,
    gender              TEXT,
    date_of_birth       TEXT,
    email               TEXT,
    phone               TEXT,
    pincode             TEXT,
    taluka              TEXT,
    state               TEXT,
    problem_samasya     TEXT,
    attendees_count     INTEGER DEFAULT 1,
    donation_amount     NUMERIC DEFAULT 0,
    total_amount        NUMERIC DEFAULT 0,
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    payment_status      TEXT DEFAULT 'pending'   -- CHECK constraint added by run_all body below
);

CREATE TABLE IF NOT EXISTS event_media (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_type TEXT,                                  -- 'image' | 'youtube'
    url        TEXT,
    caption    TEXT,
    event_id   UUID REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grants: the service-role key writes everything; the public (anon/authenticated)
-- may READ the marketing tables. Row visibility is further controlled by RLS below.
GRANT ALL ON public.events, public.page_content, public.categories, public.registrations, public.event_media TO service_role;
GRANT SELECT ON public.events, public.categories, public.event_media, public.page_content TO anon, authenticated;


-- =============================================================================
-- The rest is identical to run_all.sql (columns, feature tables, RLS, grants).
-- =============================================================================


-- 0a) ── Event date / venue columns ─────────────────────────────────────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS date_time    TEXT,
    ADD COLUMN IF NOT EXISTS venue        TEXT,
    ADD COLUMN IF NOT EXISTS map_url      TEXT;


-- 0b) ── (retired) Hindi "_hi" columns ──────────────────────────────────────
-- Hindi (and every other language) now lives in the `translations` JSONB — see
-- 9b/9c. The legacy "_hi" columns are deliberately NOT created here: 9c drops
-- them, so creating them would just add-then-drop dead columns on every run.


-- 1) ── Per-category attendee cap + age restriction ─────────────────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS max_attendees_per_reg INTEGER DEFAULT 5;

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS min_age INTEGER,
    ADD COLUMN IF NOT EXISTS max_age INTEGER;


-- 1b) ── Payment options + part-payment ledger ──────────────────────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS show_emi_badge     BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_part_payment BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS advance_percent    INTEGER DEFAULT 25,
    ADD COLUMN IF NOT EXISTS allow_enquiry      BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_recommended     BOOLEAN DEFAULT false;

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS amount_paid      NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_due       NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_plan     TEXT DEFAULT 'full',
    ADD COLUMN IF NOT EXISTS balance_link_url TEXT,
    ADD COLUMN IF NOT EXISTS balance_link_id  TEXT;

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS qr_sent_at       TIMESTAMPTZ;

-- Names of the people in a group booking (attendees_count > 1). JSON array of { name }.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS attendees        JSONB;

-- Offline payments (bank transfer / cheque / cash / DD) + admin verification.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_method     TEXT,
    ADD COLUMN IF NOT EXISTS offline_reference  TEXT,
    ADD COLUMN IF NOT EXISTS offline_proof_path TEXT,
    ADD COLUMN IF NOT EXISTS offline_meta       JSONB,
    ADD COLUMN IF NOT EXISTS verified_by        TEXT,
    ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by_admin   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ticket_email_status TEXT,
    ADD COLUMN IF NOT EXISTS ticket_wa_status    TEXT,
    ADD COLUMN IF NOT EXISTS ticket_sent_at      TIMESTAMPTZ;

-- Global key/value app config (e.g. bank/UPI/cheque details for offline payments).
CREATE TABLE IF NOT EXISTS app_settings (
    key        VARCHAR PRIMARY KEY,
    value      JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON app_settings TO service_role;

-- Audit trail of mutating admin actions.
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_role  TEXT NOT NULL,
    actor_id    UUID,
    actor_label TEXT,
    action      TEXT NOT NULL,
    entity      TEXT,
    entity_id   TEXT,
    summary     TEXT,
    metadata    JSONB,
    ip          TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity     ON admin_audit_logs (entity);
GRANT ALL ON admin_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE admin_audit_logs_id_seq TO service_role;

-- Contact-history notes for the enquiry leads pipeline.
CREATE TABLE IF NOT EXISTS registration_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    note            TEXT NOT NULL,
    actor_role      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_notes_reg_idx ON registration_notes(registration_id);
GRANT ALL ON registration_notes TO service_role;

-- Admin login throttle (brute-force protection).
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip           TEXT PRIMARY KEY,
    fail_count   INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON admin_login_attempts TO service_role;

-- Named admin / volunteer accounts (RBAC). Passwords scrypt-hashed (salt:hash).
CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT UNIQUE NOT NULL,
    name          TEXT,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'volunteer')),
    permissions   JSONB DEFAULT '[]'::jsonb,
    active        BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users (username);
GRANT ALL ON admin_users TO service_role;

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
DO $$
BEGIN
    UPDATE admin_users SET role = 'volunteer', permissions = '[]'::jsonb WHERE role = 'viewer';
    ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'volunteer'));
END $$;

-- Admin cancellation. Cancelling is deliberately NOT a refund: the money columns
-- (amount_paid / razorpay ids) are left untouched so the payment record survives,
-- and a refund — if one is ever owed — stays a separate, explicit action.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS cancelled_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason  TEXT;

-- Full set of allowed payment_status values.
DO $$
BEGIN
    ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_payment_status_check;
    ALTER TABLE registrations
        ADD CONSTRAINT registrations_payment_status_check
        CHECK (payment_status IN (
            'pending', 'completed', 'failed', 'refunded',
            'enquired', 'contacted', 'amount_mismatch', 'advance_paid',
            'awaiting_payment', 'closed',
            'payment_review', 'cheque_received', 'payment_rejected',
            -- Admin-cancelled (seat released, money record preserved, no refund).
            'cancelled'
        ));
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'payment_status constraint not applied — existing rows have other values. Review and re-run.';
END $$;


-- 1c) ── Canonical user profiles (one row per person, keyed by phone) ────────
CREATE TABLE IF NOT EXISTS profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone         TEXT UNIQUE NOT NULL,
    email         TEXT,
    salutation    TEXT,
    first_name    TEXT,
    last_name     TEXT,
    full_name     TEXT,
    gotra         TEXT,
    gender        TEXT,
    date_of_birth TEXT,
    pincode       TEXT,
    taluka        TEXT,
    state         TEXT,
    verified_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS registrations_profile_id_idx ON registrations(profile_id);
GRANT ALL ON profiles TO service_role;

-- One-time backfill (no-op on a fresh DB): links existing registrations to profiles.
DO $$
BEGIN
    INSERT INTO profiles (phone, email, salutation, first_name, last_name, full_name,
                          gotra, gender, date_of_birth, pincode, taluka, state, created_at)
    SELECT DISTINCT ON (norm_phone)
        norm_phone, email, salutation, first_name, last_name, full_name,
        gotra, gender, date_of_birth::text, pincode, taluka, state, created_at
    FROM (
        SELECT r.*,
            CASE
                WHEN length(regexp_replace(r.phone, '[^0-9]', '', 'g')) = 12
                     AND left(regexp_replace(r.phone, '[^0-9]', '', 'g'), 2) = '91'
                    THEN '+91' || right(regexp_replace(r.phone, '[^0-9]', '', 'g'), 10)
                WHEN length(regexp_replace(r.phone, '[^0-9]', '', 'g')) = 11
                     AND left(regexp_replace(r.phone, '[^0-9]', '', 'g'), 1) = '0'
                    THEN '+91' || right(regexp_replace(r.phone, '[^0-9]', '', 'g'), 10)
                WHEN length(regexp_replace(r.phone, '[^0-9]', '', 'g')) = 10
                    THEN '+91' || regexp_replace(r.phone, '[^0-9]', '', 'g')
                ELSE NULL
            END AS norm_phone
        FROM registrations r
        WHERE r.phone IS NOT NULL
    ) s
    WHERE norm_phone IS NOT NULL
    ORDER BY norm_phone, created_at DESC
    ON CONFLICT (phone) DO NOTHING;

    UPDATE registrations reg
    SET profile_id = p.id
    FROM profiles p
    WHERE reg.profile_id IS NULL
      AND p.phone = CASE
            WHEN length(regexp_replace(reg.phone, '[^0-9]', '', 'g')) = 12
                 AND left(regexp_replace(reg.phone, '[^0-9]', '', 'g'), 2) = '91'
                THEN '+91' || right(regexp_replace(reg.phone, '[^0-9]', '', 'g'), 10)
            WHEN length(regexp_replace(reg.phone, '[^0-9]', '', 'g')) = 11
                 AND left(regexp_replace(reg.phone, '[^0-9]', '', 'g'), 1) = '0'
                THEN '+91' || right(regexp_replace(reg.phone, '[^0-9]', '', 'g'), 10)
            WHEN length(regexp_replace(reg.phone, '[^0-9]', '', 'g')) = 10
                THEN '+91' || regexp_replace(reg.phone, '[^0-9]', '', 'g')
            ELSE NULL
        END;
END $$;


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

-- Manual check-in fallback flag.
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT false;

-- Self-service "Find my registration" rate-limit log.
CREATE TABLE IF NOT EXISTS self_service_requests (
    id         BIGSERIAL PRIMARY KEY,
    phone      TEXT,
    ip         TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS self_service_requests_phone_idx ON self_service_requests (phone, created_at DESC);
GRANT ALL ON self_service_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE self_service_requests_id_seq TO service_role;

-- Post-event feedback (rating + comment).
CREATE TABLE IF NOT EXISTS feedback (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID REFERENCES events(id) ON DELETE SET NULL,
    name       TEXT,
    phone      TEXT,
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_event_idx ON feedback (event_id, created_at DESC);
GRANT ALL ON feedback TO service_role;

-- Seva / donations (standalone contributions, HMAC-verified).
CREATE TABLE IF NOT EXISTS donations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    phone               TEXT,
    email               TEXT,
    amount              NUMERIC NOT NULL,
    message             TEXT,
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donations_status_idx ON donations(status);
GRANT ALL ON donations TO service_role;

-- Waitlist for full tiers.
CREATE TABLE IF NOT EXISTS waitlist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    status      TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'removed')),
    created_at  TIMESTAMPTZ DEFAULT now(),
    notified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS waitlist_category_idx ON waitlist(category_id);
GRANT ALL ON waitlist TO service_role;

-- Sponsors. Negotiated OFFLINE and recorded by an admin — no public form, no
-- Razorpay. Admin-only record: who sponsored, at what level, for how much.
CREATE TABLE IF NOT EXISTS sponsors (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    tier          TEXT,                       -- free text: Title / Gold / Silver / …
    amount        NUMERIC DEFAULT 0,
    logo_url      TEXT,
    contact_name  TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes         TEXT,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sponsors_event_idx ON sponsors(event_id);
GRANT ALL ON sponsors TO service_role;

-- Anonymous donations: a donor may give without their name being recorded, so
-- `name` is nullable (DROP NOT NULL is a no-op if already dropped — re-runnable).
ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE donations ALTER COLUMN name DROP NOT NULL;

-- Delivery log for every outbound transactional message (email + WhatsApp).
-- Written centrally from lib/email.js + lib/whatsapp.js, so it is complete by
-- construction. The rendered payload is stored so a failed message can be RE-SENT
-- verbatim from the admin panel without re-deriving it.
CREATE TABLE IF NOT EXISTS message_log (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    channel         TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    kind            TEXT,
    recipient       TEXT NOT NULL,
    subject         TEXT,
    body            TEXT,
    template        TEXT,
    template_params JSONB,
    image_url       TEXT,
    status          TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error           TEXT,
    registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
    metadata        JSONB
);
CREATE INDEX IF NOT EXISTS message_log_created_idx ON message_log (created_at DESC);
CREATE INDEX IF NOT EXISTS message_log_reg_idx     ON message_log (registration_id);
CREATE INDEX IF NOT EXISTS message_log_status_idx  ON message_log (status);
GRANT ALL ON message_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE message_log_id_seq TO service_role;


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


-- 6) ── Per-category field configuration ────────────────────────────────────
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


-- 7) ── Homepage: countdown, helpline, socials, schedule, highlights, guests ─
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS instagram_url TEXT,
    ADD COLUMN IF NOT EXISTS facebook_url  TEXT,
    ADD COLUMN IF NOT EXISTS youtube_url   TEXT;

CREATE TABLE IF NOT EXISTS event_schedule (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    day_label    TEXT,
    time_label   TEXT,
    title        TEXT NOT NULL,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_schedule_event_idx ON event_schedule(event_id);

CREATE TABLE IF NOT EXISTS event_highlights (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    icon           TEXT DEFAULT '🪔',
    title          TEXT NOT NULL,
    description    TEXT,
    sort_order     INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_highlights_event_idx ON event_highlights(event_id);
GRANT ALL ON event_schedule TO service_role;
GRANT ALL ON event_highlights TO service_role;

CREATE TABLE IF NOT EXISTS event_guests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    role       TEXT,
    photo_url  TEXT,
    bio        TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_guests_event_idx ON event_guests(event_id);
GRANT ALL ON event_guests TO service_role;

-- Marketing-site UX port (2026-07-19): featured guest (Leadership hero),
-- grouped highlights (pillars/blessings), and curated testimonials.
ALTER TABLE event_guests     ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE event_highlights ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'highlights';
CREATE TABLE IF NOT EXISTS event_testimonials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name         TEXT,
    location     TEXT,
    quote        TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    sort_order   INTEGER DEFAULT 0,
    translations JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_testimonials_event_idx ON event_testimonials(event_id);
GRANT ALL ON event_testimonials TO service_role;

-- Luxury-homepage replica top-ups (2026-07-19, Phase 3) — additive/optional.
ALTER TABLE event_guests     ADD COLUMN IF NOT EXISTS bullets JSONB DEFAULT '[]'::jsonb,
                             ADD COLUMN IF NOT EXISTS quote   TEXT;
ALTER TABLE event_highlights ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE event_schedule   ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories       ADD COLUMN IF NOT EXISTS tagline TEXT,
                             ADD COLUMN IF NOT EXISTS perks   JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events           ADD COLUMN IF NOT EXISTS about_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS peak_day_label TEXT,
    ADD COLUMN IF NOT EXISTS peak_day_note  TEXT,
    ADD COLUMN IF NOT EXISTS schedule_intro TEXT,
    ADD COLUMN IF NOT EXISTS schedule_days  JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS contact_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT, email TEXT, subject TEXT, message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON contact_messages TO service_role;


-- 8) ── Homepage hero image + "Plan Your Visit" (per event) ──────────────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Live stream (per event). `livestream_url` takes a YouTube link in any form
-- (normalised by lib/youtube.js) or any other provider's iframe embed URL.
-- `livestream_is_live` is the on/off switch — the homepage player and the
-- site-wide sticky banner appear only while it is true.
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS livestream_url     TEXT,
    ADD COLUMN IF NOT EXISTS livestream_is_live BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS livestream_banner  TEXT;

-- News / announcements (per event). Same shape as event_highlights/event_faqs.
CREATE TABLE IF NOT EXISTS event_news (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    body         TEXT,
    image_url    TEXT,
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMPTZ DEFAULT now(),
    sort_order   INTEGER DEFAULT 0,
    translations JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_news_event_idx ON event_news(event_id, published_at DESC);
GRANT ALL ON event_news TO service_role;

-- A news item may carry one downloadable file. Denormalised on purpose so the
-- announcement survives the library row being deleted or retitled later.
ALTER TABLE event_news
    ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Media library: one row per uploaded file, so uploads can be browsed, reused and
-- deleted instead of being orphaned in the bucket.
-- Two buckets, because visibility is a STORAGE decision, not a flag:
--   public  → `event-media` bucket, permanent public URL
--   private → `admin-docs` bucket, only via a signed URL (contracts, invoices)
CREATE TABLE IF NOT EXISTS media_library (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'document')),
    visibility   TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    bucket       TEXT NOT NULL,
    path         TEXT NOT NULL,
    url          TEXT,
    filename     TEXT,
    mime         TEXT,
    size_bytes   BIGINT,
    title        TEXT,
    description  TEXT,
    is_download  BOOLEAN DEFAULT false,
    attach_to_ticket BOOLEAN DEFAULT false,
    sort_order   INTEGER DEFAULT 0,
    event_id     UUID REFERENCES events(id) ON DELETE SET NULL,
    uploaded_by  TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_library_kind_idx     ON media_library (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS media_library_download_idx ON media_library (is_download) WHERE is_download = true;
GRANT ALL ON media_library TO service_role;

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS travel_info    TEXT;

-- Homepage "by the numbers" strip (JSONB array of {value,label}).
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '[]'::jsonb;


-- 9) ── FAQ accordion + reminder opt-ins ────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_faqs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
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


-- 9b) ── Multilingual content: translations JSONB (Phase 1) ──────────────────
-- One `translations` JSONB per row: { "hi": { "title": … }, "mr": { … } }.
-- English stays in the base columns (the fallback). Backfill is a no-op on a
-- fresh DB (no existing rows). Idempotent.
ALTER TABLE events           ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE categories       ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_schedule   ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_highlights ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_guests     ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_faqs       ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE form_fields      ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- ⚠️ Guarded on the legacy column still existing — see the matching block in
-- run_all.sql. On a fresh DB the "_hi" columns are never created, so every branch
-- below is skipped; the guard is what makes this script safe to run against a
-- pre-migration database (where it backfills) AND to re-run afterwards (where 9c
-- has already dropped the columns and an unguarded UPDATE would fail to parse).
DO $mig$
DECLARE
    legacy CONSTANT jsonb := jsonb_build_object(
        'events',           'title_hi',
        'categories',       'title_hi',
        'event_schedule',   'day_label_hi',
        'event_highlights', 'title_hi',
        'event_guests',     'name_hi',
        'event_faqs',       'question_hi',
        'form_fields',      'label_hi'
    );
    backfill CONSTANT jsonb := jsonb_build_object(
        'events', $sql$
            UPDATE events SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object(
                    'title', title_hi, 'short_description', short_description_hi, 'long_description', long_description_hi,
                    'date_time', date_time_hi, 'venue', venue_hi, 'travel_info', travel_info_hi)))
            WHERE translations->'hi' IS NULL
              AND (title_hi IS NOT NULL OR short_description_hi IS NOT NULL OR long_description_hi IS NOT NULL
                   OR date_time_hi IS NOT NULL OR venue_hi IS NOT NULL OR travel_info_hi IS NOT NULL)
        $sql$,
        'categories', $sql$
            UPDATE categories SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object(
                    'title', title_hi, 'description', description_hi, 'detailed_description', detailed_description_hi)))
            WHERE translations->'hi' IS NULL
              AND (title_hi IS NOT NULL OR description_hi IS NOT NULL OR detailed_description_hi IS NOT NULL)
        $sql$,
        'event_schedule', $sql$
            UPDATE event_schedule SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object('day_label', day_label_hi, 'title', title_hi)))
            WHERE translations->'hi' IS NULL
              AND (day_label_hi IS NOT NULL OR title_hi IS NOT NULL)
        $sql$,
        'event_highlights', $sql$
            UPDATE event_highlights SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object('title', title_hi, 'description', description_hi)))
            WHERE translations->'hi' IS NULL
              AND (title_hi IS NOT NULL OR description_hi IS NOT NULL)
        $sql$,
        'event_guests', $sql$
            UPDATE event_guests SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object('name', name_hi, 'role', role_hi, 'bio', bio_hi)))
            WHERE translations->'hi' IS NULL
              AND (name_hi IS NOT NULL OR role_hi IS NOT NULL OR bio_hi IS NOT NULL)
        $sql$,
        'event_faqs', $sql$
            UPDATE event_faqs SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object('question', question_hi, 'answer', answer_hi)))
            WHERE translations->'hi' IS NULL
              AND (question_hi IS NOT NULL OR answer_hi IS NOT NULL)
        $sql$,
        'form_fields', $sql$
            UPDATE form_fields SET translations = jsonb_set(COALESCE(translations, '{}'::jsonb), '{hi}',
                jsonb_strip_nulls(jsonb_build_object('label', label_hi)))
            WHERE translations->'hi' IS NULL
              AND label_hi IS NOT NULL
        $sql$
    );
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT k FROM jsonb_object_keys(legacy) AS k LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name   = tbl
              AND column_name  = legacy->>tbl
        ) THEN
            EXECUTE backfill->>tbl;
            RAISE NOTICE 'Backfilled translations.hi from the legacy _hi columns on %', tbl;
        END IF;
    END LOOP;
END $mig$;

-- 9c) ── Retire the legacy "_hi" columns ─────────────────────────────────────
-- The app reads/writes Hindi (and every language) only via `translations` JSONB.
-- The 9b backfill (runs first, idempotent) copied existing Hindi into
-- translations.hi, so dropping these is lossless. IF EXISTS = safe to re-run.
ALTER TABLE events           DROP COLUMN IF EXISTS title_hi,
                             DROP COLUMN IF EXISTS short_description_hi,
                             DROP COLUMN IF EXISTS long_description_hi,
                             DROP COLUMN IF EXISTS date_time_hi,
                             DROP COLUMN IF EXISTS venue_hi,
                             DROP COLUMN IF EXISTS travel_info_hi;
ALTER TABLE categories       DROP COLUMN IF EXISTS title_hi,
                             DROP COLUMN IF EXISTS description_hi,
                             DROP COLUMN IF EXISTS detailed_description_hi;
ALTER TABLE event_schedule   DROP COLUMN IF EXISTS day_label_hi,
                             DROP COLUMN IF EXISTS title_hi;
ALTER TABLE event_highlights DROP COLUMN IF EXISTS title_hi,
                             DROP COLUMN IF EXISTS description_hi;
ALTER TABLE event_guests     DROP COLUMN IF EXISTS name_hi,
                             DROP COLUMN IF EXISTS role_hi,
                             DROP COLUMN IF EXISTS bio_hi;
ALTER TABLE event_faqs       DROP COLUMN IF EXISTS question_hi,
                             DROP COLUMN IF EXISTS answer_hi;
ALTER TABLE form_fields      DROP COLUMN IF EXISTS label_hi;
ALTER TABLE page_content     DROP COLUMN IF EXISTS title_hi,
                             DROP COLUMN IF EXISTS description_text_hi;


-- 10) ── Row Level Security ──────────────────────────────────────────────────
-- registrations + profiles hold PII: RLS on, NO anon policy (service role bypasses).
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read registrations"  ON public.registrations;
DROP POLICY IF EXISTS "public insert registrations" ON public.registrations;
DROP POLICY IF EXISTS "anon all registrations"      ON public.registrations;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

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

-- Feature tables (checkpoints, form_fields, event_schedule, event_highlights,
-- event_faqs, event_reminders, donations, waitlist, feedback, etc.) are read
-- server-side via the service-role key, so they need no anon policy.

-- =============================================================================
-- Done. Create the storage buckets (qr-codes, payment-proofs), set env vars,
-- then configure the event + tiers + form fields + home content in the admin.
-- =============================================================================
