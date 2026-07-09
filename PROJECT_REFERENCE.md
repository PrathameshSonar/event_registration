# BaglaBhairav Event Registration — Master Reference

> **Single source of truth for this project.** Read this before changing code. It covers every feature, the data model, every API route, the payment/reconciliation engine, the admin panel, operations, and gotchas.
>
> **⚠️ KEEP THIS UPDATED.** Whenever a feature, route, column, env var, or flow changes, update the relevant section **and** the Changelog at the bottom. This file is meant to stay accurate.
>
> Last updated: 2026-06-28.

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
| Email | **Resend** |
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
| `RESEND_API_KEY` / `RESEND_FROM` | Email sending (verified domain) |
| `WHATSAPP_API_URL` / `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API (optional) |
| `SCANNER_PIN` | PIN for `/scan` staff |
| `SESSION_SECRET` | Signs admin session JWT (`openssl rand -base64 32`) |
| `ADMIN_PASSWORD` / `VIEWER_PASSWORD` | Two admin roles |
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
      registrations/route.js   PATCH: change status (locked for terminal states)
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
- Status: `payment_status` (see §20), `created_at`
- CHECK constraint allows: `pending, completed, failed, refunded, enquired, contacted, amount_mismatch, advance_paid`

### `profiles` (canonical user, keyed by E.164 phone)
`id, phone UNIQUE, email, salutation, first_name, last_name, full_name, gotra, gender, date_of_birth, pincode, taluka, state, verified_at, created_at, updated_at`. Upserted on every registration; registrations link via `profile_id`.

### `checkpoints` / `checkins`
`checkpoints(id, name, sort_order, is_active)`. `checkins(id, registration_id→reg, checkpoint_id→checkpoint, scanned_at)` — one row per scan (full audit trail; duplicates allowed and detected).

### `form_fields` / `category_field_settings`
Catalog of registration fields + per-category visibility/required/order. See §13.

### `event_schedule` / `event_highlights` / `event_guests` / `event_faqs` / `event_reminders` / `event_media`
Homepage content per event (programme, ritual cards, **guest/artist lineup**, FAQ accordion, reminder opt-ins, gallery image/YouTube). `event_guests`: `name(+_hi), role(+_hi), photo_url, bio(+_hi), sort_order`. All need `GRANT ALL ... TO service_role`.

### `registration_notes`
Contact-history log for the enquiry pipeline: `id, registration_id→registrations (cascade), note, actor_role, created_at`. One row per note. Needs `GRANT ALL ... TO service_role`.

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

### Balance link re-send — [app/api/admin/resend-balance/route.js](app/api/admin/resend-balance/route.js)
Admin action: re-sends (or freshly creates) the balance link for an `advance_paid` reg; stores `balance_link_url`/`balance_link_id`.

---

## 9. Reconciliation (Layers 1 & 2)

Goal: DB matches Razorpay's reality; no silent under-recording or underpayment.

- **Layer 1 — amount assertion** (in the finalizers above): every capture is checked; a shortfall → `amount_mismatch` (status is locked, no ticket, surfaced via the **Amount Mismatch** section tab in admin). Over/equal is accepted.
- **Layer 2 — scheduled cron** [app/api/cron/reconcile/route.js](app/api/cron/reconcile/route.js): walks `pending` / `advance_paid` / `amount_mismatch` rows in the last `RECONCILE_WINDOW_DAYS` (default 30, batch 100) and calls `reconcileRegistrationWithRazorpay()`:
  - `pending`/`amount_mismatch` → fetch the order's payments; a captured payment → `finalizeOrderCapture` (heals missed webhooks; re-evaluates wrongly-flagged mismatches; genuine shortfalls stay flagged).
  - `advance_paid` → fetch the balance link (by `balance_link_id` or `reference_id`); if paid → `finalizeBalancePaid`.
  - Writes an audit entry (`actor_role: 'system'`, action `reconcile.cron`) when it changes anything.
  - **Auth:** `Authorization: Bearer $CRON_SECRET` (Vercel sends this automatically; external schedulers must add it).
- **Admin "Sync payment"** [app/api/admin/reconcile-balance/route.js](app/api/admin/reconcile-balance/route.js): same `reconcileRegistrationWithRazorpay` path, triggered by the green ↻ button on `advance_paid` + `amount_mismatch` rows. Verified against Razorpay, never a blind mark-paid.

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

[app/admin/page.tsx](app/admin/page.tsx). Login at `/admin` (password → `admin` or `viewer`). Viewers are read-only and only see Dashboard + Registrations.

**Auto-refresh:** the registrations list silently re-fetches every 30s while on the Dashboard or Registrations tab (paused while a detail modal is open, or when toggled off via the **Auto ON/OFF** chip in the header). A manual **Refresh** button + "Updated HH:MM:SS" sit in the top header. So new registrations appear without reloading the page. (`refreshRegistrations()` updates only the registrations array — no loading flicker, no Settings disruption.)

**Top nav (5 tabs — Dashboard, Registrations, Enquiries, Settings, Audit — horizontally scrollable on mobile):**

### Dashboard (everyone)
Global overview: 3 stat cards (Confirmed Attendees, Total Revenue (Paid), Total Registrations — all **global**, not filtered), "Sales by Category" table, and per-category "Sales & Enquiries" chips.

### Registrations (everyone) — the ledger workspace
- **Filters:** search (name/gotra/phone), date range, event, category.
- **Section tabs** (saved views by status, with live counts respecting other filters): Master List, Enquired, Contacted, Advance Paid, Paid, Pending, **Amount Mismatch**, Failed, Refunded. Keys map to `payment_status` (RBAC-ready).
- **Desktop table / mobile cards** (no horizontal scroll on mobile). Shared render helpers keep both in sync.
- **Row actions:** view details (modal), download QR (Paid only), **Sync payment** ↻ (advance_paid + amount_mismatch), re-send balance link (advance_paid). Inline status dropdown for admins (locked for terminal states).
- **Bulk:** select rows → **Send QR** (smart, see §10), with sticky bar on mobile.
- **Detail modal:** full profile/payment/custom fields; balance link with **Copy link** + **Sync payment** buttons.
- **Export CSV** of the filtered set.

### Settings (admin only) — sidebar sub-tabs
Event Setup, Ticket Tiers, Media Gallery, Entry Checkpoints, Form Fields ([components/FormFieldsManager.js](components/FormFieldsManager.js)), Home Page Content ([components/HomeContentManager.js](components/HomeContentManager.js) — schedule/highlights/faqs/hero/contact). Destructive deletes (events/tiers/media) require **re-entering the admin password**.

### Offline payments (bank transfer / cheque / cash / DD)
A second, human-verified completion path alongside online Razorpay.
- **Public:** on a payable tier, [components/CheckoutForm.js](components/CheckoutForm.js) shows a **payment-method chooser** (Online + the offline methods enabled in settings) when `bank_details.offline_enabled` is on. Picking offline shows the bank/UPI/payee instructions, a **reference** field (UTR / cheque no / receipt no) and a **proof upload** (image/PDF; required for transfer/cheque). Submits to `POST /api/offline-payment` (multipart) → status **`payment_review`**, proof stored in the private **`payment-proofs`** bucket, user emailed "under verification". **No Razorpay order, no seat held.**
- **Admin verify** (Registrations tab, section tabs **To Verify** / **Cheque Pending** / **Rejected**): **View proof** (signed URL via `/api/admin/payment-proof/[id]`), **Approve** (confirm amount; short amount → `amount_mismatch`), **Reject** (reason → `payment_rejected`, user notified to resubmit). **Cheque** is two-step: **Cheque in hand** (→ `cheque_received`) → **Cleared** (→ `completed`) / **Bounced** (→ `failed`). Approved → `completed` + ticket + QR-eligible. Completed offline rows can be **Reversed** (→ refunded/failed, seat released) from the detail modal. All via `POST /api/admin/verify-payment`.
- **Walk-in / cash-at-desk:** admin **Record ₹** on a `pending`/`rejected` row (or an enquiry) → method + amount + reference → `completed` in one step.
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

## 17. Full API reference

**Public:**
- `POST /api/razorpay` — create order + pending registration.
- `POST /api/enquiry` — enquiry registration (enquiry-only or dual tiers).
- `POST /api/offline-payment` — offline payment submission (multipart: fields + proof) → `payment_review`.
- `GET /api/form-fields?categoryId=` — active fields for a category.
- `POST /api/reminders` — reminder opt-in.
- `GET /api/checkpoints` — active checkpoints.
- `POST /api/checkin/[id]` — record a scan (PIN or session). Returns NEW/DUPLICATE/NOT_PAID/INVALID.
- `POST /api/checkin/verify-pin` — validate scanner PIN.
- `POST /api/webhook/razorpay` — Razorpay webhook (HMAC-verified).

**Cron:**
- `GET|POST /api/cron/reconcile` — reconciliation (Bearer `CRON_SECRET`).

**Admin (session required; most `requireAdmin: true`):**
- `POST /api/admin/login`, `POST /api/admin/logout`.
- `GET /api/admin/data` — dashboard data (any role).
- `PATCH /api/admin/registrations` — change status (`{id,status}`, rejects terminal/locked) OR edit personal/contact/custom fields (`{id,updates}`, allowed on any row).
- `POST /api/admin/refund` — Razorpay refund (full/partial); full → `refunded`.
- `POST /api/admin/resend-confirmation` — re-send the confirmation email/WhatsApp for a completed reg.
- `POST|PATCH|DELETE /api/admin/categories` — tiers (DELETE needs password).
- `POST|PATCH|DELETE /api/admin/events` — events (+ setActive; DELETE needs password).
- `POST|DELETE /api/admin/media`, `…/highlights`, `…/faqs`, `…/schedule` — event content (GET on some).
- `GET|POST|PATCH|DELETE /api/admin/form-fields` — field catalog + per-category settings.
- `GET|POST|PATCH|DELETE /api/admin/checkpoints`.
- `GET /api/admin/reminders` — export opt-ins.
- `POST /api/admin/send-qr` — bulk QR send (completed only).
- `GET /api/admin/qr/[id]` — single QR PNG (completed only; 409 otherwise).
- `POST /api/admin/resend-balance` — re-send balance link.
- `POST /api/admin/reconcile-balance` — "Sync payment" against Razorpay (advance/pending/mismatch/awaiting_payment).
- `POST /api/admin/request-enquiry-payment` — convert an enquiry: set the tier price + send a payment link.
- `GET|POST /api/admin/registration-notes` — enquiry contact-notes history (GET any role; POST admin).
- `POST /api/admin/verify-payment` — offline verification (approve/reject/cheque steps/reverse/record).
- `GET /api/admin/payment-proof/[id]` — signed URL to an offline proof file.
- `GET|PATCH /api/admin/app-settings` — global config (`bank_details`; GET any role, PATCH admin).
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
| `ticket.js` | `dispatchTicket()` confirmation email + WhatsApp |
| `auditLog.js` | `logAudit()` fire-and-forget writer |
| `profiles.js` | `upsertProfile()` |
| `phone.js` | `normalizePhone()` → E.164 |
| `formFields.js` | Built-in field metadata (client+server safe) |
| `formFieldsServer.js` | Resolve/validate fields per category (server) |
| `youtube.js` | YouTube thumbnail/embed helpers |
| `lang/en.js`, `lang/hi.js` | Translations |

---

## 19. Components

`CheckoutForm.js` (registration+payment+receipt+enquire/pay choice), `RegisterPageContent.js`, `HomeContent.js`, `HomeContentManager.js` (admin home editor), `FormFieldsManager.js`, `AuditLogPanel.js`, `EnquiriesPanel.js` (leads pipeline), `LanguageProvider.tsx`, `LangToggle.js`, `Countdown.js`, `FaqAccordion.js`, `ReminderForm.js`, `AddToCalendar.js`, `ShareButtons.js`, `FloatingActions.js`, `Reveal.js` (scroll-reveal), `YouTubeEmbed.js`, `PreviousEventsContent.js`, `Footer.js`.

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
```

