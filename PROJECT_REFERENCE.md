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
`id, event_id→events, title(+_hi), description(+_hi), detailed_description(+_hi), price, media_url, is_full, is_enquiry_only, allow_enquiry (also show "Enquire Now" on a paid tier), max_capacity, show_availability, max_attendees_per_reg (default 5, ceiling 20), show_emi_badge, allow_part_payment, advance_percent (% of PRICE taken as advance, default 25)`.

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

### `event_schedule` / `event_highlights` / `event_faqs` / `event_reminders` / `event_media`
Homepage content per event (programme, ritual cards, FAQ accordion, reminder opt-ins, gallery image/YouTube).

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
- `PATCH /api/admin/registrations` — change status (rejects terminal/locked).
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
