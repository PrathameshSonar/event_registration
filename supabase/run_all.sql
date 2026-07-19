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
    ADD COLUMN IF NOT EXISTS venue        TEXT,
    ADD COLUMN IF NOT EXISTS map_url      TEXT;


-- 0b) ── (retired) Hindi "_hi" columns ──────────────────────────────────────
-- Hindi (and every other language) now lives in the `translations` JSONB — see
-- 9b/9c. We deliberately do NOT re-create the legacy "_hi" columns here: 9c drops
-- them, so adding them back each run would just add-then-drop the same dead
-- columns forever. A pre-migration DB still has its "_hi" columns with data, and
-- 9b detects that and backfills before 9c drops them.


-- 1) ── Per-category attendee cap ───────────────────────────────────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS max_attendees_per_reg INTEGER DEFAULT 5;

-- Per-category age restriction (computed from the attendee's date of birth).
-- Both NULL = open to all ages. Set min_age (e.g. 14) and/or max_age to limit.
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS min_age INTEGER,
    ADD COLUMN IF NOT EXISTS max_age INTEGER;


-- 1b) ── Payment options: EMI badge + part payment (per category) ────────────
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS show_emi_badge     BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_part_payment BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS advance_percent    INTEGER DEFAULT 25,  -- % of PRICE taken as advance
    -- Show an "Enquire Now" button alongside "Pay" on a payable tier. Enquiry-only
    -- tiers (is_enquiry_only) still show only "Enquire Now". A tier may carry a
    -- price even when enquiry-only — it's charged when an admin converts the lead.
    ADD COLUMN IF NOT EXISTS allow_enquiry      BOOLEAN DEFAULT false,
    -- Highlights this tier as the "Most Chosen" / recommended option on the
    -- public ticket cards (a marketing nudge toward the mid tier).
    ADD COLUMN IF NOT EXISTS is_recommended     BOOLEAN DEFAULT false;

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

-- Names of the people in a group booking (attendees_count > 1). JSON array of
-- { name }, primary registrant first. Optional supplementary data for the gate.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS attendees        JSONB;

-- Offline payments (bank transfer / cheque / cash). The user submits proof, an
-- admin verifies, and on approval the row becomes 'completed' like an online pay.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS payment_method     TEXT,   -- 'razorpay'|'bank_transfer'|'cheque'|'cash'|'dd'
    ADD COLUMN IF NOT EXISTS offline_reference  TEXT,   -- UTR / cheque no / receipt no
    ADD COLUMN IF NOT EXISTS offline_proof_path TEXT,   -- path in the private payment-proofs bucket
    ADD COLUMN IF NOT EXISTS offline_meta       JSONB,  -- bank name, cheque date, etc.
    ADD COLUMN IF NOT EXISTS verified_by        TEXT,
    ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by_admin   BOOLEAN DEFAULT false,  -- manual walk-in entry
    -- Ticket delivery outcome (written by dispatchTicket) so failures surface in
    -- the admin ledger with a retry, instead of dying silently in server logs.
    ADD COLUMN IF NOT EXISTS ticket_email_status TEXT,     -- 'sent' | 'failed' | 'skipped'
    ADD COLUMN IF NOT EXISTS ticket_wa_status    TEXT,     -- 'sent' | 'failed' | 'skipped'
    ADD COLUMN IF NOT EXISTS ticket_sent_at      TIMESTAMPTZ;

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

-- Admin login throttle (brute-force protection). One row per client IP: too many
-- consecutive failures locks that IP out for a cooldown window. Cleared on success.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip           TEXT PRIMARY KEY,
    fail_count   INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ DEFAULT now()
);
GRANT ALL ON admin_login_attempts TO service_role;

-- Named admin / volunteer accounts. Optional layer on top of the shared-password
-- (env ADMIN_PASSWORD) login: when a user logs in with a username, we authenticate
-- against this table so the audit log records WHO acted. Passwords are
-- scrypt-hashed (salt:hash) — never stored in plaintext. 'volunteer' accounts get
-- granular access via the permissions array (RBAC checkboxes).
CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT UNIQUE NOT NULL,
    name          TEXT,
    password_hash TEXT NOT NULL,                       -- scrypt: 'salt:hash' (hex)
    role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'volunteer')),
    permissions   JSONB DEFAULT '[]'::jsonb,           -- granular access for 'volunteer' role
    active        BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now(),
    last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users (username);
