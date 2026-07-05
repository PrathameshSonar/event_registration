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


-- 1b) ── Payment options: EMI badge + part payment (per category) ────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS show_emi_badge     BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_part_payment BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS advance_percent    INTEGER DEFAULT 25,  -- % of PRICE taken as advance
    -- Show an "Enquire Now" button alongside "Pay" on a payable tier. Enquiry-only
    -- tiers (is_enquiry_only) still show only "Enquire Now". A tier may carry a
    -- price even when enquiry-only — it's charged when an admin converts the lead.
    ADD COLUMN IF NOT EXISTS allow_enquiry      BOOLEAN DEFAULT false;

-- Part-payment ledger on each registration.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS amount_paid      NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_due       NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_plan     TEXT DEFAULT 'full',  -- 'full' | 'partial'
    ADD COLUMN IF NOT EXISTS balance_link_url TEXT,
    -- Razorpay payment-link id (plink_xxx) for the balance link, so admins can
    -- re-verify ("Sync") a balance payment against Razorpay if the webhook is
    -- missed or not configured.
    ADD COLUMN IF NOT EXISTS balance_link_id  TEXT;

-- Tracks when the QR entry pass was last sent to a registration. NULL = never
-- sent. Used so admins can send only to people who haven't received their pass
-- yet, without re-messaging those who already have one.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS qr_sent_at       TIMESTAMPTZ;

-- Offline payments (bank transfer / cheque / cash). The user submits proof, an
-- admin verifies, and on approval the row becomes 'completed' like an online pay.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_method     TEXT,   -- 'razorpay'|'bank_transfer'|'cheque'|'cash'|'dd'
    ADD COLUMN IF NOT EXISTS offline_reference  TEXT,   -- UTR / cheque no / receipt no
    ADD COLUMN IF NOT EXISTS offline_proof_path TEXT,   -- path in the private payment-proofs bucket
    ADD COLUMN IF NOT EXISTS offline_meta       JSONB,  -- bank name, cheque date, etc.
    ADD COLUMN IF NOT EXISTS verified_by        TEXT,
    ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ;

-- Global key/value app config (e.g. the bank/UPI/cheque details shown to users
-- for offline payments). Read server-side via the service role.
CREATE TABLE IF NOT EXISTS app_settings (
    key        VARCHAR PRIMARY KEY,
    value      JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON app_settings TO service_role;
-- Offline payment PROOFS are uploaded to a PRIVATE Supabase Storage bucket named
-- "payment-proofs" — create it once: Dashboard → Storage → New Bucket (private).

-- Audit trail of mutating admin actions (status edits, sends, create/update/
-- delete of events/tiers/media/etc). actor_id/actor_label are reserved for when
-- RBAC introduces real per-user identities; today only actor_role is populated.
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_role  TEXT NOT NULL,              -- 'admin' | 'viewer' (today)
    actor_id    UUID,                       -- reserved for RBAC user identity
    actor_label TEXT,                       -- reserved: name/email when RBAC exists
    action      TEXT NOT NULL,              -- e.g. 'registration.status_change'
    entity      TEXT,                       -- 'registration' | 'event' | 'category' | ...
    entity_id   TEXT,
    summary     TEXT,                       -- human-readable one-liner for the UI
    metadata    JSONB,                      -- structured detail (e.g. {from,to})
    ip          TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity     ON admin_audit_logs (entity);

-- The app reads/writes this table with the service-role key, which respects
-- table GRANTs. Without these, SELECT/INSERT silently fail (audit appears empty).
-- BIGSERIAL also needs the sequence grant so inserts can get the next id.
GRANT ALL ON admin_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE admin_audit_logs_id_seq TO service_role;

-- Contact-history log for the enquiry leads pipeline: admins append a timestamped
-- note each time they follow up, so the next contact has context. One row per note.
CREATE TABLE IF NOT EXISTS registration_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    note            TEXT NOT NULL,
    actor_role      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_notes_reg_idx ON registration_notes(registration_id);
GRANT ALL ON registration_notes TO service_role;

-- registrations.payment_status uses a new value 'advance_paid'. If a CHECK
-- constraint limits the allowed values, this rebuilds it to include the full
-- set. (No-op safe: drops the named constraint only if it exists, then adds it.)
-- If your status column has NO check constraint, this block simply creates one
-- that permits all the values the app uses.
DO $$
BEGIN
    ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_payment_status_check;
    ALTER TABLE registrations
        ADD CONSTRAINT registrations_payment_status_check
        CHECK (payment_status IN (
            'pending', 'completed', 'failed', 'refunded',
            'enquired', 'contacted', 'amount_mismatch', 'advance_paid',
            -- Enquiry pipeline: link sent & awaiting payment, and closed/lost lead.
            'awaiting_payment', 'closed',
            -- Offline payments: proof submitted / cheque in hand / proof rejected.
            'payment_review', 'cheque_received', 'payment_rejected'
        ));
EXCEPTION
    -- If existing rows hold a status outside this set, skip rather than fail
    -- the whole migration; widen the list above and re-run if needed.
    WHEN check_violation THEN
        RAISE NOTICE 'payment_status constraint not applied — existing rows have other values. Review and re-run.';
END $$;


-- 1c) ── Canonical user profiles (one row per person, keyed by phone) ────────
-- A clean, reusable user identity separate from event-specific registrations.
-- Phone is stored E.164 (+91XXXXXXXXXX) and is unique. The app upserts a
-- profile by phone on every registration; registrations link via profile_id.
CREATE TABLE IF NOT EXISTS profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone         TEXT UNIQUE NOT NULL,   -- E.164, e.g. +919876543210
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
    verified_at   TIMESTAMPTZ,            -- set when the phone is OTP-verified (future)
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS registrations_profile_id_idx ON registrations(profile_id);

GRANT ALL ON profiles TO service_role;

-- One-time backfill: create one profile per unique normalized phone from
-- existing registrations (keeping each person's MOST RECENT details), then
-- link the registrations. Safe to re-run: ON CONFLICT DO NOTHING + only links
-- rows that aren't linked yet.
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
-- registrations + profiles hold PII: enable RLS with NO anon policy (service role bypasses).
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
