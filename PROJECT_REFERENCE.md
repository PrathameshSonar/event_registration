# BaglaBhairav Event Registration — Master Reference

> **Single source of truth for this project.** Read this before changing code. It covers every feature, the data model, every API route, the payment/reconciliation engine, the admin panel, operations, and gotchas.
>
> **⚠️ KEEP THIS UPDATED.** Whenever a feature, route, column, env var, or flow changes, update the relevant section **and** the Changelog at the bottom. This file is meant to stay accurate.
>
> Last updated: 2026-07-19.

---

## Table of Contents
1. [What this app is](#1-what-this-app-is)
2. [Tech stack](#2-tech-stack)
3. [Setup & local dev](#3-setup--local-dev)
4. [Environment variables](#4-environment-variables)
5. [Directory map](#5-directory-map)
6. [Database schema](#6-database-schema)
7. [Core architecture & principles](#7-core-architecture--principles)
8. [Payment system (full detail)](#8-payment-system-full-detail)
9. [Reconciliation (Layers 1 & 2)](#9-reconciliation-layers-1--2)
10. [QR entry passes, scanner & check-ins](#10-qr-entry-passes-scanner--check-ins)
11. [Admin dashboard](#11-admin-dashboard)
12. [Audit logging](#12-audit-logging)
13. [Dynamic form fields](#13-dynamic-form-fields)
14. [Profiles (canonical users)](#14-profiles-canonical-users)
15. [Internationalisation (EN/HI)](#15-internationalisation-enhi)
16. [Public pages](#16-public-pages)
17. [Full API reference](#17-full-api-reference)
18. [lib/ modules](#18-lib-modules)
19. [Components](#19-components)
20. [Payment status lifecycle](#20-payment-status-lifecycle)
21. [Operations runbook & gotchas](#21-operations-runbook--gotchas)
22. [Deploy checklist](#22-deploy-checklist)
23. [Changelog](#23-changelog)

---

## 1. What this app is

A bilingual (English/Hindi) event registration + ticketing platform for **BaglaBhairav Mahotsav**. Visitors pick a ticket tier, fill a configurable form, and pay via **Razorpay** (full payment, or part-payment with an advance + later balance link). Paid registrants receive a **QR entry pass** (email + WhatsApp); event staff scan it at multiple checkpoints. An **admin dashboard** manages everything (events, tiers, media, form fields, registrations, payments, audit trail). Some tiers are **enquiry-only** (no payment — contact via WhatsApp).

Single active event at a time (`events.is_active = true`); past events can be shown in an archive.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.9** (App Router, Server Components, Route Handlers) — ⚠️ see `AGENTS.md`: APIs differ from older Next; check `node_modules/next/dist/docs/` before using unfamiliar APIs |
| Runtime | React 19.2 |
| Language | TypeScript (pages) + JS (most routes/components/libs) |
| DB | **Supabase** (Postgres) — anon client for public reads, service-role client server-side |
| Payments | **Razorpay** (Orders + Payment Links + Webhooks) |
| Email | **ZeptoMail** (HTTP API) — isolated in `lib/email.js`; provider-neutral callers |
| WhatsApp | **WhatsApp Cloud API** (Meta) — template messages |
| UI | Tailwind CSS v4 + **MUI v9** (form inputs) + **lucide-react** icons |
| QR | `qrcode` (generation), `html5-qrcode` (scanner) |
| Auth | Custom JWT session via `jose`, signed cookie (admin/viewer) |
| Hosting | Vercel (Hobby/Pro), cron via `vercel.json` |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint` (eslint).

---

## 3. Setup & local dev

1. `npm install`
2. Copy `.env.example` → `.env.local`, fill values (see §4).
3. Run **`supabase/run_all.sql`** in the Supabase SQL Editor (idempotent; safe to re-run). This creates/patches every table, column, index, RLS policy, and **GRANTs to `service_role`**.
4. Supabase → Storage → create a **private** bucket named **`qr-codes`**.
5. Razorpay → enable EMI + Payment Links; create a webhook (see §21).
6. `npm run dev` → http://localhost:3000. Admin at `/admin`, scanner at `/scan`.

---

## 4. Environment variables

All in `.env.example`. `NEXT_PUBLIC_*` are exposed to the browser; everything else is server-only.

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public base URL; builds QR `/entry` links + Razorpay callbacks |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase client (reads only) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Full DB access, bypasses RLS |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies webhook HMAC signature |
| `EMAIL_API_KEY` / `EMAIL_FROM` | Email sending. `EMAIL_API_KEY` = ZeptoMail Send Mail Token; `EMAIL_FROM` = verified-domain sender. **Provider-neutral** — isolated in [lib/email.js](lib/email.js). Optional `EMAIL_API_URL` overrides the DC endpoint (defaults to India `.in`). Legacy `RESEND_API_KEY` / `RESEND_FROM` still read as a fallback. |
| `WHATSAPP_API_URL` / `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API (optional) |
| `SCANNER_PIN` | PIN for `/scan` staff |
| `SESSION_SECRET` | Signs admin session JWT (`openssl rand -base64 32`) |
| *(no admin password in env)* | Admins are named `admin_users` rows (scrypt-hashed). Bootstrap/recover with `npm run create-admin`. |
| `CRON_SECRET` | Auth for `/api/cron/reconcile` (Bearer). **Required or cron 401s** |
| `RECONCILE_WINDOW_DAYS` | Optional; reconcile look-back window (default 30) |

---

## 5. Directory map

```
app/
  page.tsx                     Home (server) → components/HomeContent
  layout.tsx                   Root layout (LanguageProvider, fonts)
  register/[id]/page.js        Registration page for a category → RegisterPageContent → CheckoutForm
  entry/[id]/page.tsx          Public QR verification page (VALID/INVALID)
  scan/page.tsx                Staff scanner (PIN → checkpoint → camera)
  admin/page.tsx               Admin dashboard (4 tabs) — the biggest file (~1100 lines)
  previous-events/page.tsx     Archived events
  pitham/page.tsx              Static info page
  terms/ privacy/ refund/      Legal pages
  api/
    razorpay/route.js          POST: create order + pending registration (server-priced)
    enquiry/route.js           POST: enquiry-only registration (no payment)
    webhook/razorpay/route.js  POST: Razorpay webhook (captured/link.paid/failed/refund)
    cron/reconcile/route.js    GET/POST: scheduled reconciliation (Layer 2)
    form-fields/route.js       GET: active fields for a category (public)
    reminders/route.js         POST: reminder opt-in (public)
    checkpoints/route.js       GET: active checkpoints (public, for scanner)
    checkin/[id]/route.js      POST: record a scan at a checkpoint
    checkin/verify-pin/route.js POST: validate scanner PIN
    admin/
      login/ logout/           Session create/destroy
      data/route.js            GET: all dashboard data (registrations/categories/events/media)
      registrations/route.js   PATCH: change status (locked for terminal states) / edit fields
      cancel-registration/route.js POST: cancel a registration (ADMIN ONLY, reason required, never refunds)
      categories/route.js      POST/PATCH/DELETE: ticket tiers
      events/route.js          POST/PATCH/DELETE: events (+ set active)
      media/ highlights/ faqs/ schedule/  CRUD for event content
      form-fields/route.js     GET/POST/PATCH/DELETE: form field catalog + per-category settings
      checkpoints/route.js     GET/POST/PATCH/DELETE: checkpoints
      reminders/route.js       GET: reminder opt-ins (export)
      send-qr/route.js         POST: generate + send QR passes (email + WhatsApp), stamp qr_sent_at
      qr/[id]/route.js         GET: download a QR PNG (completed only)
      resend-balance/route.js  POST: re-send balance payment link
      reconcile-balance/route.js POST: admin "Sync payment" (re-check Razorpay)
      audit-logs/route.js      GET: read the audit trail
components/                    See §19
lib/                          See §18
lib/lang/{en,hi}.js           Translation dictionaries
supabase/run_all.sql          The ONE migration file (idempotent)
vercel.json                   Cron schedule
```

---

## 6. Database schema

Run via `supabase/run_all.sql`. Key tables:

### `events`
Active-event model. Columns: `id, title, title_hi, short_description(+_hi), long_description(+_hi), date_time(+_hi), venue(+_hi), map_url, start_at, contact_phone, hero_image_url, is_active, show_in_archive, created_at`.

### `categories` (ticket tiers)
`id, event_id→events, title(+_hi), description(+_hi), detailed_description(+_hi), price, media_url, is_full, is_enquiry_only, allow_enquiry (also show "Enquire Now" on a paid tier), max_capacity, show_availability, max_attendees_per_reg (default 5, ceiling 20), show_emi_badge, allow_part_payment, advance_percent (% of PRICE taken as advance, default 25), min_age / max_age (per-tier age limit; both null = open to all — enforced from the DOB via [lib/age.js](lib/age.js) on client + all submit routes)`.

### `registrations` (the ledger — one row per registration attempt)
- Identity: `id, profile_id→profiles, full_name, salutation, first_name, last_name, gotra, gender, date_of_birth, email, phone, pincode, taluka, state, problem_samasya`
- Custom answers: `custom_fields jsonb`
- Counts/money: `attendees_count, donation_amount, total_amount`
- **Part-payment ledger:** `amount_paid, amount_due, payment_plan ('full'|'partial'), balance_link_url, balance_link_id (Razorpay plink_xxx)`
- Razorpay: `razorpay_order_id, razorpay_payment_id`
- QR: `qr_sent_at (NULL = never sent)`
- Cancellation: `cancelled_at, cancellation_reason` (admin cancel; money columns deliberately untouched — see §11)
- Status: `payment_status` (see §20), `created_at`
- CHECK constraint allows: `pending, completed, failed, refunded, enquired, contacted, amount_mismatch, advance_paid, awaiting_payment, closed, payment_review, cheque_received, payment_rejected, cancelled`

### `profiles` (canonical user, keyed by E.164 phone)
`id, phone UNIQUE, email, salutation, first_name, last_name, full_name, gotra, gender, date_of_birth, pincode, taluka, state, verified_at, created_at, updated_at`. Upserted on every registration; registrations link via `profile_id`.

### `checkpoints` / `checkins`
`checkpoints(id, name, sort_order, is_active)`. `checkins(id, registration_id→reg, checkpoint_id→checkpoint, scanned_at)` — one row per scan (full audit trail; duplicates allowed and detected).

### `form_fields` / `category_field_settings`
Catalog of registration fields + per-category visibility/required/order. See §13.

### `event_schedule` / `event_highlights` / `event_guests` / `event_faqs` / `event_reminders` / `event_media` / `event_testimonials`
Homepage content per event (programme, ritual cards, **guest/artist lineup**, FAQ accordion, reminder opt-ins, gallery image/YouTube, **curated testimonials**). `event_guests`: `name, role, photo_url, bio, sort_order, is_featured` (a featured guest renders as the "Leadership" hero). `event_highlights` has a `section` column (`highlights`/`pillars`/`blessings`) grouping cards into distinct homepage blocks. `event_testimonials`: `name, location, quote, is_published, sort_order, translations` — curated marketing quotes (NOT the post-event `feedback` table). `events.stats` is a JSONB `[{value,label}]` for the homepage "by the numbers" strip. `categories.is_recommended` marks the "Most Chosen" tier. All need `GRANT ALL ... TO service_role`.

### `registration_notes`
Contact-history log for the enquiry pipeline: `id, registration_id→registrations (cascade), note, actor_role, created_at`. One row per note. Needs `GRANT ALL ... TO service_role`.

### `media_library`
Index of every uploaded file: `id, kind ('image'|'document'), visibility ('public'|'private'), bucket, path, url, filename, mime, size_bytes, title, description, is_download, attach_to_ticket, sort_order, event_id, uploaded_by, created_at`. See §19b. **Two buckets** — public `event-media`, private `admin-docs`. Needs `GRANT ALL ... TO service_role`.

### `event_news`
Homepage announcements for an event: `id, event_id→events, title, body, image_url, is_published (draft/live), published_at, sort_order, translations jsonb, created_at`. Same shape as `event_highlights` / `event_faqs`. Only `is_published = true` rows reach the public page. Needs `GRANT ALL ... TO service_role`.

### Live stream (columns on `events`)
`livestream_url` (a YouTube link in **any** form — normalised by [lib/youtube.js](lib/youtube.js) — **or** any other provider's iframe embed URL, used as-is), `livestream_is_live` (the on/off switch), `livestream_banner` (optional line for the sticky bar, translatable via `events.translations`). See §16b.

### `sponsors`
Admin-recorded sponsorship deals: `id, event_id→events, name, tier (free text: Title/Gold/…), amount, logo_url, contact_name, contact_phone, contact_email, notes, sort_order, created_at`. Negotiated **offline** — no public form, no Razorpay — and **not rendered on the public site**. Needs `GRANT ALL ... TO service_role`.

### `message_log`
Delivery trail for every outbound email + WhatsApp: `id BIGSERIAL, created_at, channel ('email'|'whatsapp'), kind, recipient, subject, body, template, template_params jsonb, image_url, status ('sent'|'failed'), error, registration_id→registrations, metadata jsonb`. See §12b. **Needs `GRANT ALL ... TO service_role` + the sequence grant** (BIGSERIAL).

### `app_settings`
Global key/value config: `key (PK), value jsonb, updated_at`. Currently the `bank_details` row (offline payment account/UPI/payee/instructions + enabled methods). Needs `GRANT ALL ... TO service_role`. Registrations also gained offline columns: `payment_method, offline_reference, offline_proof_path, offline_meta, verified_by, verified_at`. Proof files live in the private **`payment-proofs`** storage bucket.

### `admin_audit_logs`
`id BIGSERIAL, created_at, actor_role, actor_id (RBAC-reserved), actor_label (RBAC-reserved), action, entity, entity_id, summary, metadata jsonb, ip`. See §12. **Needs `GRANT ALL ... TO service_role` + sequence grant** (in run_all.sql).

### `page_content`
Generic homepage text blocks (`title_hi`, `description_text_hi`).

**RLS:** `registrations` + `profiles` have RLS with NO anon policy (PII; only service-role reaches them). `categories/events/event_media/page_content` allow anon SELECT. Feature tables are read server-side via service-role and need no anon policy. **Every server-written table is explicitly `GRANT`ed to `service_role` in run_all.sql** — forgetting this = silent insert/select failures.

---

## 7. Core architecture & principles

- **Server-authoritative pricing.** The browser sends only *who* and *which category*; the server looks up the price from the DB and computes the amount. A tampered client can never change what it pays. ([app/api/razorpay/route.js](app/api/razorpay/route.js))
- **Two Supabase clients.** `lib/supabase.js` (anon, public reads) and `lib/supabaseAdmin.js` (service-role, server-only, bypasses RLS). PII tables are only reachable via service-role.
- **Auth = role-only sessions.** A signed JWT cookie (`jose`) holds `{ role: 'admin' | 'viewer' }` — no per-user identity yet. RBAC is planned; audit records reserve `actor_id`/`actor_label`. ([lib/adminSession.js](lib/adminSession.js), [lib/adminGuard.js](lib/adminGuard.js))
- **Webhooks are the money truth in real time; reconciliation is the safety net.** See §8–9.
- **Single source of truth for money transitions:** [lib/payments.js](lib/payments.js). Webhook, admin Sync, and cron all funnel through it — never duplicate money logic.
- **Idempotent migration:** all schema lives in one re-runnable `supabase/run_all.sql`.

---

## 8. Payment system (full detail)

### Order creation — [app/api/razorpay/route.js](app/api/razorpay/route.js) `POST`
1. Validates terms, required fields (+ admin-configured fields via `validateSubmission`), phone (Indian 10-digit), email, DOB not future.
2. Rate-limit: blocks duplicate `pending` orders for same email+category within 3 min (429).
3. Looks up category authoritatively. Rejects enquiry-only / full categories.
4. Capacity enforcement: counts seats taken (`completed/contacted/enquired/advance_paid`) vs `max_capacity`.
5. Computes amounts:
   - `totalAmount = price + donation`
   - Part-payment (`paymentPlan==='partial'` **and** `category.allow_part_payment`): `advanceAmount = round(price × advance_percent/100)` (**advance is on PRICE only, never the donation**); `chargeNow = advanceAmount`; `amount_due = total − advance` (rest of price + full donation).
   - Full: `chargeNow = totalAmount`, `amount_due = 0`.
6. Creates Razorpay **order** for `chargeNow` (paise).
7. Upserts the **profile** (by phone) → `profile_id`.
8. Inserts a **`pending`** registration (source of truth) with `razorpay_order_id`.
9. Returns `{ orderId, amount, currency, keyId, partial, advanceAmount, balanceAmount }`. The browser opens Razorpay Checkout.

### Checkout UI — [components/CheckoutForm.js](components/CheckoutForm.js)
- Renders dynamic fields, donation, attendee count, part-payment toggle.
- On submit (paid): shows a **full-screen "Opening secure payment gateway…" loader** (while creating order + loading Razorpay script, before the modal appears) + button spinner.
- On success: shows a **success screen** with all details + a **Download Receipt** button (canvas-rendered PNG: name, email, mobile, gotra, category, attendees, status, amounts, order/payment ref, date).
- Enquiry path posts to `/api/enquiry` (no gateway).

### Webhook — [app/api/webhook/razorpay/route.js](app/api/webhook/razorpay/route.js) `POST`
Verifies HMAC signature (`RAZORPAY_WEBHOOK_SECRET`, constant-time). Handles:
- **`payment.captured`** → looks up reg by `razorpay_order_id` → `finalizeOrderCapture()`. (No match = likely a balance-link payment; acknowledged.)
- **`payment_link.paid`** → looks up reg by `notes.registration_id` (or `reference_id` `bal_<id>`) → `finalizeBalancePaid()`.
- **`payment.failed`** → set `failed` **only if still `pending`** (never overwrites a completed/advance row).
- **`refund.processed`** → set `refunded` by `razorpay_payment_id`.

### The money rules — [lib/payments.js](lib/payments.js)
- `finalizeOrderCapture({reg, capturedPaise, paymentId})`:
  - Idempotent (skips `completed`/`advance_paid`).
  - **Amount assertion (Layer 1):** flags `amount_mismatch` **only on a SHORTFALL** (`captured < expected − ₹1`). Equal/over is fine — with "customer fee bearer" the customer pays order + fee, so `payment.amount` legitimately comes back higher. Standard fees are deducted at settlement and don't affect `payment.amount`.
  - Partial → `advance_paid` + `sendBalanceLink()`. Full → `completed` + `dispatchTicket()`.
- `finalizeBalancePaid({reg, capturedPaise, paymentId})`: shortfall assertion → `completed` (`amount_paid = total`, `amount_due = 0`) + ticket.
- `sendBalanceLink(reg)`: creates a Razorpay Payment Link for `amount_due` (`reference_id = bal_<regId>`, `notes.registration_id`), stores `balance_link_url` + `balance_link_id`, and emails/WhatsApps the link.
- `dispatchTicket(reg, paymentId)` lives in [lib/ticket.js](lib/ticket.js): the "Registration Confirmed" email + WhatsApp template. (QR pass is sent separately.)

### Balance link — re-send vs copy
- **Re-send** [app/api/admin/resend-balance/route.js](app/api/admin/resend-balance/route.js): re-sends (or freshly creates) the balance link for an `advance_paid` reg by **email + WhatsApp**; stores `balance_link_url`/`balance_link_id`. Row action = the ₹ button.
- **Copy** [app/api/admin/balance-link/route.js](app/api/admin/balance-link/route.js): returns the link (creating one via `ensureBalanceLink()` if missing) **without notifying the customer**, so the admin can paste it manually when the WhatsApp/email didn't arrive. Row action = the Copy button; also the **Copy link** button in the detail modal.

---

## 9. Reconciliation (Layers 1 & 2)

Goal: DB matches Razorpay's reality; no silent under-recording or underpayment.

- **Layer 1 — amount assertion** (in the finalizers above): every capture is checked; a shortfall → `amount_mismatch` (status is locked, no ticket, surfaced via the **Amount Mismatch** section tab in admin). Over/equal is accepted.
- **Layer 2 — batch reconcile** — shared helper [lib/reconcileBatch.js](lib/reconcileBatch.js) `reconcileBatch()` walks `pending` / `advance_paid` / `amount_mismatch` / `awaiting_payment` rows (oldest-open first, `batch 100`) and calls `reconcileRegistrationWithRazorpay()`:
  - `pending`/`amount_mismatch` → fetch the order's payments; a captured payment → `finalizeOrderCapture` (heals missed webhooks; re-evaluates wrongly-flagged mismatches; genuine shortfalls stay flagged).
  - `advance_paid` → fetch the balance link (by `balance_link_id` or `reference_id`); if paid → `finalizeBalancePaid`.
  - Writes one audit entry when it changes anything (action `reconcile.cron` or `reconcile.manual`).
  - Two triggers, same helper: **scheduled cron** [app/api/cron/reconcile/route.js](app/api/cron/reconcile/route.js) (window `RECONCILE_WINDOW_DAYS`, default 30; auth `Authorization: Bearer $CRON_SECRET`, Vercel sends it automatically), and **admin one-click "Sync all"** [app/api/admin/reconcile-all/route.js](app/api/admin/reconcile-all/route.js) (window 365d; `payments:verify`; the green **Sync all** button in the Registrations toolbar — reports `checked/completed/advance/mismatch`).
- **Admin per-row "Sync payment"** [app/api/admin/reconcile-balance/route.js](app/api/admin/reconcile-balance/route.js): same `reconcileRegistrationWithRazorpay` path, triggered by the green ↻ button on a single `advance_paid` + `amount_mismatch` row. Verified against Razorpay, never a blind mark-paid.

**Not yet built (Layers 3–4):** settlement-level reconciliation vs bank deposits (gross vs net of fees), and a dedicated exceptions dashboard.

---

## 10. QR entry passes, scanner & check-ins

- **Generation/sending — [app/api/admin/send-qr/route.js](app/api/admin/send-qr/route.js) `POST`:** admin selects rows → server filters to **`completed` only** (skips others, reports `skippedNotPaid`), generates a QR PNG encoding `<site>/entry/<regId>`, uploads to the private `qr-codes` bucket, gets a 30-day signed URL, emails the QR + WhatsApps it (image if URL available, else text). On success, stamps **`qr_sent_at`**. Returns sent/failed counts.
- **Admin "Send QR" UX:** the bulk bar shows a breakdown (Paid / new / already-sent / not-Paid) and by default only sends to **unsent** Paid rows; a "Resend to already-sent" toggle overrides. Rows show "✓ QR sent <date>" or "QR not sent".
- **Single QR download — [app/api/admin/qr/[id]/route.js](app/api/admin/qr/[id]/route.js) `GET`:** returns a PNG; **409 unless `completed`**. UI shows the download icon only on Paid rows.
- **Verification page — [app/entry/[id]/page.tsx](app/entry/[id]/page.tsx):** public page the QR points to; shows **VALID** (green) only if `completed`, else INVALID with the status. Displays name, gotra, category, attendees, amount, phone, payment ref.
- **Scanner — [app/scan/page.tsx](app/scan/page.tsx):** staff flow PIN → pick checkpoint → camera (`html5-qrcode`). Each kiosk runs independently. Calls `/api/checkin/[id]`:
  - Auth by `SCANNER_PIN` (or admin/viewer session).
  - Returns `NEW` (first scan here), `DUPLICATE` (already scanned at this checkpoint, with count), `NOT_PAID`, or `INVALID`. Every scan inserts a `checkins` row (audit trail). Plays a beep.
- **Checkpoints** managed in admin Settings → Entry Checkpoints. Public list via `/api/checkpoints`.

---

## 11. Admin dashboard

[app/admin/page.tsx](app/admin/page.tsx). Login at `/admin` — **named `admin_users` accounts only** (username + password, scrypt-hashed). There is **no shared env password**: a shared secret in env can't be attributed to a person or rotated per user. The first account (and break-glass recovery) is created with **`npm run create-admin`** ([scripts/create-admin.mjs](scripts/create-admin.mjs), run locally against the service-role key). Roles are **`admin`** (full access, always) and **`volunteer`** (exactly the permissions an admin ticks; see the RBAC entry in §23). The old read-only `viewer` role was removed. ⚠️ **If every admin account is lost, nobody can log in** — recover by re-running `npm run create-admin`.

**Auto-refresh:** the registrations list silently re-fetches every 30s while on the Dashboard or Registrations tab (paused while a detail modal is open, or when toggled off via the **Auto ON/OFF** chip in the header). A manual **Refresh** button + "Updated HH:MM:SS" sit in the top header. So new registrations appear without reloading the page. (`refreshRegistrations()` updates only the registrations array — no loading flicker, no Settings disruption.)

**Top nav (6 tabs — Dashboard, Registrations, Enquiries, Scan Log, Settings, Audit — horizontally scrollable on mobile):**

### Dashboard (everyone)
Global overview (all figures **global**, never tied to the Registrations filter bar):
- **Stat tiles:** Today's Registrations (local-midnight onward, with a "N paid · ₹X" sub-line), Confirmed Attendees, Total Revenue (Paid), Total Registrations, Payments to Verify (clicks through to the verification queue), **Seva Raised** (→ Settings → Donations) and **Checked In** (→ Scan Log, with a % of paid).
- Seva + Checked In come from their own tables via the `stats` block on `/api/admin/data`, which is **permission-scoped** (`settings:manage` and `scanlog:view` respectively). A role without the permission gets `null` and the tile is hidden — it never leaks a total the role couldn't already reach via its own panel.
- Then: Data Health & Launch Check (admin only), [DashboardAnalytics](components/DashboardAnalytics.js) (14-day registrations / revenue / **Seva** bars, payment conversion, enquiry funnel, tier fill), the "Sales by Category" table, and per-category "Sales & Enquiries" chips.
- ⚠️ **Two different "donations"**: `registrations.donation_amount` is the add-on inside a registration (shown in Sales by Category); the `donations` table is the standalone Seva page. The Seva tile + chart mean the latter.

### Registrations (everyone) — the ledger workspace
- **Filters:** search (name/gotra/phone), date range, event, category.
- **Section tabs** (saved views by status, with live counts respecting other filters): Master List, To Verify, Cheque Pending, Advance Paid, Paid, Pending, **Amount Mismatch**, Rejected, Failed, **Cancelled**, Refunded. Keys map to `payment_status` (RBAC-ready).
- **Desktop table / mobile cards** (no horizontal scroll on mobile). Shared render helpers keep both in sync. A **Registered** column shows each row's `created_at` (date + time); also in the detail modal ("Registered on") and mobile card.
- **Row actions:** view details (modal), download QR (Paid only), **Sync payment** ↻ (advance_paid + amount_mismatch), **Copy balance link** + **re-send balance link** (advance_paid), **Reconcile** (amount_mismatch → re-run approve, complete or convert to advance), offline verify/reject/record. Inline status dropdown (locked for terminal states).
- **Toolbar:** **Sync all** re-checks every open registration against Razorpay in one click (see §9); plus Add Registration, Broadcast, and the CSV/Excel/Receipts/Financial exports.
- **Bulk:** select rows → **Send QR** (smart, see §10), with sticky bar on mobile.
- **Detail modal:** full profile/payment/custom fields + per-person activity timeline; balance link with **Copy link** + **Sync payment**; **Edit details**, **Resend confirmation**, **Refund**, **Cancel registration**.
- **Export:** CSV, Excel, Receipts PDF, Financial statement — all over the filtered set ([lib/adminExports.ts](lib/adminExports.ts)).

### Cancelling a registration (admin only) — [app/api/admin/cancel-registration/route.js](app/api/admin/cancel-registration/route.js)
**Cancel is not a refund, and it is not delegable.**
- **`authorize({ requireAdmin: true })`** — no volunteer permission grants it, not even `registrations:manage`. Cancelling destroys a seat-hold and voids an entry pass, so it belongs to a named admin.
- **A reason is mandatory** (server 400s without one). It's stored on the row (`cancellation_reason`), written to the audit log (`registration.cancel`), and sent to the registrant.
- **The money is untouched.** `amount_paid` / `amount_due` / `razorpay_payment_id` / `offline_reference` are all left exactly as they were, so the payment record survives and the books still balance. If money genuinely has to go back, that stays a separate, deliberate **Refund** (online) or **Reverse** (offline). The confirm dialog, the email, and the detail-modal banner all say this in as many words.
- **The seat releases itself.** Every capacity count in the app is an *allowlist* of statuses (`['completed','advance_paid']` for the hold in [app/api/razorpay/route.js](app/api/razorpay/route.js), plus the enquiry states on the public page), and `cancelled` is in none of them. ⚠️ If you ever add a new capacity count, keep it an allowlist — a denylist would silently start holding seats for cancelled rows.
- **Not cancellable:** `cancelled, refunded, failed, closed` (already ended). `cancelled` is a **terminal/locked** status — it can't be set from the status dropdown, only through this route.
- On success the route returns the **waitlist** for that tier (oldest-first `waiting` entries), and the UI nudges the admin to Settings → Waitlist to notify the next person, since a seat just freed.
- Notification is **best-effort** ([notifyCancelled](lib/notify.js)): a mail/WhatsApp failure is logged but never leaves the row half-cancelled.

### Settings (admin / `settings:manage`) — sidebar sub-tabs
Event Setup, Ticket Tiers, Media Gallery, Entry Checkpoints, Form Fields ([components/FormFieldsManager.js](components/FormFieldsManager.js)), Home Page Content ([components/HomeContentManager.js](components/HomeContentManager.js) — schedule/guests/highlights/faqs/hero/contact), Payment Details, Admin Users, Waitlist, Donations, **Sponsors**, **Message Log**, Feedback. Destructive deletes (events/tiers/media) require **re-entering the signed-in user's own account password** (verified against their `admin_users` hash — no env secret; see [verifyAdminPassword](lib/adminGuard.js)).

- **Sponsors** ([components/SponsorsManager.js](components/SponsorsManager.js)) — sponsorship deals are negotiated **offline** and recorded by an admin (name, tier, amount, logo, contact, notes). There is deliberately **no public sponsor form and no Razorpay flow** — a company committing a large sponsorship doesn't self-serve through a checkout — and sponsors are **not rendered on the public site**. Shows total committed + sponsor count.
- **Message Log** — see §12b. Gated on `audit:view`, so the sub-tab hides for a volunteer who has `settings:manage` but not `audit:view`.
- **Donations** — Seva contributions. A donor may give **anonymously**: their name is then *never stored* (not merely hidden), so `donations.name` is nullable and `is_anonymous` marks the row; the list and CSV show "Anonymous", and the receipt email greets them generically. Contact details are still optional-but-kept so a receipt can be emailed.

### Offline payments (bank transfer / cheque / cash / DD)
A second, human-verified completion path alongside online Razorpay.
- **Public:** on a payable tier, [components/CheckoutForm.js](components/CheckoutForm.js) shows a **payment-method chooser** (Online + the offline methods enabled in settings) when `bank_details.offline_enabled` is on. Picking offline shows the bank/UPI/payee instructions, a **reference** field (UTR / cheque no / receipt no) and a **proof upload** (image/PDF; required for transfer/cheque). Submits to `POST /api/offline-payment` (multipart) → status **`payment_review`**, proof stored in the private **`payment-proofs`** bucket, user emailed "under verification". **No Razorpay order, no seat held.**
  - **Offline part payment:** if the tier allows part payment and the user picked **Pay Advance**, the form now sends `paymentPlan=partial` and the route records `payment_plan='partial'` with `amount_due = total − advance` (advance = `advance_percent`% of the price only, never the donation) — so the admin sees it is a two-part row. The advance itself is confirmed from the actual amount received at verify time.
- **Admin verify** (Registrations tab, section tabs **To Verify** / **Cheque Pending** / **Rejected**): **View proof** (signed URL via `/api/admin/payment-proof/[id]`), **Approve** (confirm amount), **Reject** (reason → `payment_rejected`, user notified to resubmit). **Cheque** is two-step: **Cheque in hand** (→ `cheque_received`) → **Cleared** (→ `completed`) / **Bounced** (→ `failed`). Approved → `completed` + ticket + QR-eligible. Completed offline rows can be **Reversed** (→ refunded/failed, seat released) from the detail modal. All via `POST /api/admin/verify-payment`.
  - **Short amount at verify** — an amount short of the tier total is either an **advance** or a genuine **mismatch**, and the admin decides: if the row is already on a `partial` plan (or the admin confirms "Record part payment"), it becomes **`advance_paid`** with `amount_due = total − received` (balance link/reminder available, no pass until fully paid); otherwise it is flagged **`amount_mismatch`**. Drive this with `partial:true` on the verify-payment body.
  - **Reconcile a mismatch:** `amount_mismatch` rows are no longer a dead end — a **Reconcile** button (row action + detail modal) re-runs `approve`, pre-filled with the recorded amount, so the admin can complete it (full amount) or convert it to an advance with the balance kept due.
- **Walk-in / cash-at-desk:** admin **Record ₹** on a `pending`/`rejected` row (or an enquiry) → method + amount + reference → `completed` (full), **`advance_paid`** (short + confirmed as part payment), or `amount_mismatch` (short shortfall). On a price-less enquiry the amount received defines the total.
- **Global settings:** Settings → **Payment Details** ([components/PaymentSettingsManager.js](components/PaymentSettingsManager.js)) edits the `bank_details` config (account/IFSC/UPI/payee/instructions + which methods are enabled) via `GET|PATCH /api/admin/app-settings`.
- **Reconciliation:** offline statuses are excluded from the Razorpay cron/Sync (no order to check) — never add them to those filters.
- Dashboard shows a **Payments to Verify** stat.

### Enquiries (everyone; actions admin-only) — the leads pipeline
[components/EnquiriesPanel.js](components/EnquiriesPanel.js). Kept **separate** from the Registrations ledger. Shows rows with status ∈ `{enquired, contacted, awaiting_payment, closed}` under section tabs: **New**, **Contacted**, **Payment Link Sent**, **Closed/Lost**, **All Open**.
- **Enquiry sources:** a tier can be **Enquiry Only** (`is_enquiry_only`) or **Paid + Enquire** (`allow_enquiry` → shows both "Pay" and "Enquire Now" on the form). "Enquire Now" posts to `/api/enquiry` → `enquired` (holds no seat).
- **Contact history:** admins append **multiple** timestamped notes per lead (`registration_notes` table) via the Notes drawer. The first note on a New lead auto-advances it to Contacted.
- **Convert to paid (fixed price):** **Request Payment** → `POST /api/admin/request-enquiry-payment` sets `total_amount = amount_due = category.price`, status → `awaiting_payment`, and sends a Razorpay payment link (email + WhatsApp) via `sendPaymentLink(reg, 'enquiry')`. When paid, the **same record** completes via the normal `payment_link.paid` → `finalizeBalancePaid` path (and cron/Sync backstop). No amount is ever typed — it's the tier's fixed price.
- **Close/Reopen:** **Close** (prompts for a reason note) → `closed`; **Reopen** → `contacted`.

### Audit (admin only)
[components/AuditLogPanel.js](components/AuditLogPanel.js) — filterable list of all admin changes. See §12.

---

## 12. Audit logging

- **Writer — [lib/auditLog.js](lib/auditLog.js):** `logAudit({session, request, action, entity, entityId, summary, metadata})`. **Fire-and-forget** — swallows errors so logging never breaks the actual action. Captures `actor_role`, IP, and reserves `actor_id`/`actor_label` for RBAC.
- **Instrumented:** every mutating admin route (status change, send-qr, resend/reconcile balance, create/update/delete of events, categories, media, checkpoints, form fields, highlights, faqs, schedule) + the cron (`actor_role: 'system'`). Reads/logins are NOT logged.
- **Read — [app/api/admin/audit-logs/route.js](app/api/admin/audit-logs/route.js):** admin-only; filters `entity`, `action`, `q` (summary ilike), `limit` (default 200, max 500).
- **Action naming:** `<entity>.<verb>` e.g. `registration.status_change`, `qr.send`, `balance.reconcile`, `event.create`, `category.delete`, `reconcile.cron`.
- **⚠ Requires** the `admin_audit_logs` table **and** its `GRANT ALL ... TO service_role` + sequence grant (BIGSERIAL). Missing grant = silent write failures + 500 on read.

---

## 12b. Message log (outbound delivery trail)

Answers the question an operator asks constantly: **"did they actually get it?"**

- **Written centrally.** [lib/messageLog.js](lib/messageLog.js) `logMessage()` is called from inside [lib/email.js](lib/email.js) `sendEmail()` and the `post()` helper in [lib/whatsapp.js](lib/whatsapp.js) — **not** at the ~15 call sites. The log is therefore **complete by construction**: a new send site is recorded automatically and cannot forget to log. Fire-and-forget, like `logAudit` — a logging failure never changes the send's return value.
- **Context** comes from an optional `log: { kind, registrationId }` argument threaded through each sender (ticket, QR, balance/payment link, cancellation, offline notices, waitlist, broadcast, feedback, donation receipt, self-service). A send without it still logs, just with a null `kind`.
- ⚠️ **`sendWhatsAppText(phone, body, previewUrl, log)`** — `previewUrl` is the 3rd positional param. A call that omits it will land the `log` object in the wrong slot; pass it explicitly.
- **Resend** — `POST /api/admin/message-log { id }` replays the **stored payload** (rendered body, or template + params) rather than re-deriving the message, so a retry can't silently produce different content (a stale price, a rotated link) than the failure was about. It always writes a **new** log row (`metadata.resend_of`) instead of mutating the failed one, so the history shows the attempt and its outcome.
- **Admin UI** — Settings → **Message Log** ([components/MessageLogPanel.js](components/MessageLogPanel.js)): sent/failed counts, filter by channel/type/status, search by recipient, per-row **Re-send**. Delivery events also appear on each person's **activity timeline** in the detail modal (a failed send is dotted rose, as loudly as a destructive action).
- **Permissions:** GET needs `audit:view` (it's a delivery audit trail); resend needs `reminders:send` (it puts a real message in front of a real person).
- ⚠️ **`MESSAGE_KINDS` lives in [lib/messageKinds.js](lib/messageKinds.js), not `messageLog.js`** — `messageLog.js` imports `supabaseAdmin`, so a **client** component importing the constant from it would drag `SUPABASE_SERVICE_ROLE_KEY` into the browser bundle. Same client-safe/server-only split as `formFields.js` vs `formFieldsServer.js`. **Import kinds from `messageKinds` in any client component.**

---

## 13. Dynamic form fields

- **Built-ins** ([lib/formFields.js](lib/formFields.js)) map to real `registrations` columns: salutation, firstName, lastName, gotra, gender, dob, phone, email, pincode, problem. **Core** fields (firstName, lastName, phone, email) are always visible+required (payment/ticket/QR depend on them); the rest can be toggled/reordered but not deleted.
- **Custom fields** (`form_fields` rows, `is_custom`) are global, opt-in per category, stored in `registrations.custom_fields` jsonb. Types: text, number, date, select, textarea.
- **Per-category config** in `category_field_settings` (visible/required/order). Resolved server-side by [lib/formFieldsServer.js](lib/formFieldsServer.js) (`getCatalogForCategory`, `getActiveFields`, `validateSubmission`). Validation + HTML sanitisation happen server-side in the payment/enquiry routes.
- Admin UI: [components/FormFieldsManager.js](components/FormFieldsManager.js) (per-category, explicit Save). Public fetch: `/api/form-fields?categoryId=`.

---

## 14. Profiles (canonical users)

[lib/profiles.js](lib/profiles.js) + [lib/phone.js](lib/phone.js). Every registration upserts a `profiles` row keyed by **E.164 phone** (`+91XXXXXXXXXX`); only non-empty fields are written (a sparse later registration never nulls good data). `registrations.profile_id` links them. Foundation for future per-user history/RBAC.

---

## 15. Internationalisation (EN/HI)

- [components/LanguageProvider.tsx](components/LanguageProvider.tsx) provides `{ t, lang, setLang }`; `t(key, ...args)` looks up [lib/lang/en.js](lib/lang/en.js) / [lib/lang/hi.js](lib/lang/hi.js) (some values are functions, e.g. `form_pay_button(amount)`). Toggle via [components/LangToggle.js](components/LangToggle.js).
- **When adding user-facing copy, add the key to BOTH `en.js` and `hi.js`.** Many DB fields have `_hi` twins (titles, descriptions, schedule, FAQs).

---

## 16. Public pages

| Route | What |
|---|---|
| `/` | Home: active event hero, tiers, gallery, schedule, highlights, FAQ, countdown, reminder form ([components/HomeContent.js](components/HomeContent.js)) |
| `/register/[id]` | Registration for a category → CheckoutForm |
| `/entry/[id]` | QR verification (VALID/INVALID) |
| `/scan` | Staff scanner |
| `/previous-events` | Archived events |
| `/pitham` | Static info |
| `/terms` `/privacy` `/refund` | Legal (no-refund policy) |

---

## 16b. Live stream & news

**News / announcements.** Short updates on the homepage, newest first. Admin-managed in **Settings → Home Page Content → News & Announcements** (add headline/details/image, all translatable; an **eye** button toggles `is_published` so an item can be drafted or pulled without deleting it). CRUD: `GET|POST|PATCH|DELETE /api/admin/news` (`settings:manage`). The public homepage renders **only published rows** and hides the whole section when there are none.

**Live stream.**
- Admin sets it up in **Home Page Content → Live Stream**: paste the URL ahead of time, then hit **🔴 Go live**. `livestream_is_live` is a separate one-click toggle with its own save, so going live never also commits half-typed countdown/helpline edits.
- **Live requires BOTH the toggle AND a URL** — checked in the API, the homepage, and the banner. A toggle with no URL would render an empty player, so it's treated as not live (and the admin UI refuses to go live without one).
- **Where it shows:** a dark **player section** on the homepage (`#livestream`, placed high — if it's on, it's why someone is visiting), **plus a site-wide sticky banner** so a visitor on `/register` or `/donate` still learns you're live.
- ⚠️ **The banner is a CLIENT component ([components/LiveBanner.js](components/LiveBanner.js)) fetching `GET /api/livestream`, deliberately.** The root layout is a *static* server component — doing a DB read there would force **every** page (including the static `/terms`, `/privacy`, `/pitham`, `/feedback`) to render dynamically on every request. Fetching a tiny JSON from the client keeps those pages static (verified: they still build as `○`), and the 60s poll means someone already sitting on the page sees the bar appear when you go live, without reloading. **Don't "simplify" this into a layout-level server fetch.**
- The banner renders **nothing** unless live, so the cost is one small fetch.

---

## 17. Full API reference

**Public:**
- `POST /api/razorpay` — create order + pending registration.
- `POST /api/enquiry` — enquiry registration (enquiry-only or dual tiers).
- `POST /api/offline-payment` — offline payment submission (multipart: fields + proof) → `payment_review`.
- `GET /api/form-fields?categoryId=` — active fields for a category.
- `POST /api/reminders` — reminder opt-in.
- `GET /api/checkpoints` — active checkpoints.
- `GET /api/livestream` — is the active event streaming? (powers the site-wide banner; see §16b).
- `POST /api/checkin/[id]` — record a scan (PIN or session). Returns NEW/DUPLICATE/NOT_PAID/INVALID.
- `POST /api/checkin/verify-pin` — validate scanner PIN.
- `POST /api/webhook/razorpay` — Razorpay webhook (HMAC-verified).

**Cron:**
- `GET|POST /api/cron/reconcile` — reconciliation (Bearer `CRON_SECRET`).

**Admin (session required; most `requireAdmin: true`):**
- `POST /api/admin/login`, `POST /api/admin/logout`.
- `GET /api/admin/data` — dashboard data. **RBAC-scoped:** the raw `registrations` (PII) array is returned **only** with `registrations:view` — a role without it gets `[]` (the real PII boundary; the tab-hide is cosmetic). The **`stats`** block members are each `null` unless the session holds the matching permission: `donations`/`donationsTotal` → `settings:manage`, `checkedInRegs` → `scanlog:view`, `dashboard` (server-computed summary numbers, so a `dashboard:view`-only volunteer sees the tiles without PII) → `dashboard:view`.
- `PATCH /api/admin/registrations` — change status (`{id,status}`, rejects terminal/locked; **`completed`/`refunded`/`amount_mismatch` are NOT settable here** — completion goes through a money-recording path, refunds through `/api/admin/refund`) OR edit personal/contact/custom fields (`{id,updates}`, allowed on any row).
- `POST /api/admin/cancel-registration` — **admin only.** `{id, reason}` (reason required) → `cancelled`. Releases the seat, notifies the registrant, returns the tier's waitlist. **Never refunds** — see §11.
- `POST /api/admin/refund` — Razorpay refund (full/partial); full → `refunded`.
- `POST /api/admin/resend-confirmation` — re-send the confirmation email/WhatsApp for a completed reg.
- `POST|PATCH|DELETE /api/admin/categories` — tiers (DELETE needs password).
- `POST|PATCH|DELETE /api/admin/events` — events (+ setActive; DELETE needs password).
- `POST|DELETE /api/admin/media`, `…/highlights`, `…/faqs`, `…/schedule`, `…/guests`, `GET|POST|PATCH|DELETE /api/admin/testimonials` — event content (`settings:manage`).
- `GET|POST|PATCH|DELETE /api/admin/news` — homepage announcements (`settings:manage`; PATCH also toggles `is_published`).
- `GET|POST|PATCH|DELETE /api/admin/media-library` — the media library (`settings:manage`). POST is multipart. DELETE returns **409 + `inUse`** if the file is still referenced; re-send with `force: true` to override. See §19b.
- `GET /api/admin/media-file/[id]` — signed URL for a **private** library file (`settings:manage`).
- Live stream is edited through `PATCH /api/admin/events` (`livestream_url` / `livestream_is_live` / `livestream_banner`). ⚠️ **A field missing from that route's `allowed` whitelist silently fails to save** — and booleans must be handled outside the falsy-to-null loop.
- `GET|POST|PATCH|DELETE /api/admin/form-fields` — field catalog + per-category settings.
- `GET|POST|PATCH|DELETE /api/admin/checkpoints`.
- `GET /api/admin/reminders` — export opt-ins.
- `POST /api/admin/send-qr` — bulk QR send (completed only).
- `GET /api/admin/qr/[id]` — single QR PNG (completed only; 409 otherwise).
- `POST /api/admin/resend-balance` — re-send balance link.
- `POST /api/admin/reconcile-balance` — "Sync payment" against Razorpay (advance/pending/mismatch/awaiting_payment).
- `POST /api/admin/request-enquiry-payment` — convert an enquiry: set the tier price + send a payment link.
- `GET|POST /api/admin/registration-notes` — enquiry contact-notes history (GET `registrations:view`; POST `enquiries:manage`).
- `POST /api/admin/verify-payment` — offline verification (approve/reject/cheque steps/reverse/record).
- `GET /api/admin/payment-proof/[id]` — signed URL to an offline proof file.
- `GET|PATCH /api/admin/app-settings` — **all** global config, driven by the registry in [lib/appSettings.js](lib/appSettings.js): `bank_details`, `branding`, `seo`, `email_templates`, `whatsapp_templates`, `qr`. GET any role; PATCH needs `settings:manage` and busts the matching cache tag. See §19c / §19d.
- `GET /api/admin/gateway-status` — read-only gateway/channel status (`settings:manage`). Key id masked; **secrets never returned**. See §19d.
- `GET|POST|PATCH|DELETE /api/admin/sponsors` — sponsor records (`settings:manage`).
- `GET /api/admin/message-log` — outbound delivery trail (`audit:view`); `POST { id }` re-sends a message (`reminders:send`). See §12b.
- `GET /api/admin/audit-logs` — read audit trail.

Every admin route uses `authorize()` from [lib/adminGuard.js](lib/adminGuard.js); destructive ones also call `verifyAdminPassword()`.

---

## 18. lib/ modules

| File | Role |
|---|---|
| `supabase.js` | Anon Supabase client (public reads) |
| `supabaseAdmin.js` | Service-role client (server-only) |
| `adminSession.js` | JWT cookie session (create/verify/destroy), 8h |
| `adminGuard.js` | `authorize({requireAdmin})`, `verifyAdminPassword()` |
| `razorpayClient.js` | Shared lazy Razorpay client singleton |
| `payments.js` | **Money transitions + reconciliation** (see §8–9) |
| `email.js` | Central email: `sendEmail()`, `emailShell()`, `EMAIL_FROM`, `emailConfigured()`. **The ONLY file that knows the email provider** — see the swap note below. |
| `whatsapp.js` | Central WhatsApp: template registry + `sendWhatsAppTemplate/Text/Image`, `waConfigured()` |
| `ticket.js` | `dispatchTicket()` confirmation email + WhatsApp |
| `auditLog.js` | `logAudit()` fire-and-forget writer |
| `messageLog.js` | `logMessage()` fire-and-forget outbound-message writer (**server-only** — imports supabaseAdmin) |
| `messageKinds.js` | `MESSAGE_KINDS` catalog (**client+server safe** — import this one from components) |
| `profiles.js` | `upsertProfile()` |
| `phone.js` | `normalizePhone()` → E.164 |
| `formFields.js` | Built-in field metadata (client+server safe) |
| `formFieldsServer.js` | Resolve/validate fields per category (server) |
| `youtube.js` | YouTube thumbnail/embed helpers |
| `lang/en.js`, `lang/hi.js`, `lang/mr.js` | Translations (EN / HI / MR) |

### Email provider (ZeptoMail HTTP API) & swapping it

Email is **fully centralised**: exactly one function talks to the provider, and all callers go through `sendEmail({ to, subject, html })`. **Current provider = ZeptoMail**, called over its HTTP API with a plain `fetch` (no SDK dependency). Chosen over SMTP because it's serverless-friendly (stateless HTTPS, no connection pool / blocked-port issues on Vercel) and matches the existing HTTP-shaped `deliver()`.

- **Env:** `EMAIL_API_KEY` = ZeptoMail **Send Mail Token** (the `Zoho-enczapikey ` prefix is auto-added if omitted). `EMAIL_FROM` = an address on your **verified** ZeptoMail domain. `EMAIL_API_URL` (optional) overrides the API endpoint — **defaults to the INDIA DC** (`api.zeptomail.in`); set the `.com` host for a global/US account. ⚠️ **The host must match the token's data centre or every send 401s.**
- **To swap again** (SES / Postmark / SendGrid / …): rewrite **`deliver()`** in [lib/email.js](lib/email.js) (takes `{ to, subject, html }`, returns `{ ok, error }`), and repoint the env vars. **No call site changes** — `sendEmail()`'s signature, its boolean return, `emailShell()`, and the `message_log` write are all provider-neutral, and the Data Health launch check asks `emailConfigured()` rather than naming a vendor.

⚠️ **The one thing each swap must re-map: attachments.** Callers pass a neutral `attachments: [{ url, filename }]`. ZeptoMail can't fetch URLs, so `deliver()` fetches each file and inlines it as base64 (`{ content, mime_type, name }`, MIME inferred from the extension) — see `buildZeptoAttachments()`. Resend took `{ path, filename }` and fetched the URL itself; SES wants raw MIME. Everything else is a straight port. Nothing uses cc / bcc / reply-to.

---

## 19. Components

`CheckoutForm.js` (registration+payment+receipt+enquire/pay choice), `RegisterPageContent.js`, `HomeContent.js`, `HomeContentManager.js` (admin home editor), `FormFieldsManager.js`, `AuditLogPanel.js`, `EnquiriesPanel.js` (leads pipeline), `LanguageProvider.tsx`, `LangToggle.js`, `Countdown.js`, `FaqAccordion.js`, `ReminderForm.js`, `AddToCalendar.js`, `ShareButtons.js`, `FloatingActions.js`, `Reveal.js` (scroll-reveal), `YouTubeEmbed.js`, `PreviousEventsContent.js`, `Footer.js`.

---

## 19b. Media library

**The problem it solves.** Uploads used to go straight to storage via `POST /api/admin/upload-image`, and only the returned URL was written onto whatever row you were editing. Nothing recorded that the upload happened — so files could not be browsed, could not be reused (the same photo was uploaded once per field), and could not be deleted. **Every replaced image was orphaned in the bucket forever.** `media_library` is the index that fixes all three.

**Two buckets, because visibility is a STORAGE decision, not a UI flag.**
- `visibility = 'public'` → public **`event-media`** bucket → permanent public URL. Images (which must be fetchable by `<img src>` to render at all) are *always* public.
- `visibility = 'private'` → private **`admin-docs`** bucket → **no public URL at all**. Reachable only through a short-lived signed URL from `GET /api/admin/media-file/[id]`, exactly like `payment-proofs`. This is for contracts, sponsor decks and invoices. ⚠️ **Hiding such a file in the UI while it sat behind a permanent public URL would not be privacy** — hence a real second bucket. Both buckets auto-create on first upload; no manual Storage step.

**How files get used** (`is_download` / `attach_to_ticket`, both enforced server-side to be *public documents only*):
- **Homepage Downloads section** — public documents flagged `is_download` (brochure, parking map, programme).
- **News attachment** — an announcement can carry one file. `event_news.attachment_url`/`attachment_name` are **denormalised on purpose** so the announcement survives the library row being deleted or retitled.
- **Ticket-email attachment** — documents flagged `attach_to_ticket` are attached to every confirmation email by [lib/ticket.js](lib/ticket.js). ⚠️ **Capped at 5 MB** (well under the 25 MB upload limit): this file rides on *every* ticket email, and many inboxes bounce messages over ~10 MB. Publish a big file as a download and link to it instead.
- **Internal-only** — private documents, admin-viewable, never public.

**Components.** [components/MediaPicker.js](components/MediaPicker.js) replaced the old `ImageUpload` button in all six media fields (gallery, tier image, guest photo, hero image, sponsor logo, news image) — it lets you **browse and reuse** as well as upload. [components/MediaLibraryManager.js](components/MediaLibraryManager.js) is Settings → **Media Library** (grid + search, copy link, publish flags, delete).

**Deleting** checks the file's URL against every column that can reference it (the `USAGE` list in the route) and returns **409 + where it's used**; the UI then shows those places and lets the admin force it. ⚠️ **A new consumer of library URLs must be added to `USAGE`**, or its images can be deleted out from under it.

⚠️ **The old un-indexed `POST /api/admin/upload-image` and `components/ImageUpload.js` were deleted.** Don't reintroduce an upload path that doesn't write a `media_library` row — that's precisely the orphan bug this replaced.

---

## 19c. Branding & SEO (Settings → Branding & SEO)

Global config lives in `app_settings`, now driven by a registry: [lib/appSettings.js](lib/appSettings.js) declares each key with its defaults + sanitiser, and `/api/admin/app-settings` serves them all generically. **Adding a global setting = one entry there + a UI panel.** (`bank_details` still appears at the top level of the response, so `PaymentSettingsManager` was untouched.)

### Branding — how a colour actually re-themes the site
The site uses hardcoded Tailwind classes (`bg-orange-600`, `text-gold-400`, …) in **~260 places**. Re-tokenising every call site would be an enormous, risky diff. Instead:
- [app/globals.css](app/globals.css) maps Tailwind's **`orange-*` and `gold-*` scales onto CSS variables** (`--brand-*`, `--accent-*`) inside `@theme inline`, so `bg-orange-600` compiles to `background-color: var(--brand-600)`. **Every existing class becomes themeable with no code change.**
- ⚠️ **Those variables default to the exact values Tailwind already emitted** (`--brand-600: #ea580c`, …). An unconfigured site therefore renders **byte-identically** to before — `brandCss()` returns `''` and no override is injected. Never put a non-Tailwind hex in those `:root` defaults.
- One picked colour must theme a whole scale (pale tints for backgrounds, dark shades for hover), so [lib/branding.js](lib/branding.js) `ramp()` derives 50→900 from the seed by holding hue/saturation and walking lightness. **The 600 step is pinned to the seed verbatim** — an admin who picks `#1d4ed8` must get exactly `#1d4ed8` on the buttons, not the ramp's nearest approximation.
- There is deliberately **no "dark colour" setting**: the dark headers use `neutral-900`, which is also the body-text colour — theming it would recolour every paragraph.

⚠️ **The layout reads branding through `unstable_cache` (1h, tagged).** A raw DB call in the root layout would force **every** page — including the static `/terms`, `/privacy`, `/pitham`, `/feedback` — to render per-request. Verified: they still build as `○`. The settings PATCH calls `revalidateTag('branding'|'seo')`, so a save reaches the site immediately instead of waiting out the hour. (`cacheComponents` is off, so `unstable_cache` — not `use cache` — is the correct API here.)

The CSS is **inlined in `<head>`**, not fetched, so brand colours are present on first paint (a stylesheet request would flash the default palette). `site_name` + `logo_url` reach client components through [components/BrandingProvider.tsx](components/BrandingProvider.tsx) — colours don't, because CSS variables already handle them.

### SEO
`site_title`, `description`, `og_image`, `keywords`. The **homepage still prefers the active event's** own title/description/hero image (a shared link should show the event you're inviting people to); these are the fallback and what every other page uses. ✅ **Fixes a long-standing bug:** `/og-image.jpg` was referenced in the metadata but **never existed in the project**, so shared links had no preview image at all unless the active event happened to have a hero image. An admin-set `og_image` now fills that gap.

---

## 19d. Templates & Config (Settings → Templates & Config)

### Email templates
**[lib/emailTemplates.js](lib/emailTemplates.js) is the single source of truth for every transactional email.** No sender carries inline HTML any more — `ticket.js`, `notify.js`, `payments.js`, `send-qr`, `waitlist`, `feedback`, `donate/verify` and `resend-balance` all call **`sendTemplatedEmail({ to, kind, vars })`** and pass **data only**.

- An admin override (stored in `app_settings.email_templates`) wins; otherwise the registry default is used, so the shipped emails are unchanged until someone edits one.
- **Only overrides are stored.** "Reset to default" is a *delete*, which is why the default can never drift from what the code actually sends.
- **Template syntax** (deliberately tiny — this is admin-facing): `{{name}}` inserts a value **HTML-escaped**; `{{{qrImage}}}` inserts raw (only for values we generate, like the QR data URI); `{{#if reason}}…{{/if}}` includes a block only when the value is non-empty. ⚠️ Escaping is automatic — that's what stops a registrant named `<script>` from breaking out into the markup, so **never** switch a user-supplied var to the raw `{{{…}}}` form.
- `wrap: true` → the body is inner HTML placed in the branded `emailShell`. `wrap: false` → the template is the complete email (ticket + QR have bespoke layouts; wrapping them would nest two headers).
- ⚠️ **`balance_link` and `balance_reminder` are separate on purpose.** The first is "thanks, your advance is received"; the second is the admin's later chase ("this is a reminder…"). Collapsing them makes a chase email read like a fresh confirmation.
- **Send this template as a test** (under the variable palette): posts the currently-selected `kind` + the editor's current `subject`/`html` (unsaved edits included) to [/api/admin/test-email](app/api/admin/test-email/route.js), which renders it with sample data (a real QR for `qr`) and emails it. Lets an admin see a real render in an inbox before saving.

### WhatsApp templates
Meta requires a **pre-approved template** for any business-initiated message, so **the message bodies live in Meta, not here** — only the *names* are configurable. Senders now pass a **key** (`'ticketConfirmation'`, `'announcement'`, `'paymentLink'`, `'waitlistOpen'`) and `sendWhatsAppTemplate()` resolves the real name at send time: **Settings → env var → built-in default**. So a template re-approved under a new name needs no redeploy. A literal name still works (that's how the message-log **resend** replays a stored send).

### QR entry pass
`size`, `download_size`, `margin`, `dark`, `light`, `link_expiry_days` — applied in both `send-qr` and `qr/[id]`. Defaults are exactly the previously-hardcoded values. ⚠️ Low-contrast or inverted colours produce a QR that looks fine and **fails to scan at the gate**.

### Payment gateway — read-only, deliberately
`GET /api/admin/gateway-status` reports Razorpay configured/**test-vs-live** (from the `rzp_test_`/`rzp_live_` key prefix), whether the webhook secret and `CRON_SECRET` are set, and the email/WhatsApp status. **The key id is masked and the secret is never returned.** ⚠️ **Keys stay in env and are NOT editable from the panel.** Storing a live payment secret in a DB row that an admin panel can read and write would be a real security downgrade — a settings-level account, a SQL injection, or a DB backup leak would own the merchant account.
- **Send test email** (under the Email status row): posts to [/api/admin/test-email](app/api/admin/test-email/route.js) (`settings:manage`), which sends a sample through the real `sendEmail()` path so a failure is captured in the Message Log with the provider's error. One-click verification that the domain/token/DC are correct — no fake registration needed.

### Caching
`email_templates`, `whatsapp_templates` and `qr` are read through **tagged `unstable_cache`** ([lib/settingsServer.js](lib/settingsServer.js), 5 min) so a hot send path isn't a DB round-trip. The settings PATCH calls `revalidateTag()`, so an edit takes effect immediately. ⚠️ Same client/server split as elsewhere: `lib/appSettings.js` + `lib/emailTemplates.js` are **client-safe** (the admin editor imports them); `lib/settingsServer.js` holds the service-role reads.

---

## 20. Payment status lifecycle

```
Enquiry pipeline (separate tab):
enquired ──notes──► contacted ──Request Payment──► awaiting_payment ──pays──► completed ──► (QR)
   └───────────────┴────────── Close (reason) ─────┴────────► closed  (reopen → contacted)

Payment ledger:
pending ──capture(full)──► completed         (+ ticket, eligible for QR)
pending ──capture(advance)► advance_paid ──balance paid──► completed
pending ──fail──────────► failed
   any ──shortfall───────► amount_mismatch   (locked; heal via Sync/cron if not a real shortfall)
completed ──refund───────► refunded

   any ──admin Cancel────► cancelled         (seat released, pass void, NO refund, money row intact)
   (not cancellable: cancelled / refunded / failed / closed)
```

Offline pipeline (verified by admins, in the Registrations tab):
```
form → offline method → payment_review ──approve full──────────► completed
                             ├─ approve advance (partial plan / admin) ─► advance_paid (balance due)
                             ├─ approve short (unexpected) ────────────► amount_mismatch ──Reconcile──► completed / advance_paid
                             ├─ cheque: cheque_received → completed / failed(bounced)
                             └─ reject → payment_rejected (resubmit) ; completed → reverse → refunded
```

- **Terminal/locked (not editable from the status dropdown):** `completed, failed, refunded, amount_mismatch, advance_paid, awaiting_payment, payment_review, cheque_received, cancelled`.
- **QR eligibility:** `completed` only.
- **Capacity held by:** `completed` + `advance_paid` only (Paid + Partial Paid). Open enquiries, offline-pending (`payment_review/cheque_received/payment_rejected`) and `cancelled` do NOT reserve seats. **Every capacity count is an allowlist of statuses — keep it that way**, so a new "ended" status never accidentally holds a seat.
- `amount_paid + amount_due` always equals `total_amount` (advance recorded; balance/enquiry link clears `amount_due` to 0).

---

## 21. Operations runbook & gotchas

1. **Razorpay webhook must subscribe to BOTH `payment.captured` AND `payment_link.paid`** (plus `payment.failed`, `refund.processed`). If `payment_link.paid` is off, balance payments are taken but the portal stays `advance_paid` — the classic "stuck advance" bug. Layer-2 cron + admin Sync are the backstop.
2. **`service_role` GRANTs.** Every server-written table needs `GRANT ALL ... TO service_role` (and BIGSERIAL tables also need the sequence grant). Missing = silent insert/select failures (this bit `admin_audit_logs`). All grants are in `run_all.sql`.
3. **Cron on Vercel Hobby** allows **once-daily** crons only — `*/15` fails the deploy (shows pricing page). Current `vercel.json` uses `0 3 * * *` (daily). For 15-min cadence: upgrade to Pro (restore `*/15 * * * *`) **or** add a free external scheduler (cron-job.org / GitHub Actions) hitting `/api/cron/reconcile` with `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in Vercel or the cron 401s.
4. **Customer fee bearer.** If enabled on Razorpay, `payment.amount` = order + fee (higher than expected). The amount check only flags **shortfalls**, so this is fine; standard fees come out of settlement and don't affect `payment.amount`.
5. **`qr-codes` private bucket** must exist in Supabase Storage or WhatsApp QR images fall back to text links.
6. **WhatsApp templates** must be approved in Meta for business-initiated messages (ticket, balance link, QR). Free-form text only works inside a 24h session.
7. **`EMAIL_FROM`** must be an address on a **verified ZeptoMail domain** (SPF+DKIM added) in production, and **`EMAIL_API_URL` must match your account's data centre** (India `api.zeptomail.in` by default; `.com` for global/US) — a DC mismatch 401s every send.

---

## 22. Deploy checklist

- [ ] Run `supabase/run_all.sql` (creates tables + grants + RLS).
- [ ] Create private `qr-codes` storage bucket.
- [ ] Set all env vars (§4) in Vercel, incl. `CRON_SECRET`.
- [ ] Razorpay: enable EMI + Payment Links; webhook → `<site>/api/webhook/razorpay` with `payment.captured`, `payment_link.paid`, `payment.failed`, `refund.processed`; set `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Reconcile cadence: Pro `*/15` or external scheduler.
- [ ] Admin: create event → set active → add tiers → configure form fields → fill Home Content → add checkpoints.
- [ ] Approve WhatsApp templates; verify the ZeptoMail sending domain (SPF+DKIM) and set `EMAIL_API_KEY`/`EMAIL_FROM` (and `EMAIL_API_URL` if not on the India DC).

---

## 23. Changelog

Keep newest first. Add an entry for every meaningful change.

- **2026-07-21 (Deliver-once tickets + QR email render + attendee link)**
  - **No more duplicate ticket emails.** Two fixes so each channel delivers once: (1) `dispatchTicket(reg, paymentId, { channels })` now attempts and records ONLY the requested channels — the row's ⚠️ retry ([resend-confirmation](app/api/admin/resend-confirmation/route.js) + admin `handleResendConfirmation(reg, true)`) re-sends only the **failed** channel, so retrying a failed WhatsApp never re-sends an already-delivered email (the exact bug: a reg got 2 emails because the admin kept retrying while WhatsApp failed on a bad token). (2) The payment finalizers ([lib/payments.js](lib/payments.js) `finalizeOrderCapture`/`finalizeBalancePaid`) now transition **atomically** (`update … .eq('payment_status', reg.payment_status)`) and dispatch only if the row actually flipped — a webhook-retry/Sync race can no longer double-send. The modal's "Resend confirmation" still does a deliberate full resend.
  - **QR now renders in the email.** [send-qr](app/api/admin/send-qr/route.js) was embedding the QR as a `data:` URI, which **Gmail strips** (broken image). It now uses the hosted signed bucket URL (`qrPublicUrl`), falling back to the data URI only if the upload failed. ⚠️ needs the `qr-codes` bucket to exist.
  - **Attendee link fixed.** The QR email + WhatsApp gave the attendee `…/entry/[id]` — the STAFF scan-verify screen (big green "VALID / Entry Permitted"), which they could just flash at the gate without being scanned. Now they get `…/pass/[id]` (their own pass page, which shows the scannable QR). New `passUrl` var on the `qr` template; the QR image still encodes `/entry/[id]` for staff scans. ⚠️ Set **`NEXT_PUBLIC_SITE_URL`** in prod — links were pointing at `http://localhost:3000`.
- **2026-07-21 (Email provider → ZeptoMail HTTP API)**
  - Swapped the email provider from Resend to **ZeptoMail**, over its **HTTP API** (plain `fetch`, no SDK dep) — chosen over SMTP because it's serverless-friendly on Vercel and matches the existing HTTP-shaped `deliver()`. **Only [lib/email.js](lib/email.js) `deliver()` changed** — every caller (`sendEmail`/`sendTemplatedEmail`) is untouched, so all templates/logs/resend paths work as-is.
  - Env: `EMAIL_API_KEY` = ZeptoMail Send Mail Token (`Zoho-enczapikey ` auto-prefixed), `EMAIL_FROM` = verified-domain sender, new optional **`EMAIL_API_URL`** (defaults to India DC `api.zeptomail.in`; set `.com` for global). Updated [.env.example](.env.example), tech-stack table, env table, the "Swapping the email provider" runbook, deploy checklist, and gotcha #7.
  - Attachments: ZeptoMail can't fetch URLs, so `deliver()` now fetches each neutral `{ url, filename }` and inlines it as base64 (`buildZeptoAttachments`, MIME inferred from extension). Only affects the optional "attach to ticket" media docs.
  - **Send test email** — new [/api/admin/test-email](app/api/admin/test-email/route.js) (`settings:manage`) sends through the real `sendEmail()` path (so it also lands in the Message Log with any provider error). Two modes: **generic** deliverability probe (Gateway tab → under the Email status row) verifies domain/token/DC in one click; **template** test (Email Templates tab → "Send this template as a test") renders the **currently-selected template with the admin's unsaved edits** using realistic sample data (incl. a real sample QR for the `qr` kind) so they see exactly what a registrant receives. Neither auto-fires — both are manual buttons.
- **2026-07-21 (Copy balance link + one-click Sync all)**
  - **Copy balance link** — new [/api/admin/balance-link](app/api/admin/balance-link/route.js) (+ `ensureBalanceLink()` in [lib/payments.js](lib/payments.js)) returns an `advance_paid` reg's balance link, creating one if missing, **without notifying the customer**. New **Copy** row action + a create-on-demand **Copy link** button in the detail modal — for when the WhatsApp/email didn't reach the devotee and the admin wants to paste it manually. (The ₹ button still *re-sends* by email + WhatsApp.)
  - **One-click "Sync all"** — the per-row "Sync payment" ↻ was tedious across many records. Factored the cron's reconcile loop into a shared [lib/reconcileBatch.js](lib/reconcileBatch.js) `reconcileBatch()`, reused by the cron and a new [/api/admin/reconcile-all](app/api/admin/reconcile-all/route.js) (`payments:verify`, 365-day window, batch 100). A green **Sync all** button in the Registrations toolbar re-checks every pending/advance/mismatch row against Razorpay at once and reports the counts.
- **2026-07-21 (Offline part payment + mismatch reconcile + registration timestamp)**
  - **Offline part payment is now honored end-to-end.** Previously the offline route hardcoded `payment_plan='full'` / `amount_due=total`, so an advance paid offline tripped the shortfall guard and got stuck in `amount_mismatch`. Now [CheckoutForm](components/CheckoutForm.js) sends `paymentPlan` on offline submissions and [/api/offline-payment](app/api/offline-payment/route.js) records `partial` with `amount_due = total − advance` (advance = `advance_percent`% of the price only).
  - **Verify-payment supports an intentional advance** ([/api/admin/verify-payment](app/api/admin/verify-payment/route.js)): a short amount → **`advance_paid`** (balance kept due, no pass) when `partial:true` OR the row is on a `partial` plan; otherwise `amount_mismatch`. Price-less enquiry rows still let the received amount define the total.
  - **Amount Mismatch is no longer a dead end.** New **Reconcile** action (row + detail modal) re-runs `approve` pre-filled with the recorded amount so the admin completes it (full) or converts to an advance (balance due). The Approve/Record flows now ask "part payment vs flag mismatch" when the amount is short, and auto-detect `partial`-plan rows.
  - **Registration timestamp** surfaced on every admin record: a **Registered** column in the desktop table, "Registered on" in the detail modal, and a line on the mobile card (`created_at` already stored; this is display-only).
- **2026-07-21 (TanStack Query adoption — admin server state)**
  - Added **`@tanstack/react-query`** for the ADMIN only ([QueryProvider](components/admin/QueryProvider.tsx) via [app/admin/layout.tsx](app/admin/layout.tsx)). The public site stays on RSC — deliberately not touched.
  - Migrated self-contained admin panels off hand-rolled `fetch + useState + useEffect` to `useQuery` / `useMutation` (+ optimistic updates + `invalidateQueries`): **Contact Messages** (reference pilot), **Donations**, **Consent Records**, **Feedback**, **Waitlist**, **Audit Log**, **Message Log**, **Sponsors**, **Admin Users**, **Media Library**. Patterns covered: read, read+debounced-filters, read+mutation, and CRUD (list = `useQuery`, mutations → `invalidateQueries`). All self-contained admin panels are now migrated. Remaining (optional): the settings *form* panels (small payoff — core state is the edit form), `HomeContentManager`, and the big `admin/page.tsx` dashboard (**post-launch**, touches registration/payment ops).
- **2026-07-21 (Admin findability + instant updates + per-Seva colours)**
  - **Admin settings: search + regroup.** The Settings sidebar now has a **search box** (filters every panel by name + keywords) and cleaner groups: Website Content · Sevas & Registration · Payments & Donations · Messages & Contact · System.
  - **Instant public updates.** New [lib/revalidate.js](lib/revalidate.js) `revalidatePublic()` (`revalidatePath('/', 'layout')` + content tags), wired into every content route (events, categories, schedule, highlights, guests, news, testimonials, faqs, media, app-settings). Admin edits now reflect on the live site on the next request instead of after the ISR/cache window (was the "1–2 min" lag).
  - **Per-Seva card colours** — `categories.color` (`default`/`gold`/`maroon`), admin dropdown in Ticket Tiers; the /registration cards fully re-theme per Seva (like the Emergent reference). Recommended tier is forced to gold. **Re-run `run_all.sql`.**
- **2026-07-20 (Register form re-theme + Emergent structure + "Seva")**
  - **Theme fix:** the checkout form's black MUI buttons → luxury **`btn-gold` / `btn-outline-gold`** (Continue / Pay / Enquire); payment-method chips + file button → vermillion; the MUI fields are wrapped in a warm theme (rounded, gold-tinted borders, cream tint, vermillion focus) via `ThemeProvider`. Step indicator recoloured to vermillion/gold.
  - **Emergent structure** ([RegisterPageContent](components/RegisterPageContent.js)): a **"← All Sevas"** back link, a **"Register for *[name]*"** header with the price, and a **sticky "What's included" sidebar** (image + price + perks) beside the form.
  - **"Seva" naming:** tiers are presented as Sevas publicly — back link "All Sevas", tier button "Register Now" → **"Choose this Seva"** (`category_register`), homepage "See all categories" → **"See all Sevas"**. Trilingual.
- **2026-07-20 (Declaration / Samanti Patra + consent records)**
  - **Declaration setting** — `app_settings.declaration` (`{ enabled, title:{en,hi,mr}, body:{en,hi,mr} }`) edited in **Settings → Registration → Declaration** ([DeclarationManager](components/DeclarationManager.js)); public read via `GET /api/declaration`.
  - **Registration is a 2-step form** ([CheckoutForm](components/CheckoutForm.js)): **Step 1 = the declaration** — the full text (scroll-to-bottom) + the person's **Name, DOB, Mobile** + "I have read & I accept" → Continue; **Step 2 = the rest of the form + payment** (name/dob/mobile carried over). Shown every time (no session-skip). The **donate** page keeps the blocking modal ([DeclarationGate](components/site/DeclarationGate.js)).
  - **Consent records** — new **`consents`** table (kind / registration_id / donation_id / name / phone / email / **dob** / **declaration snapshot** / accepted_at / ip). `recordConsent()` ([lib/consent.js](lib/consent.js)) is called after the row insert in the razorpay, offline-payment, enquiry, and donate routes (no-op when the declaration is disabled). **Enquiries are covered too** (`kind='enquiry'`) since the modal gates the whole register page. Admin **Settings → Registration → Consent Records** ([ConsentsManager](components/ConsentsManager.js)) lists/searches them, exports CSV, and **prints a per-person consent document** (name + date/time + exact text accepted + IP). **Re-run `run_all.sql`.**
  - **Checkout button gating** — the Pay / Submit-for-verification / Enquire buttons are now disabled until the whole form is valid (required fields + terms, and the offline payment proof for bank/cheque), with a "complete all required fields" hint.
- **2026-07-20 (Image performance)**
  - **Upload-time image optimisation.** Added `sharp`; the media-library upload route ([route.js](app/api/admin/media-library/route.js)) now downscales every uploaded image to max 2560px and re-encodes to **WebP q80** at the source (GIFs untouched; falls back to the original on failure). So a 15 MB hero becomes a few hundred KB before it's ever served — no admin discipline required. Stored `mime`/`size_bytes` reflect the optimised file. `runtime = 'nodejs'` set (sharp needs it). Vercel fetches the Linux sharp binary on deploy.
  - **Lazy-loading** (`loading="lazy" decoding="async"`) added to below-the-fold images (homepage Pillars/Lineup/Leadership/About/DonateLive, tier cards); the gallery masonry already had it. Hero stays eager (it's the LCP).
  - Note: images still render via plain `<img>` (no next/image); the optimisation happens at upload, so the served files are already small.
- **2026-07-19 (Stop registrations / details-only mode)**
  - **Master registration switch.** New `events.registration_open` (BOOLEAN, default true) + auto-close once `end_at` is in the past. Pure helper [lib/registrationStatus.js](lib/registrationStatus.js) `isRegistrationOpen(event)` (client+server safe). **Re-run `run_all.sql`.**
  - **Server enforcement (the real guarantee):** `/api/razorpay`, `/api/offline-payment`, `/api/enquiry`, and the `/register/[id]` page all load the category's event (`categories.events(registration_open, end_at)`) and reject/close when registration is off — no sign-up can be created even if a CTA is missed.
  - **UI:** a client [RegistrationProvider](components/RegistrationProvider.js) (fed by the (site) layout via `getSiteEvent`) hides every "Register" CTA when closed — navbar, footer, hero, final CTA, floating bar. Tier cards (homepage + /registration) still render as **details** but the action becomes "Registrations closed"; `/register/[id]` shows a closed panel with Event Details / Contact links. So the event stays fully browsable with no register option — the "after the event" behaviour.
  - **Admin:** a **Registration open/closed** toggle in Home Page Content (event fields). Event-update now `revalidateTag('site-event')` so the nav/footer reflect a toggle immediately. i18n `register_closed_*` (en/hi/mr).
- **2026-07-19 (Phase 9 §I — Seva categories, facilities, navbar polish)**
  - **Seva categories on /donate** — new `app_settings.seva_categories` (array of `{icon,title,desc,amount}`) + admin **Settings → Payments & Seva → Seva Categories** ([SevaCategoriesManager](components/SevaCategoriesManager.js)) + public reader `GET /api/seva-categories`. The donate page shows pickable Seva cards (Annadaan/Deep Daan…) that set the amount + prefill the message; falls back to plain presets when empty. Added a **sponsorship aside** → /contact. Note: `withDefaults` is now array-safe (seva_categories is the first array-typed setting).
  - **Venue facility cards on /event** — new `events.facilities` jsonb (`[{icon,title,note}]`, whitelisted; editor is a repeater in Event Setup). Renders Parking/Meals/… cards. **Re-run `run_all.sql`**.
  - **/event overview cards + Rituals + Downloads** and **/contact info-as-cards** (see prior entry's §I note).
  - **Navbar polish** — removed "Watch live" + "News" from the primary nav (7 items now); glass-nav less transparent on scroll (`0.72→0.92` + shadow) so hero text no longer bleeds through; language switcher rebuilt as a luxury popover (globe + checkmark) instead of a native `<select>`.
  - **Live banner fix** — the banner is no longer `sticky top-0` (it and the navbar were both sticky, so the glass navbar rode over it on scroll); it now scrolls away cleanly, leaving the navbar as the sole sticky element.
  - i18n: `section_lineup_accent`, `section_highlights_kicker`, `donate_seva_*`, `donate_sponsor_*`, `facilities_*`, `event_*`, `contact_*` (en/hi/mr).
- **2026-07-19 (Phase 9C/G/H + logo + link fixes)**
  - **/registration richness (9H)** — "per Yajmaan · one-time" price note, per-tier **availability progress bars** (% filled from seatsTaken/max_capacity, "only N left"), and an "Already registered?" lookup card. No admin change.
  - **/about richness (9G)** — **value cards** (Mission/Vision… via a new `event_highlights` section `about`, added to the highlight-section selector in [HomeContentManager](components/HomeContentManager.js)), **Previous Mahayagyas** (archived events `show_in_archive`), and a gallery snippet → /gallery. Two-line accent headings throughout.
  - **Contact Messages admin (9C)** — new `GET|PATCH|DELETE /api/admin/contact-messages` (`settings:manage`) + [ContactMessagesManager](components/ContactMessagesManager.js) inbox under Communications (mark read/unread, reply-by-email, delete, unread count). Added `contact_messages.is_read`. **Re-run `run_all.sql`**.
  - **Downloads restored (9C)** — public `media_library.is_download` docs now render as a **Downloads** section on **/event** (fetched in [event/page.tsx](app/(site)/event/page.tsx)); editor already existed in Media Library.
  - **Logo + wordmark together** — the nav/footer now show the logo IMAGE *and* the two-line wordmark side by side (previously a logo_url hid the wordmark).
  - **Broken anchor links** — homepage `#livestream` anchors (which landed nowhere when no stream was live) now point to the `/live` page.
  - **Inner-page heading accents** — /about + /event decorative section headings converted to the two-line Cinzel + Cormorant-italic pattern.
- **2026-07-19 (Phase 9A + Contact/Social consolidation)**
  - **Contact & Social decoupled from the event.** Contact phone / email / address + Instagram / Facebook / YouTube now live in **`app_settings.contact`** (new registry entry in [appSettings.js](lib/appSettings.js) + `getContact()` cached reader in [siteEvent.js](lib/siteEvent.js), tag `contact-info`), NOT on the event record. New **Settings → Contact & Social** admin panel ([ContactSocialManager.js](components/ContactSocialManager.js)) under the Communications group is the single edit point. Removed the social inputs from Event Setup ([EventRow](components/admin/EventRow.tsx)) and the phone input from Home Content ([HomeContentManager](components/HomeContentManager.js)). Footer, /contact page and the floating WhatsApp button read `getContact()`; legacy `events.contact_phone/instagram_url/facebook_url/youtube_url` columns are kept but no longer read or written. No SQL re-run required (app_settings already exists).
  - **Homepage preview links (Phase 9A).** "See full…" CTAs added across homepage sections (About→/about+/event, Schedule→/event#schedule, Gallery→/gallery, News→/news, FAQ→/faq+/contact, Registration→/registration). Peak-day card rendered in AboutMahayagya; schedule intro + per-day date/theme rendered in SchedulePreview (from `events.schedule_days`). New `home_*` i18n keys (en/hi/mr).
  - **Donations admin** — Razorpay payment ref shown in the table + CSV; a paid/anonymous/pending breakdown makes clear anonymous donations *are* counted (the list also shows unpaid rows). API select widened in [donations route](app/api/admin/donations/route.js).
- **2026-07-19 (public UX port, part 2)**
  - **Devotional content sections + testimonials.** Ported from the marketing-site build; our app stays the engine. Full-stack + EN/HI/MR + build-verified. **Re-run `supabase/run_all.sql`** (new table + two columns).
    - **Testimonials** — new **`event_testimonials`** table (`name, location, quote, is_published, sort_order, translations`). Route `GET|POST|PATCH|DELETE /api/admin/testimonials` (`settings:manage`); admin CRUD in the **Testimonials** block of [HomeContentManager](components/HomeContentManager.js) (add / hide-eye / delete); homepage renders published quotes in a card grid just above FAQ→Tickets (social proof before the buy). Curated marketing quotes — deliberately **separate from the post-event `feedback` table** so it works before any feedback exists.
    - **Leadership hero (Guruji)** — new **`event_guests.is_featured`**. A ★ toggle in the admin lineup marks one guest as featured; the homepage renders featured guests as a large photo+bio "Under the Guidance Of" section above the normal lineup grid (which now shows only non-featured guests).
    - **Pillars / Blessings** — new **`event_highlights.section`** (`'highlights'` default / `'pillars'` / `'blessings'`). One highlight card can be filed under a section (a selector in the admin highlight form); each non-empty section renders as its own homepage block (3 Pillars grid; Blessings & Benefits grid). Ritual "Highlights" keeps its curated-default fallback.
    - New i18n `section_leadership_*` / `section_pillars_*` / `section_blessings_*` / `section_testimonials_*` (en/hi/mr).
- **2026-07-19 (public UX port, part 1)**
  - **Adopting UX from the marketing-site build into our app (our app stays the engine).** Two shipped slices, each full-stack + EN/HI/MR + build-verified. **Re-run `supabase/run_all.sql`** (two additive columns).
    - **"Most Chosen" tier badge** — new `categories.is_recommended` boolean. Admin toggles it per tier ([CategoryRow](components/admin/CategoryRow.tsx), whitelisted in [categories route](app/api/admin/categories/route.js)); the public ticket card gets an orange ring + a "⭐ Most Chosen" ribbon ([HomeContent.js](components/HomeContent.js)). i18n `category_recommended`. (Suppressed when the tier is full.)
    - **"By the numbers" stats strip** — new `events.stats` JSONB (`[{value,label}]`). Admin edits it as an add/remove repeater in Event Setup ([EventRow](components/admin/EventRow.tsx), whitelisted in [events route](app/api/admin/events/route.js)); a dark counter strip renders right under the hero when non-empty. Values are free text ("36+", "3 Days") so they render as-is.
    - Still to port (larger, content-model decisions pending): **Testimonials**, and the **Guruji / Pillars / Blessings** devotional sections.
- **2026-07-19 (even later)**
  - **Checkout ([components/CheckoutForm.js](components/CheckoutForm.js)) — reliability fixes, an order summary, and a size cleanup.**
    - 🔴 **Stuck-loader bug fixed:** the paid-checkout `fetch('/api/razorpay')` had no `try/catch`, so a dropped connection left the full-screen "Opening secure payment gateway…" overlay up forever (only a reload escaped) on the most-used path. Now caught → shows an error, clears the loader.
    - **Dead-button friction fixed:** on failed validation the form now scrolls to + focuses the first invalid field and shows a "fix the highlighted fields" banner (previously tapping Pay with an error up-top did nothing visible).
    - **Razorpay dismiss feedback:** closing the gateway without paying now shows "Payment cancelled — try again" (`modal.ondismiss`).
    - **Itemised order summary** above the Pay button (Ticket + Seva = Total, plus Pay-now/Balance for part-payment) so the amount is never a surprise. New i18n `alert_network`/`alert_payment_cancelled`/`alert_fix_fields`/`form_sum_*` in en/hi/mr.
    - **Cleanup:** removed two dead `{true && (…)}` wrappers. Extracted the pure canvas receipt → [lib/checkoutReceipt.js](lib/checkoutReceipt.js) and the presentational success screen → [components/checkout/CheckoutSuccess.js](components/checkout/CheckoutSuccess.js) (behaviour-preserving). **CheckoutForm 1413 → 1129 lines.** Verified build.
    - Deferred (overlap with the UI dev's styling pass): donation preset chips, sticky mobile Pay bar, native-input→MUI consistency on attendee names.
- **2026-07-19 (later still)**
  - **Public homepage — conversion UX.** Two low-risk changes in [components/HomeContent.js](components/HomeContent.js) (kept small on purpose — section *placement* is the fellow dev's UI lane; coordinate before larger reshuffles):
    - **Always-visible desktop "Register" CTA.** The nav `#categories` link is now a filled orange button; the header is `sticky`, so Register is reachable from anywhere on desktop without scrolling (mobile already had the sticky bottom bar in [FloatingActions.js](components/FloatingActions.js)). Neutralises "the tickets section is far down the page".
    - **FAQ moved to just above the tickets** (was below), so common objections are answered right before the buy decision. Verified build: static pages still prerender `○`.
    - Deliberately NOT done yet (bigger, merge-conflict-prone with the UI dev): relocating the tickets block above Lineup/Schedule and pushing Downloads to the bottom. Recommended order on file if wanted.
- **2026-07-19 (later)**
  - **RBAC audit fixes — read-scoping + a data-integrity hole.** No SQL.
    - 🔴 **PII was returned to every logged-in volunteer.** `GET /api/admin/data` streamed the **entire `registrations` table** (name/phone/email/DOB/address/payment) to *any* authenticated session, regardless of permission — the UI hid the Registrations tab, but the data was one fetch away. Now the raw rows are returned **only** with `registrations:view`; a role without it gets `[]`. Dashboard tiles for a `dashboard:view`-only volunteer are fed by a new **server-computed `stats.dashboard`** aggregate (numbers only, no PII), and the row-level analytics (DashboardAnalytics / Sales-by-Category / per-category chips) are hidden without `registrations:view`. See §17 `/api/admin/data`.
    - 🔴 **Other reads were open to any authenticated user** — now permission-gated: `checkins` GET → `scanlog:view`; `payment-proof/[id]` → `payments:verify`; `registration-activity` + `registration-notes` GET → `registrations:view`; `qr/[id]` → `registrations:view` (was `requireAdmin:false`). Writes were already correctly gated; this closes the read side.
    - 🔴 **The status dropdown could fabricate "Paid" with ₹0.** Flipping a `pending` row to **✔ Paid** (or **⏪ Refunded**) from the ledger dropdown recorded **no money** (`amount_paid` stayed 0, no ticket via the money flow, no real refund) yet made the row QR-eligible and seat-holding — the source of the health check's "Paid with ₹0 recorded" anomalies. Removed `completed`/`refunded`/`amount_mismatch` from the dropdown **and** from the server's `VALID_STATUSES`. Completion must now go through a money-recording path (Razorpay capture, offline **Approve**, or walk-in **Record ₹**); refunds through the **Refund** button. ⚠️ Existing "Paid with ₹0" rows are pre-existing bad data — clean them separately.
    - ✅ Verified clean: every one of the 44 admin routes has an `authorize()` guard; UI tab/button gating already matched permissions; queries are parameterized (no injection); secrets stay masked.
- **2026-07-19**
  - **Admin auth hardening — the shared env password is gone.** Login is now **database-only**: every admin/volunteer is an `admin_users` row with a scrypt-hashed password. Removed the `ADMIN_PASSWORD` (and the already-dead `VIEWER_PASSWORD`) login fallback from [app/api/admin/login/route.js](app/api/admin/login/route.js) — a shared secret in env can't be attributed to a person or rotated per user, and an env-login session had no `uid`, so its actions logged as a faceless "admin".
    - **Bootstrap/recovery is a local CLI, not a secret in env:** new **`npm run create-admin`** ([scripts/create-admin.mjs](scripts/create-admin.mjs)) hashes a password and upserts an `admin_users` row using the service-role key from `.env.local` (no dependency; loads `.env.local`/`.env` itself; hidden password prompt; supports `--username/--password/--name/--role`). Re-running an existing username **resets** it — this is also the break-glass if all accounts are lost.
    - **Destructive-delete re-auth now checks your OWN password.** [verifyAdminPassword](lib/adminGuard.js) is now `async (session, password)` and verifies against the signed-in user's `admin_users` hash (was: the env `ADMIN_PASSWORD`). Wired through the three delete routes (events/tiers/media). More secure *and* attributable, and it works for a volunteer with `settings:manage` using their own password.
    - **Health/launch check** swapped the `ADMIN_PASSWORD set` item for **"≥1 active admin account exists"** (counts `admin_users`), since that — not an env var — is now what "can anyone log in?" depends on. Login UI copy + `.env.example` updated; **no SQL** (uses the existing `admin_users` table).
    - ⚠️ **Deploy note:** create at least one admin (`npm run create-admin`) **before** removing `ADMIN_PASSWORD` from Vercel, or you'll lock yourself out. `SESSION_SECRET` is still required.

- **2026-07-14 (later still)**
  - **Phase 3, part 2 — Email templates, WhatsApp templates, QR config, gateway status.** See **§19d**. New Settings → **Templates & Config**. No SQL (all new `app_settings` keys).
    - **Email copy now has exactly ONE home.** [lib/emailTemplates.js](lib/emailTemplates.js) holds all 11 transactional emails; every sender (`ticket`, `notify` ×3, `payments`, `send-qr`, `waitlist`, `feedback`, `donate/verify`, `resend-balance`) was refactored to `sendTemplatedEmail({to, kind, vars})` and passes **data only** — no inline HTML remains anywhere. Admin overrides live in `app_settings.email_templates`; **only overrides are stored**, so "Reset to default" is a delete and the default can never drift from what the code sends.
    - **Tiny template engine:** `{{var}}` (HTML-escaped), `{{{raw}}}` (only for values we generate, e.g. the QR data URI), `{{#if x}}…{{/if}}`. Escaping is automatic and load-bearing — it's what stops a registrant named `<script>` from breaking out of the markup. Verified: XSS escaped, conditionals include/drop correctly (incl. `hadPaid=false` suppressing the no-refund line), data URI survives.
    - ⚠️ **Caught during the refactor:** `resend-balance` had its own *reminder* wording ("This is a reminder to clear your remaining balance…") which was about to be collapsed into the first-send `balance_link` copy — making an admin's chase email read like a fresh "thanks, your advance is received" confirmation. Restored as a separate **`balance_reminder`** template (and message kind).
    - 🐛 **Incidental fix:** `lib/ticket.js` referenced `WHATSAPP_TEMPLATES` **without importing it** — a latent `ReferenceError` on every ticket WhatsApp send. The key-based refactor removed the reference entirely.
    - **WhatsApp:** senders now pass a KEY and `sendWhatsAppTemplate()` resolves the real Meta name at send time (Settings → env → default), so a template re-approved under a new name needs no redeploy. Message bodies still live in Meta — only names are ours to set. The message-log **resend** still works because a literal name passes through unresolved.
    - **QR config:** size / download size / margin / colours / signed-link lifetime, applied in both QR paths; defaults are exactly the old hardcoded values.
    - **Payment gateway is READ-ONLY on purpose** — configured, **test-vs-live** (from the `rzp_test_`/`rzp_live_` prefix), webhook + `CRON_SECRET` presence, email/WhatsApp status. Key id masked, secret never returned. Keys stay in env: putting a live payment secret in a DB row an admin panel can read/write would be a genuine security downgrade.
- **2026-07-14 (later)**
  - **Phase 3, part 1 — Branding & SEO.** See **§19c**. New Settings → **Branding & SEO** panel; no SQL needed (`app_settings` already existed).
    - **Settings are now a registry.** [lib/appSettings.js](lib/appSettings.js) declares each `app_settings` key with defaults + a sanitiser, and `/api/admin/app-settings` serves them all generically instead of being hardcoded to `bank_details` (which still works untouched). Part 2's keys drop straight in.
    - **Branding re-themes the site without touching ~260 call sites.** The site hardcodes `bg-orange-600` / `text-gold-400` everywhere; rather than re-tokenise all of it, `globals.css` maps Tailwind's **orange + gold scales onto CSS variables**, so every existing class becomes themeable for free. ⚠️ **The variable defaults are the exact values Tailwind already emitted**, and `brandCss()` returns `''` when branding is untouched — so an unconfigured site is **byte-identical** to before (verified in the built CSS: `--brand-600: #ea580c`, and `bg-orange-600` → `var(--brand-600)`). A picked colour is expanded server-side into a full 50→900 ramp so tints/hovers stay in-family, **with the 600 step pinned to the seed verbatim** — pick `#1d4ed8` and the buttons are exactly `#1d4ed8`, not the ramp's approximation. No "dark colour" knob: dark headers use `neutral-900`, which is also body text.
    - ⚠️ **The layout's branding read goes through `unstable_cache` (1h, tagged), on purpose.** A plain DB call in the root layout would make **every** page dynamic — including the static `/terms`, `/privacy`, `/pitham`, `/feedback`. Verified they still build as `○`. Saving busts the tag via `revalidateTag`, so changes land immediately rather than after an hour. The CSS is inlined in `<head>` (not a stylesheet request) so there's no flash of the default palette. New `BrandingProvider` context carries `site_name`/`logo_url` to client components (Footer alone is used on three pages); colours don't need it — CSS variables already do that job.
    - ✅ **Fixed a live bug:** `/og-image.jpg` was referenced by the metadata but **never existed in the repo**, so shared links had no preview image unless the active event had a hero image. SEO settings now provide a real `og_image`. The homepage still prefers the active event's own title/description/image.
- **2026-07-14**
  - **Phase 4 — Media library + documents.** See **§19b**.
    - **The real bug it fixes:** uploads used to go straight to storage and only the returned URL was kept on whatever row was being edited. Nothing recorded the upload — so files couldn't be browsed, couldn't be reused (the same photo was uploaded once per field), and couldn't be deleted. **Every replaced image was orphaned in the bucket forever.** New `media_library` table indexes every file.
    - **Two buckets, because visibility is a STORAGE decision, not a UI flag.** Public files → the existing public `event-media`. **Private** documents (contracts, sponsor decks, invoices) → a new private **`admin-docs`** bucket with **no public URL at all**, opened only via a short-lived signed URL from `GET /api/admin/media-file/[id]` (same pattern as `payment-proofs`). Hiding a contract in the UI while it sat behind a permanent public URL would not be privacy. Images are always public — they can't render from a private bucket. Both buckets auto-create.
    - **All four document uses wired:** homepage **Downloads** section (`is_download`), **attachment on a news item** (`event_news.attachment_url`/`attachment_name` — denormalised on purpose so the announcement survives the library row being deleted), **attached to the ticket email** (`attach_to_ticket`), and **internal-only** private files. ⚠️ Ticket attachments are **capped at 5 MB** (vs the 25 MB upload limit) because the file rides on *every* confirmation email and many inboxes bounce over ~10 MB.
    - **Email attachments** required re-opening the one provider-specific seam: `sendEmail({ attachments: [{url, filename}] })` is neutral, and `deliver()` maps it to Resend's `{path, filename}`. **This is now the single thing a provider swap must re-map** — §18's runbook says so.
    - **`components/MediaPicker.js` replaces `ImageUpload`** in all six media fields (gallery, tier image, guest photo, hero image, sponsor logo, news image): browse-and-reuse *or* upload. New Settings → **Media Library** panel (search, copy link, publish flags, delete). **Deleting checks whether the file is still in use** and returns 409 with the exact places, so it can't silently break a page; the admin can force it.
    - 🗑️ **Deleted the old `POST /api/admin/upload-image` and `components/ImageUpload.js`.** Leaving an upload path that doesn't index its file would just re-create the orphan bug. Verified no references remain.
    - **Video upload was deliberately NOT built** — video stays as YouTube embeds. Supabase Storage gives no transcoding and no adaptive bitrate, and you pay egress: one 500 MB file watched by 1,000 people is 500 GB billed. YouTube does it free and better.
    - **Action required:** re-run `supabase/run_all.sql` (adds `media_library` + `event_news.attachment_*`).
- **2026-07-13 (later still)**
  - **Phase 5 — News / announcements + Live stream.** See **§16b**.
    - **News** — new `event_news` table + `GET|POST|PATCH|DELETE /api/admin/news` (`settings:manage`) + a **News & Announcements** block in Home Page Content (headline / details / image, all translatable via `TranslatableField`, so Hindi + Marathi come free). An **eye** toggle flips `is_published`, so an item can be drafted or pulled from the site without deleting it; only published rows reach the public page, and the homepage section hides itself entirely when there are none. Deliberately a homepage section only — no `/news` route or per-article permalinks (chosen scope).
    - **Live stream** — new `events.livestream_url` / `livestream_is_live` / `livestream_banner`. The URL takes a **YouTube link in any form** (reusing the existing `lib/youtube.js` normaliser) **or any other provider's iframe embed URL**, used as-is — so you're not locked to YouTube. Admin pastes the URL ahead of time and hits **🔴 Go live**: the toggle is a separate one-click save from the rest of the event fields, so going live can't also commit half-typed countdown/helpline edits. **Live requires BOTH the toggle and a URL** (enforced in the API, the homepage and the banner) — a toggle with no URL would render an empty player, so it counts as not-live and the admin UI refuses it. It shows as a dark **player section** high on the homepage (`#livestream`) **plus a site-wide sticky banner**.
    - ⚠️ **Design note worth keeping:** the sticky banner is a **client** component hitting the new public `GET /api/livestream`, *not* a server read in the root layout. The layout is a static server component — a DB call there would force **every** page (including the static `/terms`, `/privacy`, `/pitham`, `/feedback`) to render dynamically per request. The client fetch keeps them static (verified `○` in the build output) and the 60s poll makes the bar appear for someone already on the page when you go live. Don't "simplify" it into the layout.
    - Also added `livestream_url` / `livestream_banner` to the **events PATCH whitelist**, with `livestream_is_live` handled outside the falsy-to-null loop (as `show_in_archive` already is) — otherwise toggling *off* would have written `null` instead of `false`. New i18n keys (`live_*`, `section_live_*`, `section_news_*`) in all three languages.
    - **Action required:** re-run `supabase/run_all.sql` (adds `event_news` + the three `events.livestream_*` columns).
- **2026-07-13 (later)**
  - **🐛 Fixed: the Create New Event form was Hindi-only — new events could never be given Marathi.** Every other admin editor (`EventRow`, `CategoryRow`, `HomeContentManager`, `FormFieldsManager`) already used the config-driven [TranslatableField](components/admin/TranslatableField.tsx), which renders one input per non-English entry in `LANGUAGES`. The **create-event** form in `app/admin/page.tsx` was the one straggler: it hardcoded five Hindi-only fields (`newEventTitleHi`, `newEventShortHi`, …) with `(हिंदी)` placeholders, so a newly-created event had to be re-opened and edited before Marathi could be entered at all. It now uses `TranslatableField` over a single `newEventTr` state (`{ [lang]: { [field]: value } }`) fed straight to `buildTranslations()`. **Marathi — and any future language — now appears automatically, everywhere.** (English title/short/long were `required` on the old raw inputs; `TranslatableField` has no `required` prop, so that validation moved into `handleCreateEvent`.) Verified: no hardcoded `_hi` inputs remain anywhere in `app/` or `components/`.
  - **Email is now provider-neutral (one-file swap).** The `resend` SDK is imported in exactly ONE place and all 11 callers go through `sendEmail({to,subject,html})`, so switching provider is a one-file change — but three incidental spots still *named* Resend and would have rotted after a swap. Fixed: the provider call is isolated into a single **`deliver()`** function in [lib/email.js](lib/email.js) (takes `{to,subject,html}` → `{ok,error}`); env vars are now **`EMAIL_API_KEY` / `EMAIL_FROM`**, with the legacy `RESEND_*` names still honoured as a fallback so existing deployments keep working untouched; and the Data Health launch check now asks `emailConfigured()` instead of reading `process.env.RESEND_API_KEY` by name (it would otherwise have gone falsely red after a swap). Vendor names are out of user-facing strings too. See the swap runbook in §18. Notably **no email uses attachments / cc / bcc / reply-to** — the fields where provider APIs actually diverge — so there is no provider-specific shape to port.
  - **🐛 Fixed: `run_all.sql` was not idempotent — a second run crashed** with `ERROR: column "day_label_hi" does not exist`. The 2026-07-10 entry below claimed "the `ADD COLUMN`s earlier in the script briefly re-create [the `_hi` columns] each run" — **that was only true for 3 of the 8 tables.** `events`/`categories`/`page_content` get their `_hi` columns back from an `ADD COLUMN IF NOT EXISTS` in sections 0a/0b, but `event_schedule`, `event_highlights`, `event_guests`, `event_faqs` and `form_fields` declared theirs **inside `CREATE TABLE IF NOT EXISTS`**, which is a **no-op once the table exists**. So after section 9c dropped them on the first run, they were gone for good, and 9b's unguarded `UPDATE … SET x = day_label_hi` failed to even parse on the next run. **Fix:** 9b's backfills are now wrapped in a `DO $mig$` block that checks `information_schema.columns` and only `EXECUTE`s the backfill for tables whose legacy column still exists (each table's `_hi` columns are dropped together in one `ALTER`, so one representative column per table is a sound check). It backfills on a pre-migration DB and skips silently on a migrated one. Also removed the dead add-then-drop churn: the `_hi` columns are no longer created in 0a/0b or in the `CREATE TABLE`s, so a fresh DB never makes them just to drop them. Same fix mirrored in `schema.sql`. **Lesson: `CREATE TABLE IF NOT EXISTS` does NOT add columns to an existing table — never rely on it to re-create one.**
  - **Phase 6 — Sponsors, anonymous donations, message log.**
    - **Sponsors** — new `sponsors` table + `GET|POST|PATCH|DELETE /api/admin/sponsors` (`settings:manage`) + Settings → **Sponsors** ([components/SponsorsManager.js](components/SponsorsManager.js)): name, tier (Title/Gold/…), amount, logo (URL or upload), contact, notes, with a total-committed tile. Deliberately **admin-recorded only** — no public sponsor form, no Razorpay (a company committing a large sponsorship does not self-serve through a checkout) — and **not shown on the public site**.
    - **Anonymous donations** — a donor can now give **without their name being recorded at all** (not merely hidden): `donations.name` becomes nullable, `is_anonymous` marks the row, the public Seva form gets a checkbox that disables the name field, and the receipt email greets them generically instead of rendering `Namaste null`. Admin list + CSV show "Anonymous". Contact details stay optional-but-kept so the receipt can still be emailed. New i18n keys (`donate_anonymous`, `donate_anonymous_hint`, `donate_anon_donor`) in **all three** language files.
    - **Message log + resend** — new `message_log` table, `lib/messageLog.js`, `GET|POST /api/admin/message-log`, and Settings → **Message Log** ([components/MessageLogPanel.js](components/MessageLogPanel.js)). See **§12b** for the design. The key decisions: logging is done **inside `sendEmail()` and the WhatsApp `post()` helper**, not at the ~15 call sites, so the log is **complete by construction**; and **resend replays the stored payload** rather than re-deriving the message, so a retry can't silently produce different content than the failure was about. Delivery events also merge into each person's **activity timeline**. ⚠️ `MESSAGE_KINDS` lives in the client-safe `lib/messageKinds.js` because `messageLog.js` imports `supabaseAdmin` — importing the constant from there into a client component would have pulled `SUPABASE_SERVICE_ROLE_KEY` into the browser bundle (verified absent from `.next/static` after the split).
    - **Skipped by decision:** visitor/pageview analytics. "Conversion rate" therefore keeps its current meaning (paid ÷ payment attempts), which already exists — a true visitor→registration rate needs tracking that isn't built.
    - **Action required:** re-run `supabase/run_all.sql` (adds `sponsors`, `message_log`, `donations.is_anonymous`, and makes `donations.name` nullable).
- **2026-07-13**
  - **Dashboard completion — Today's Registrations, Seva, Check-ins.** Three new stat tiles: **Today's Registrations** (local-midnight onward, with a `N paid · ₹X` sub-line; computed client-side from the already-loaded rows), **Seva Raised** (standalone `donations` total + count, clicks through to Settings → Donations) and **Checked In** (unique registrations scanned, as a % of paid, clicks through to Scan Log). The latter two need data outside the registrations array, so `GET /api/admin/data` now returns a **`stats`** block — and it is **permission-scoped**: `donations`/`donationsTotal` only for `settings:manage`, `checkedInRegs` only for `scanlog:view`. A role without the permission gets `null` and the tile is hidden, so the tile can't leak a total the role couldn't already reach through its own panel. `DashboardAnalytics` gained a third trend card, **Seva · last 14 days** (the grid goes 2-col → 3-col when donations are visible). ⚠️ Note the two distinct "donations": `registrations.donation_amount` (the add-on inside a registration, already in Sales by Category) vs. the `donations` table (the standalone Seva page) — the new tile and chart mean the latter, and the copy says so.
  - **Cancel a registration (admin only, never a refund).** New `POST /api/admin/cancel-registration` + a **Cancel registration** button in the detail modal, new terminal status **`cancelled`**, a **🚫 Cancelled** section tab, and new `registrations.cancelled_at` / `cancellation_reason` columns. Design decisions, all deliberate: (1) **`requireAdmin: true`** — no volunteer permission grants it, not even `registrations:manage`, because cancelling destroys a seat-hold and voids a pass; (2) **a reason is mandatory** (server 400s without one) and lands on the row, in the audit log (`registration.cancel`), and in the customer's email; (3) **it never touches money** — `amount_paid`/`amount_due`/`razorpay_payment_id`/`offline_reference` are left as-is so the payment record survives, and returning money stays a separate explicit Refund/Reverse. The confirm dialog, the email ([notifyCancelled](lib/notify.js), which links the no-refund policy) and a banner on the cancelled row all state the no-refund fact plainly, since "cancel = my money comes back" is the one thing an operator or customer would wrongly assume. (4) **The seat releases itself** — every capacity count in the app is an *allowlist* of statuses and `cancelled` is in none of them, so **zero** capacity code changed. Keep future capacity counts allowlist-shaped. (5) On success the route hands back that tier's oldest-first `waiting` waitlist entries and the UI nudges the admin to notify the next person — previously the waitlist was a dead-end list with nothing to trigger it. Cancelling an already-ended row (`cancelled/refunded/failed/closed`) is rejected. **Action required:** re-run `supabase/run_all.sql` (adds the two columns + the new CHECK value).
  - Fixed two stale facts in this doc: the admin nav is **6 tabs** (Scan Log was promoted long ago), and the read-only **`viewer` role no longer exists** — it's `admin` / `volunteer` with per-permission RBAC.
- **2026-07-10 (later)**
  - **Retired the legacy `_hi` columns — `translations` JSONB is now the sole model.** With every read (`pick()`) and write (all editors) on the JSONB model, the old per-column `_hi` fields are dead weight, so they've been removed end-to-end. **SQL:** new **section 9c** in both `run_all.sql` + `schema.sql` `DROP COLUMN IF EXISTS` every `_hi` column across `events`, `categories`, `event_schedule`, `event_highlights`, `event_guests`, `event_faqs`, `form_fields`, and `page_content` — it runs **after** the 9b backfill (which already copied Hindi into `translations.hi`), so it's lossless and idempotent (the `ADD COLUMN`s earlier in the script briefly re-create them each run; 9b skips already-migrated rows; 9c drops them again). **Code:** stopped writing `_hi` everywhere — event/category/schedule/highlight/faq/guest/form-field routes (removed from whitelists/COLS), the four `HomeContentManager` add-forms, `FormFieldsManager`, `EventRow`/`CategoryRow` (dropped the legacy seed + mirror), and the admin **create-event** form (now sends Hindi via `translations.hi` built with `buildTranslations`). Removed the `_hi` fields from `app/admin/types.ts`, the `label_hi` output from `lib/formFieldsServer.js`, and the one admin-list preview that read `s.title_hi` (now `s.translations.hi.title`). `pick()`'s generic legacy fallback is kept as a harmless no-op. **Action required:** re-run `supabase/run_all.sql` on the live DB to perform the drop (safe to run anytime — it backfills first). Verified `tsc` clean + production build.
  - **Language switcher is now a dropdown** (`LangToggle` → a `<select>` driven by `LANGUAGES`) instead of the inline button group.
- **2026-07-10**
  - **Multilingual content → JSONB model complete (Phases 3b + 4; Marathi live).** Finishes the migration begun on 2026-06-28. **Phase 3b (admin editors now WRITE `translations`):** new reusable `components/admin/TranslatableField.tsx` renders the English (base) input plus one input per non-English `LANGUAGES` code, writing to a `{ hi:{…}, mr:{…} }` map — add a language to `LANGUAGES` and every editor grows a field automatically. Wired into `EventRow` (title/short/long/date/venue/travel_info), `CategoryRow` (title read-only base + description/detailed_description), `HomeContentManager` (schedule, guests, highlights, FAQ add-forms), and `FormFieldsManager` (custom field label). Each still mirrors Hindi into the legacy `_hi` columns so `pick()`'s fallback never goes stale. Routes now whitelist `translations`: `events`, `categories`, `schedule`, `highlights`, `faqs`, `guests`, `form-fields` (the last only includes it when non-empty, so it still inserts pre-migration). `lib/formFieldsServer.js` now surfaces each field's `translations` so custom-label Marathi resolves on the public form. **Phase 4 (UI strings + picker):** new `lib/lang/mr.js` (full Marathi dictionary, mirrors en/hi) + two new keys `contact_us_title`/`contact_us_desc` in all three; `LanguageProvider` registers `mr` (type `'en'|'hi'|'mr'`, dicts, accepts any `LANG_CODES` value from storage, `toggle()` cycles all configured langs); `LangToggle` is now a config-driven N-way picker (uses `LANGUAGES[].short`); the two hardcoded "Contact Us" strings + the `DEFAULT_HIGHLIGHTS` fallback cards in `HomeContent` are now language-keyed; the server-only `/pass/[id]` page resolves from a `DICTS` map so `bb_lang=mr` works. Verified: `tsc` clean + production build compiles. **To add a 4th language later:** add it to `LANGUAGES`, create `lib/lang/<code>.js`, register it in `LanguageProvider` dicts + `Lang` type — no editor or route changes.
- **2026-06-28**
  - **Multilingual content → JSONB model (Phases 1–2, non-breaking; en/hi/mr).** Moving admin-entered content off per-column `_hi`/`_mr` suffixes onto one `translations` JSONB per row (`{ "hi": {...}, "mr": {...} }`; English stays in base columns as the fallback) so adding a language is config + data, not a schema migration. **Phase 1 (SQL):** added `translations JSONB` to the 7 content tables (`events`, `categories`, `event_schedule`, `event_highlights`, `event_guests`, `event_faqs`, `form_fields`) and **backfilled** existing Hindi into `translations.hi` (idempotent; in both `run_all.sql` + `schema.sql`). Nothing reads it yet — the app still uses `_hi` columns, so zero behaviour change. **Phase 2 (code):** new `lib/i18n.js` — `LANGUAGES` config (en/hi/mr), `pick(row, field, lang)` (falls back JSON → legacy `_lang` column → English), `buildTranslations()`. **Phase 3a (reads, verified):** all public display reads now use `pick()` — `HomeContent`, `FaqAccordion`, `CheckoutForm` (custom field labels), `RegisterPageContent`, `PreviousEventsContent` — so content renders in the active language from `translations` (with the `_hi` fallback intact, so nothing breaks pre-migration). Remaining: Phase 3b (admin editors write `translations` + routes accept it) and Phase 4 (`mr.js` + 3-way picker) — **both completed 2026-07-10 (see entry above).** Legacy `_hi` columns kept as a safety net.
  - **New `supabase/schema.sql` — one-shot setup for a FRESH database.** `run_all.sql` only *extends* pre-existing base tables; a brand-new/empty DB has none. `schema.sql` is the self-contained version: it CREATEs the base tables (`events`, `categories`, `registrations`, `event_media`, `page_content`) with their grants, then runs the entire `run_all` body (columns, feature tables, constraints, RLS, grants). Use `schema.sql` on a new project; keep using `run_all.sql` (idempotent) on the existing one. Still create the private `qr-codes` + `payment-proofs` buckets manually (public `event-media` auto-creates on first upload).
  - **Refactor: split the giant admin file (behaviour-preserving).** `app/admin/page.tsx` was **1893 → 1355 lines** (−28%), all pure moves, verified after each step (`tsc` clean + production build). Extracted: shared **types** → `app/admin/types.ts`; **constants + `statusClasses`** → `app/admin/constants.ts`; the self-contained editors **`CategoryRow`** + **`EventRow`** → `components/admin/`; the **registration detail modal** → `components/admin/RegistrationDetailModal.tsx` (presentational, takes a typed props bag of state + callbacks); and the CSV/Excel/receipts/financial **export builders** → `lib/adminExports.ts` (pure functions of the row set). Dead imports cleaned up along the way. (Remaining candidate: the ledger table + section tabs — the most state-coupled piece; left for a later verified pass. `CheckoutForm.js` (1413 lines) is the other split candidate.)
  - **i18n coverage for all customer-facing pages.** Moved every hardcoded string on the public pages into the central language files (`lib/lang/en.js` + `hi.js`) so text is edited in one place: **Donate**, **Find My Registration** (`/my-pass`), **Feedback**, **Waitlist modal**, **Footer**, and the server-rendered **Pass** page. Added ~80 bilingual keys (`donate_*`, `mypass_*`, `fb_*`, `wl_*`, `footer_*`, `pass_*`). Standalone pages got a **language toggle**. For the server-only `/pass/[id]` page (can't use the client hook), `LanguageProvider` now also mirrors the chosen language into a **`bb_lang` cookie**, and the page resolves keys from the same dictionaries server-side. (Admin panel stays English — it's an internal tool; legal pages `terms`/`privacy`/`refund` remain English content by design.)
  - **Multi-attendee names + post-event feedback.**
    - **Multi-attendee names** — new `registrations.attendees` JSONB (array of `{name}`). The public form shows a name field per additional attendee when the count > 1; online + offline routes sanitize & store them (`lib/attendees.js`). Shown in the admin detail modal. Optional — blank names are just omitted.
    - **Post-event thank-you + feedback** — new `feedback` table + public **`/feedback`** page (star rating + comment) → `POST /api/feedback` (attaches to the active event). Admin **Settings → Feedback** (`FeedbackManager`): a **"Send thank-you to all Paid"** button (`POST /api/admin/feedback`, `reminders:send`) emails/WhatsApps a thank-you + feedback link to every paid attendee, plus the response list + average rating (`GET`, `settings:manage`).
  - **Self-service "Find my registration" (send-only, safe).** Public **`/my-pass`** page: a registrant enters their phone → `POST /api/my-registration` re-sends their **pass link(s)** to the email/WhatsApp **already on file** (never shown on screen, never to whoever typed the number), so it's safe without OTP. Rate-limited (5/phone/hour via new `self_service_requests` table), generic response (no enumeration). New public **`/pass/[id]`** page renders the scannable QR for a paid registration (encodes the same `/entry/<id>` verify URL) or the status + a "Complete payment" button for an unpaid one; the id is an unguessable UUID. Footer links added for **Find My Registration** + **Donate/Seva**. Added `types/qrcode.d.ts` (the package ships no TS types).
  - **Dynamic SEO + Seva/donations + Plan Your Visit.**
    - **Dynamic link preview + SEO** — `app/page.tsx` now has `generateMetadata()` that builds the `<title>`/description + Open Graph + Twitter card from the **active event** (title, date, venue, `hero_image_url`), so a shared WhatsApp/social link shows the real event with its hero image (falls back to `/og-image.jpg` — ⚠️ that file doesn't exist yet; add a 1200×630 image to `public/`, or rely on the event hero image). Added **Event JSON-LD** structured data for a rich Google result.
    - **Seva / Donations** — standalone `donations` table + public **`/donate`** page (preset/custom amount, name/phone/email/message → Razorpay checkout). `POST /api/donate` creates the order; `POST /api/donate/verify` confirms via **HMAC signature** (donations aren't seat-managed, so no webhook dependency), marks completed, emails a receipt. Homepage **Seva CTA** section links to it. Admin **Settings → Donations** (`settings:manage`) lists contributions + total raised + CSV export.
    - **Plan Your Visit** — new `events.travel_info` / `travel_info_hi` columns (edited in Event Setup), rendered as a homepage section near the venue map for directions/parking/stay. New i18n `section_travel_title`, `section_seva_*`, `category_join_waitlist`.
  - **Central email config (`lib/email.js`) + WhatsApp payment/waitlist templates wired.** All email sending now goes through `lib/email.js` — `EMAIL_FROM` (from `RESEND_FROM`), a singleton Resend client, `sendEmail({to,subject,html})` (returns bool, checks the Resend error), `emailShell(inner)` (shared branded wrapper), and `emailConfigured()`. Every sender (ticket, payment/balance link, offline notify, resend-balance, broadcast, waitlist, QR pass) was refactored to use it — one place for the sender address + API key at deploy time. Separately, **payment-link and waitlist WhatsApp now use templates** (`WHATSAPP_TEMPLATES.paymentLink` params `[name,tier,amount,payLink]`; `waitlistOpen` params `[name,tier,registerLink]`) instead of free-form text, so they work outside the 24h window once the templates are approved. Required template bodies are documented in `lib/whatsapp.js`.
  - **Central WhatsApp config (`lib/whatsapp.js`).** All WhatsApp template names + the send helpers now live in ONE file so you can add/update templates in one place at deploy time. `WHATSAPP_TEMPLATES` registry (each env-overridable: `WHATSAPP_TEMPLATE_TICKET`/`_ANNOUNCE`/`_PAYMENT`/`_WAITLIST`, plus `WHATSAPP_TEMPLATE_LANG`) and helpers `sendWhatsAppTemplate` / `sendWhatsAppText` / `sendWhatsAppImage` / `waConfigured` / `normalizeIndianPhone`. Every WhatsApp send site (ticket confirmation, broadcast, payment/balance links, offline notify, waitlist notify, QR pass, health check) was refactored to use it — removing ~6 copies of the fetch boilerplate and adding a proper HTTP-status check (fetch doesn't throw on HTTP errors, so failures were previously silent). **Reminder:** payment-link and waitlist WhatsApp still send free-form text (only delivers inside the 24h window); their template names are pre-registered so they can be switched to `sendWhatsAppTemplate` once Meta approves them.
  - **Broadcast + waitlist + check-in undo.**
    - **Broadcast** — `POST /api/admin/broadcast` (needs `reminders:send`) + `components/BroadcastModal.js` (Broadcast button on the Registrations toolbar). Sends a custom announcement (email free-form via Resend + optional WhatsApp) to a segment: All Paid, Paid-by-tier, Advance-paid, Open enquiries, or Paid-but-not-arrived. Dedupes by phone, caps at 1000, audited. **WhatsApp uses a pre-approved template** (`WHATSAPP_ANNOUNCE_TEMPLATE`, default `announcement`); email always works.
    - **Waitlist** — new `waitlist` table. Full tiers on the homepage show **Join the waitlist** → `WaitlistModal` → public `POST /api/waitlist` (idempotent per phone+tier). Admin **Settings → Waitlist** (`WaitlistManager` + `/api/admin/waitlist`, `settings:manage`): grouped by tier, **Notify** sends a registration link (email + WhatsApp) when a seat frees and marks them notified, **Remove** drops them. New i18n `category_join_waitlist`.
    - **Check-in undo** — `DELETE /api/admin/checkins` (needs `scanlog:view`, audited as `checkin.undo`) + an **Undo** button on every Scan Log row, so a wrong scan/manual entry can be reversed and the person re-scanned.
  - **Error-proofing batch: health check, manual check-in, delivery tracking.**
    - **Data Health & Launch Check** — new admin-only `GET /api/admin/health` + `components/HealthPanel.js` on the Dashboard. Data audit flags (severity + examples): Paid with ₹0 recorded, Paid short of total, Advance-paid without a balance link, same phone paid twice in the *same* category (cross-category is fine by design), ticket delivery failures, Paid without QR sent, offline proofs waiting >48h, oversold tiers. Launch checklist verifies env keys (Razorpay/webhook/session/admin/Resend/WhatsApp/scanner-pin/site URL), an active event, payable tiers, checkpoints, and the qr-codes/payment-proofs buckets.
    - **Manual check-in fallback** — `components/ManualCheckin.js` on the Scan Log tab: search Paid registrations by name/phone, pick a checkpoint, confirm → checks them in via the same `/api/checkin/[id]` endpoint with a new `manual: true` flag (new `checkins.manual` column). Scan Log rows show a purple **MANUAL** tag. Solves "QR won't scan / never arrived" at the gate.
    - **Ticket delivery tracking + retry** — `dispatchTicket` now records outcomes to new `registrations.ticket_email_status` / `ticket_wa_status` / `ticket_sent_at` columns ('sent'/'failed'/'skipped'), and checks the WhatsApp HTTP status (fetch doesn't throw on HTTP errors — failures were previously invisible). Ledger rows show a pulsing ⚠️ retry button when a Paid row's delivery failed; retry = Resend confirmation (re-runs dispatchTicket, refreshing statuses). Health check also lists them.
    - Duplicate-phone *warning on creation* was deliberately skipped — one person may enroll in multiple categories; only same-phone-same-category double-pays are flagged (in the health check).
  - **Event-day ops panel + global search.** New `GET /api/admin/event-ops` (requires `scanlog:view`) returns live attendance aggregates from paid registrations + `checkins`: arrived vs. expected headcount, % arrived, groups arrived / yet-to-arrive, per-checkpoint breakdown, and recent scan rate (last 15/30 min) + last-scan time. New `components/EventOpsPanel.js` renders it as a dark command-center card at the **top of the Scan Log tab**, auto-refreshing every 20s. **Global search** — a bar under the admin header (`can('registrations:view')`) that filters the already-loaded registrations by name / phone / email across **every status/tab**; clicking a result opens that person's detail modal. Added `full_name` to the client `Registration` type.
  - **RBAC — two roles: admin + volunteer.** The **viewer** role was removed (a view-only volunteer covers that need); `admin_users` roles are now `admin`/`volunteer` only, the env `ADMIN_PASSWORD` login yields admin (VIEWER_PASSWORD path removed), and `run_all.sql` migrates any legacy `viewer` rows to `volunteer` before re-applying the CHECK. New shared catalog `lib/permissions.js` (permission keys + `effectivePermissions`/`hasPermission`/`expandPermissions`); `admin_users` gains a `permissions JSONB` column. A **volunteer** login gets exactly the capabilities an admin ticks via checkboxes in **Settings → Admin Users** (create Admin/Volunteer; edit a volunteer's access inline). Permissions: `dashboard:view`, `registrations:view/manage`, `qr:send`, `export:data`, `payments:verify/refund`, `reminders:send`, `enquiries:manage`, `scanlog:view`, `audit:view`, `settings:manage` (acting on registrations auto-implies `registrations:view`). Enforcement is **two-layer**: `authorize({ requirePermission })` gates 24 mutation routes server-side (the real boundary; `users`/`reminders` stay admin-only), and the admin UI hides tabs/buttons a volunteer lacks. **Admin = full access (unchanged); admin always bypasses permission checks.**
  - **Add Registration modal — pincode autofill + full validation.** The admin Add Registration form now (a) auto-fills **Taluka + State from the 6-digit pincode** (India Post lookup, same as the public form) and (b) enforces the **same client-side validation** as the public checkout: names/gotra letters-only, valid email, valid 10-digit Indian mobile, **required 6-digit pincode**, numeric donation, DOB not-in-future, and **per-tier age restriction** (DOB required + min/max age when the tier limits age, with the age hint shown). Per-field inline errors. The `create-registration` server route was tightened to match (letters-only names/gotra, required pincode).
  - **Image upload (in addition to URL).** Admins can now upload an image from their computer instead of pasting a link. New `POST /api/admin/upload-image` (admin only, multipart) stores the file in a **public `event-media` Supabase bucket** (auto-created on first upload — no manual dashboard step) and returns its permanent public URL. New reusable `components/ImageUpload.js` "Upload" button sits next to the URL field on the **Media gallery**, **category image**, **guest photo**, and **hero background image** fields — the URL field still works for pasted links. Validates type (JPG/PNG/WEBP/GIF/AVIF) + 6 MB max.
  - **Hero background image editor.** Added a **Hero Background Image** field (URL + upload + live preview + Clear) to Settings → Event Setup; it feeds `events.hero_image_url` behind the homepage hero (dark overlay auto-applied). Also **fixed the events PATCH whitelist** to include `hero_image_url`, `instagram_url`, `facebook_url`, `youtube_url` — without this the hero image and social links silently failed to save.
  - **Homepage: Contact Us + socials, reminder removed.** Removed the "Get a Reminder" opt-in section from the homepage. Added a compact **Contact Us** block (kept last, before the footer): phone call button + social handle buttons (Instagram / Facebook / YouTube / Location). Social URLs are per-event, editable in **Settings → Event Setup** (new `events.instagram_url` / `facebook_url` / `youtube_url` columns; Maps reuses `map_url`). Each icon renders only if its URL is set. Brand icons are inlined SVGs (lucide dropped them for trademark reasons).
  - **Homepage: tighter + Saffron & Gold refresh.** Reduced section padding, heading sizes, hero, and card sizes for a more compact feel. Adopted a **Refined Saffron & Gold** palette: new Tailwind v4 theme tokens in `app/globals.css` — `--color-gold-50…700`, `--color-ivory`, `--font-serif` (system serif stack, CSP-safe) — plus `.gold-divider` and `.shadow-warm` utilities. Homepage now uses **ivory** surfaces, **serif display headings**, small **gold toran dividers** under section titles, warm gold-tinted borders/shadows, and gold accent details (nav underline, CTA ring, seats-left badge). (A mantra strip + hero 🕉️ were briefly added then removed per request — no mantra/Om is shown.)
  - **Admin batch: 4 operability features.**
    - **Manual Add Registration** — admin can create a registration from scratch for a walk-in (never used the public form). New `POST /api/admin/create-registration` (admin only): price is looked up from the tier (server-authoritative), admin picks identity + outcome (`completed` → ticket dispatched, `advance_paid` → balance recorded, `pending` → record only) + offline method/reference. New `components/AddRegistrationModal.js` + an **Add Registration** button on the Registrations tab. New `registrations.created_by_admin` boolean column.
    - **Per-person activity timeline** — the registration detail modal now shows a merged, newest-first timeline of every audit event + contact note for that person. New `GET /api/admin/registration-activity?registrationId=` + `components/RegistrationActivity.js`.
    - **One-click reminders** — `POST /api/admin/bulk-remind { kind:'pending'|'balance' }` sends payment links to all abandoned Pending checkouts (full amount) or balance links to all Advance-Paid rows, via `sendPaymentLink()` (email + WhatsApp). Buttons live in the Pending and Advance-Paid section banners. Capped at 200/click.
    - **Named admin accounts** — optional layer over the shared-password login. New `admin_users` table (scrypt-hashed passwords via `lib/passwordHash.js`), `GET/POST/PATCH/DELETE /api/admin/users` (admin only), and **Settings → Admin Users** (`components/AdminUsersManager.js`). Login now accepts an optional username: with one, it authenticates against `admin_users`; blank falls back to env `ADMIN_PASSWORD`/`VIEWER_PASSWORD` (unchanged). The session now carries `{ role, username, name, uid }`, and `logAudit` fills `actor_id`/`actor_label` so the audit log records **who** acted (the panel already renders `actor_label`).
  - **Dashboard graph fixes** — bar charts were collapsing to flat lines (broken `h-full` height chain); fixed so bars scale to the tallest day. Added a one-line hint under each analytics card explaining what it shows. Registrations chart = all sign-ups (any status); Revenue chart = paid-only.
  - **Audit summaries now name the person** — every `payment.*`, `registration.status_change`, `registration.edit`, and `registration.refund` audit line ends with `— <First Last> (<phone>)`, so a log row tells you *which* registration it touched. Online **refund** and offline **reverse / cheque-bounced** actions now require a reason (stored in audit metadata; the refund reason is also attached to the Razorpay refund `notes`). Refund body `amount` is in **rupees**; the route converts ×100 to paise for Razorpay and rejects any amount above the tier total.
  - **Scan dedup + tab + pagination** — re-scanning the same QR at the same checkpoint no longer adds a row (DUPLICATE, one row per reg+checkpoint). Scan Log promoted to a top-level admin tab (after Enquiries) with its own pagination. Registrations page size 50→25 (so it paginates sooner). Homepage: venue map moved to a compact bottom section, schedule shows a day divider, video thumbnails smaller, social-proof pill removed.
  - **Homepage additions** — **guest/artist lineup** (new `event_guests` table + `/api/admin/guests` + editor in Home Content + public grid), **embedded venue map** (Google Maps iframe from the venue + "Get Directions" to `map_url`), and **social proof** ("Join N+ registered devotees" from the paid count). Removed the leftover test `<h1>` placeholders from the homepage.
  - **Bulk receipts + financial statement** — Registrations tab: **Receipts PDF** (print-friendly combined receipts for PAID rows in the current date/filter → save as one PDF) and **Financial** (paid-only .xls statement with receipt numbers + total). Client-side, instant, respects the date-range filter. No GST (simple receipts); a server-side emailed-PDF job can be added later if needed.
  - **Dashboard analytics** — [components/DashboardAnalytics.js](components/DashboardAnalytics.js): daily registrations + revenue (14-day bars), payment conversion %, enquiry pipeline, per-tier fill %. Nav **work badges** (to-verify count on Registrations, new-enquiry count on Enquiries). All computed client-side from loaded data; no chart dependency.
  - **Manage a registration** — detail modal now has **Edit details** (all personal/contact/custom fields via [EditRegistrationModal.js](components/EditRegistrationModal.js) → `PATCH /api/admin/registrations` with `{updates}`, editable even on completed rows), **Resend confirmation** (`/api/admin/resend-confirmation`), and **Refund** (`/api/admin/refund`, full/partial via Razorpay; full → `refunded`).
  - **Toasts + modal dialogs** — [lib/uiStore.js](lib/uiStore.js) + [components/Toaster.js](components/Toaster.js) replace every browser `alert/confirm/prompt` across admin (page, Enquiries, Payment Settings, Form Fields) with in-page toasts and modals. `toast.success/error/info`, `await confirmDialog()`, `await promptDialog()`.
  - **Excel export** — Registrations tab now has CSV **and** Excel (.xls) export of the filtered set (incl. payment mode + reference).
  - **Scan Log** — admin Settings → Scan Log ([components/ScanLogPanel.js](components/ScanLogPanel.js), `GET /api/admin/checkins`): every entry scan with name/category/checkpoint/time/status, filter by checkpoint + search, total-scans & unique-attendees counts.
  - **Multi-day calendar** — `events.end_at` + Event end field in Home Content; "Add to Calendar" now spans the real event days (all-day multi-day .ics/Google when start/end differ).
  - **Form validation tightening** — first/last name + gotra letters-only (any script); pincode always shown + required (6-digit, client + all submit routes); donation numeric-only; gotra hint "if unknown, use Kashyap".
  - **Per-tier age restriction** — `categories.min_age`/`max_age` (blank = open to all). Age computed from DOB in [lib/age.js](lib/age.js); enforced client-side (CheckoutForm, DOB forced required) **and** server-side (razorpay / enquiry / offline routes). Admin sets it per tier; home card + form show the limit ("Ages 14+").
  - **Security hardening** — admin **login lockout** (5 failed attempts/IP → 15-min cooldown, Supabase-backed `admin_login_attempts`, fail-open); **HTML-escape** all user/admin text in outbound emails ([lib/escape.js](lib/escape.js) applied across ticket/notify/payments/send-qr/resend-balance). Reminder: set strong `ADMIN_PASSWORD`/`VIEWER_PASSWORD`/`SESSION_SECRET` in prod env; put Cloudflare + per-IP rate limiting + Turnstile in front before launch.
  - **Payment-mode filter + row label** in the Registrations ledger (All Modes / Online / Bank / Cheque / Cash / DD); each row shows "via <mode>". Home + register pages show the fee on enquiry tiers that have a price.
  - **Clear Abandoned pending** — admin action on the Pending tab (`POST /api/admin/clear-pending`) marks pending checkouts older than N hours (default 24) as `failed`. Safe: pending only completes via a captured payment, so stale pending had none.
  - **Offline payments** — bank transfer / cheque / cash / DD with proof upload + admin verification. Public method chooser in checkout; new statuses `payment_review`/`cheque_received`/`payment_rejected`; verification queue (To Verify / Cheque Pending / Rejected) with approve/reject/cheque-clear/reverse + walk-in "Record ₹"; global **Payment Details** settings (`app_settings.bank_details`); private **`payment-proofs`** bucket. New routes: `offline-payment`, `admin/verify-payment`, `admin/payment-proof/[id]`, `admin/app-settings`. New: [lib/notify.js](lib/notify.js), [components/PaymentSettingsManager.js](components/PaymentSettingsManager.js). Offline holds no seat until approved; excluded from Razorpay reconciliation. **Run `run_all.sql` + create the `payment-proofs` bucket.**
  - **Enquiries leads pipeline** — new admin **Enquiries** tab (separate from the ledger): New/Contacted/Payment Link Sent/Closed stages, running **contact-notes history** (`registration_notes` table), **Request Payment** to convert a lead at the tier's fixed price (reuses the payment-link engine → same record completes), Close/Reopen. New category flag **`allow_enquiry`** (Paid + Enquire Now); enquiry tiers can carry a price/fee. New statuses `awaiting_payment` + `closed`. **Capacity now counts only Paid + Partial Paid** (open enquiries don't hold a seat). New routes: `request-enquiry-payment`, `registration-notes`; `sendBalanceLink` generalised to `sendPaymentLink(reg, kind)`.
  - **Admin auto-refresh** — registrations list polls every 30s (Dashboard/Registrations/Enquiries tabs) + manual Refresh button, "Updated" timestamp, and Auto ON/OFF toggle in the header. No more manual page reloads.
  - **Receipt download** on the registration success screen (canvas PNG; name/email/mobile/gotra/category/amounts/refs/date).
  - **Copy balance link** button in admin (manual share when WhatsApp fails).
  - **QR only for Paid** — `send-qr` + `qr/[id]` enforce `completed`; added `qr_sent_at` tracking and smart "send only unsent" bulk UX.
  - **Admin restructure** — 4-tab nav (Dashboard/Registrations/Settings/Audit), mobile card view, sticky bulk bar, status section tabs.
  - **Audit logging** — `admin_audit_logs` table, `logAudit` on all mutating routes, Audit tab. (Fixed missing `service_role` GRANT that made it silently empty.)
  - **Payment reconciliation Layers 1 & 2** — shared [lib/payments.js](lib/payments.js); webhook refactored through it; amount assertion; `/api/cron/reconcile`; admin "Sync payment"; `balance_link_id` stored; ticket sender extracted to [lib/ticket.js](lib/ticket.js).
  - **Amount-mismatch fix** — assertion now flags **shortfalls only** (was strict equality, which false-flagged legit part payments due to customer-fee-bearer); mismatch rows are re-healable via cron/Sync.
  - **Gateway loader** — full-screen "Opening secure payment gateway…" overlay after Proceed to Payment.
  - **Cron Hobby-safe** — `vercel.json` daily schedule; documented external-scheduler option.

> _Add new changes above this line (under the current date), newest first._