GRANT ALL ON admin_users TO service_role;

-- Ensure the permissions column exists, migrate any legacy 'viewer' accounts to
-- 'volunteer' (roles are now admin/volunteer only), then (re)apply the CHECK.
-- Idempotent and safe to re-run.
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
            'payment_review', 'cheque_received', 'payment_rejected',
            -- Admin-cancelled (seat released, money record preserved, no refund).
            'cancelled'
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

-- Manual check-in fallback: gate staff can check in a Paid person whose QR won't
-- scan (dead phone / email never arrived). Marked so the log shows it was manual.
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT false;

-- Self-service "Find my registration": rate-limit log so the public lookup can't
-- be abused to spam a registrant's inbox / rack up WhatsApp cost.
CREATE TABLE IF NOT EXISTS self_service_requests (
    id         BIGSERIAL PRIMARY KEY,
    phone      TEXT,
    ip         TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS self_service_requests_phone_idx ON self_service_requests (phone, created_at DESC);
GRANT ALL ON self_service_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE self_service_requests_id_seq TO service_role;

-- Post-event feedback: attendees rate the event + leave a comment.
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

-- Seva / donations: standalone contributions (no tier/seat). Paid via Razorpay
-- and confirmed by HMAC signature verification (not seat-managed like tickets).
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

-- Waitlist: when a tier is full, interested people join here. When a seat frees
-- (refund/cancel), an admin notifies the next person with a registration link.
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

-- Sponsors. Sponsorship deals are negotiated OFFLINE and recorded by an admin —
-- there is no public sponsor form and no Razorpay flow (a company committing
-- ₹1,00,000 does not self-serve through a checkout). Admin-only: sponsors are not
-- rendered on the public site today, so this is purely the internal record of who
-- sponsored, at what level, for how much, and who to call.
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

-- Anonymous donations: a donor may give without their name being recorded. `name`
-- was NOT NULL, so it has to become nullable — DROP NOT NULL is a no-op if it has
-- already been dropped, which keeps this re-runnable.
ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE donations ALTER COLUMN name DROP NOT NULL;

-- Delivery log for every outbound transactional message (email + WhatsApp).
-- Written centrally from lib/email.js + lib/whatsapp.js, so it is complete by
-- construction — a new send site is logged without touching this table.
-- The rendered payload (subject/body, or template + params) is stored so a failed
-- message can be RE-SENT verbatim from the admin panel without re-deriving it.
CREATE TABLE IF NOT EXISTS message_log (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    channel         TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    kind            TEXT,                       -- 'ticket' | 'qr' | 'balance_link' | 'cancellation' | …
    recipient       TEXT NOT NULL,              -- email address or phone
    subject         TEXT,                       -- email only
    body            TEXT,                       -- rendered HTML (email) / text (WhatsApp free-form)
    template        TEXT,                       -- WhatsApp template name
    template_params JSONB,                      -- WhatsApp template body params
    image_url       TEXT,                       -- WhatsApp image sends (the QR pass)
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
    ADD COLUMN IF NOT EXISTS end_at   TIMESTAMPTZ;   -- event end (for a correct multi-day "Add to Calendar")

-- Contact phone / email / address + social links now live in app_settings
-- (key 'contact') — see lib/appSettings.js. Drop the legacy event columns; any old
-- values are intentionally discarded. Re-running is safe (IF EXISTS is a no-op once
-- dropped). contact_email was only ever on `sponsors`, so it is not touched here.
ALTER TABLE events
    DROP COLUMN IF EXISTS contact_phone,
    DROP COLUMN IF EXISTS instagram_url,
    DROP COLUMN IF EXISTS facebook_url,
    DROP COLUMN IF EXISTS youtube_url;

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

-- Guest / artist / saint lineup shown on the home page (admin-managed per event).
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

-- Marketing-site UX port (2026-07-19):
--   event_guests.is_featured   → render one guest as a prominent "Leadership" hero
--                                 (e.g. Guruji) above the normal lineup grid.
--   event_highlights.section   → group highlight cards into distinct homepage
--                                 sections: 'highlights' (default), 'pillars'
--                                 (Puja/Gyan/Bhakti), 'blessings' (benefits grid).
ALTER TABLE event_guests     ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE event_highlights ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'highlights';

-- Curated testimonials / devotee quotes shown on the homepage. Marketing copy
-- (not the post-event `feedback` table), so it works before any feedback exists.
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

-- Luxury-homepage replica top-ups (2026-07-19, Phase 3). All additive/optional:
--   event_guests.bullets/quote → the "Leadership/Guruji" hero shows a bullet list
--                                 + a pull-quote.
--   event_highlights.image_url → pillar/highlight cards can carry an image.
--   event_schedule.description → each schedule item shows a one-line detail.
--   categories.tagline/perks   → tier cards show a tagline + a perks bullet list.
--   events.about_images        → the "About Mahayagya" bento image grid.
ALTER TABLE event_guests     ADD COLUMN IF NOT EXISTS bullets JSONB DEFAULT '[]'::jsonb,
                             ADD COLUMN IF NOT EXISTS quote   TEXT;
ALTER TABLE event_highlights ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE event_schedule   ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories       ADD COLUMN IF NOT EXISTS tagline TEXT,
                             ADD COLUMN IF NOT EXISTS perks   JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events           ADD COLUMN IF NOT EXISTS about_images JSONB DEFAULT '[]'::jsonb;

-- Phase 9 homepage parity (peak-day highlight + schedule intro/per-day themes).
--   peak_day_label / peak_day_note → the "Pramukh Din" highlight card (translatable
--     via translations, like other event text).
--   schedule_intro → paragraph shown above the schedule preview (translatable).
--   schedule_days → per-day metadata keyed to day_label: [{label,date,theme}].
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS peak_day_label TEXT,
    ADD COLUMN IF NOT EXISTS peak_day_note  TEXT,
    ADD COLUMN IF NOT EXISTS schedule_intro TEXT,
    ADD COLUMN IF NOT EXISTS schedule_days  JSONB DEFAULT '[]'::jsonb;

-- Contact-form submissions from the public /contact page.
CREATE TABLE IF NOT EXISTS contact_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT,
    email      TEXT,
    subject    TEXT,
    message    TEXT,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
GRANT ALL ON contact_messages TO service_role;


-- 8) ── Homepage hero background image (per event) ──────────────────────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- 8b) ── Live stream (per event) ────────────────────────────────────────────
-- `livestream_url` accepts a YouTube link in ANY form (watch / youtu.be / embed /
-- shorts / bare id — normalised by lib/youtube.js) OR any other provider's iframe
-- embed URL, which is used as-is. `livestream_is_live` is the on/off switch: the
-- homepage player + the site-wide sticky banner appear ONLY while it is true, so
-- an admin can stage the URL in advance and go live with one toggle.
-- `livestream_banner` is the optional line shown in the banner (translatable via
-- events.translations, like every other event text field).
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS livestream_url     TEXT,
    ADD COLUMN IF NOT EXISTS livestream_is_live BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS livestream_banner  TEXT;