Offline pipeline (verified by admins, in the Registrations tab):
```
form → offline method → payment_review ──approve(bank/cash/dd)──► completed
                             ├─ cheque: cheque_received → completed / failed(bounced)
                             └─ reject → payment_rejected (resubmit) ; completed → reverse → refunded
```

- **Terminal/locked (not editable from the status dropdown):** `completed, failed, refunded, amount_mismatch, advance_paid, awaiting_payment, payment_review, cheque_received`.
- **QR eligibility:** `completed` only.
- **Capacity held by:** `completed` + `advance_paid` only (Paid + Partial Paid). Open enquiries and offline-pending (`payment_review/cheque_received/payment_rejected`) do NOT reserve seats.
- `amount_paid + amount_due` always equals `total_amount` (advance recorded; balance/enquiry link clears `amount_due` to 0).

---

## 21. Operations runbook & gotchas

1. **Razorpay webhook must subscribe to BOTH `payment.captured` AND `payment_link.paid`** (plus `payment.failed`, `refund.processed`). If `payment_link.paid` is off, balance payments are taken but the portal stays `advance_paid` — the classic "stuck advance" bug. Layer-2 cron + admin Sync are the backstop.
2. **`service_role` GRANTs.** Every server-written table needs `GRANT ALL ... TO service_role` (and BIGSERIAL tables also need the sequence grant). Missing = silent insert/select failures (this bit `admin_audit_logs`). All grants are in `run_all.sql`.
3. **Cron on Vercel Hobby** allows **once-daily** crons only — `*/15` fails the deploy (shows pricing page). Current `vercel.json` uses `0 3 * * *` (daily). For 15-min cadence: upgrade to Pro (restore `*/15 * * * *`) **or** add a free external scheduler (cron-job.org / GitHub Actions) hitting `/api/cron/reconcile` with `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in Vercel or the cron 401s.
4. **Customer fee bearer.** If enabled on Razorpay, `payment.amount` = order + fee (higher than expected). The amount check only flags **shortfalls**, so this is fine; standard fees come out of settlement and don't affect `payment.amount`.
5. **`qr-codes` private bucket** must exist in Supabase Storage or WhatsApp QR images fall back to text links.
6. **WhatsApp templates** must be approved in Meta for business-initiated messages (ticket, balance link, QR). Free-form text only works inside a 24h session.
7. **`RESEND_FROM`** must be a verified domain in production (not `onboarding@resend.dev`, which only mails your own Resend account).

---

## 22. Deploy checklist

- [ ] Run `supabase/run_all.sql` (creates tables + grants + RLS).
- [ ] Create private `qr-codes` storage bucket.
- [ ] Set all env vars (§4) in Vercel, incl. `CRON_SECRET`.
- [ ] Razorpay: enable EMI + Payment Links; webhook → `<site>/api/webhook/razorpay` with `payment.captured`, `payment_link.paid`, `payment.failed`, `refund.processed`; set `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Reconcile cadence: Pro `*/15` or external scheduler.
- [ ] Admin: create event → set active → add tiers → configure form fields → fill Home Content → add checkpoints.
- [ ] Approve WhatsApp templates; verify Resend domain.

---

## 23. Changelog

Keep newest first. Add an entry for every meaningful change.

- **2026-06-28**
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