-- 8c) ── News / announcements (per event) ───────────────────────────────────
-- Short updates shown on the homepage ("parking details", "guest lineup
-- announced"). Same shape as event_highlights / event_faqs: per-event rows,
-- English in the base columns, other languages in `translations`.
-- `is_published` lets an admin draft an item before it appears publicly.
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

-- A news item may carry one downloadable file (e.g. "Parking details 📄 PDF").
-- Denormalised on purpose: the URL + display name are copied from the library at
-- attach time, so the announcement keeps working even if the library row is later
-- deleted or retitled.
ALTER TABLE event_news
    ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 8d) ── Media library ───────────────────────────────────────────────────────
-- One row per uploaded file. Before this, uploads went straight to storage and
-- ONLY the returned URL was kept on whatever row was being edited — so nothing
-- could be browsed, reused, or deleted, and every replaced file was orphaned in
-- the bucket forever. This table is the index that makes those possible.
--
-- Two buckets, because visibility is a STORAGE decision, not a flag:
--   visibility='public'  → public `event-media` bucket, permanent public URL.
--   visibility='private' → private `admin-docs` bucket, reachable ONLY via a
--                          short-lived signed URL from /api/admin/media-file/[id].
--   A signed contract or vendor invoice must never sit behind a permanent public
--   URL, so it is NOT enough to just hide it in the UI.
-- `path` is the storage object key — required to delete the file and to sign it.
CREATE TABLE IF NOT EXISTS media_library (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'document')),
    visibility   TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    bucket       TEXT NOT NULL,
    path         TEXT NOT NULL,          -- object key inside the bucket
    url          TEXT,                   -- public URL; NULL for private files
    filename     TEXT,                   -- original filename, for display + download
    mime         TEXT,
    size_bytes   BIGINT,
    title        TEXT,                   -- admin-editable label
    description  TEXT,
    -- Public documents flagged here appear in the homepage "Downloads" section.
    is_download  BOOLEAN DEFAULT false,
    -- Public documents flagged here are attached to the ticket-confirmation email.
    attach_to_ticket BOOLEAN DEFAULT false,
    sort_order   INTEGER DEFAULT 0,
    event_id     UUID REFERENCES events(id) ON DELETE SET NULL,
    uploaded_by  TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_library_kind_idx     ON media_library (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS media_library_download_idx ON media_library (is_download) WHERE is_download = true;
GRANT ALL ON media_library TO service_role;
-- The private `admin-docs` bucket is created automatically on the first private
-- upload (same as `event-media`) — no manual Storage step needed.

-- "Plan Your Visit" — how to reach / parking / accommodation, shown on the
-- homepage near the venue map. Optional; translated via `translations`.
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS travel_info    TEXT;

-- Homepage "by the numbers" strip: an ordered JSONB array of {value,label}
-- (e.g. [{"value":"36+","label":"Homa Kundas"},{"value":"5,000+","label":"Devotees"}]).
-- Free text so values like "36+" / "3 Days" render as-is. Empty = section hidden.
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


-- 9b) ── Multilingual content: translations JSONB (Phase 1 — non-breaking) ────
-- Scalable i18n for admin-entered content. Instead of a "_xx" column per field
-- per language, each row carries ONE `translations` JSONB:
--     { "hi": { "title": "…", "venue": "…" }, "mr": { … } }
-- English stays in the base columns (the fallback). THIS phase only adds the
-- column and copies existing Hindi into translations.hi — nothing reads it yet,
-- so it is fully non-breaking (the app still uses the "_hi" columns). Idempotent:
-- only backfills rows whose translations.hi isn't set, so it won't clobber edits.
ALTER TABLE events           ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE categories       ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_schedule   ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_highlights ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_guests     ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE event_faqs       ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE form_fields      ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- ⚠️ These backfills MUST be guarded on the legacy column still existing.
-- Section 9c below DROPs the "_hi" columns, and only events/categories/page_content
-- get theirs re-created by an ADD COLUMN IF NOT EXISTS earlier in this script — the
-- other five tables declare theirs inside CREATE TABLE IF NOT EXISTS, which is a
-- no-op once the table exists. So on a second run those columns are gone for good,
-- and an unguarded `UPDATE ... SET x = day_label_hi` fails to even parse.
-- Each table's "_hi" columns are dropped together in one ALTER, so checking one
-- representative column per table is enough. Runs the backfill on a pre-migration
-- DB, skips silently on an already-migrated one.
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
-- The app now reads/writes Hindi (and every other language) exclusively via the
-- `translations` JSONB above. The Hindi in the old "_hi" columns was copied into
-- translations.hi by the idempotent backfill in 9b (which runs first and skips
-- rows already migrated), so dropping them here is lossless. IF EXISTS keeps this
-- safe to re-run even after the columns are gone.
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
-- page_content is legacy/unused by the app; drop its Hindi columns too.
ALTER TABLE page_content     DROP COLUMN IF EXISTS title_hi,
                             DROP COLUMN IF EXISTS description_text_hi;


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
