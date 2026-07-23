# BaglaBhairav Event Registration — Scenario Inventory & Master Test Plan

> Companion to [`PROJECT_REFERENCE.md`](PROJECT_REFERENCE.md). That file says **how it works**; this file says **what to test**.
>
> Structure: **Part A** = every scenario the system supports (public / staff / admin / system). **Part B** = executable test cases with IDs, preconditions, steps and expected results. **Part C** = data setup, matrices, and the pre-launch smoke suite.
>
> Last updated: 2026-07-22.

---

## Table of contents

- [Part A — Scenario inventory](#part-a--scenario-inventory)
  - [A1. Public (visitor / devotee)](#a1-public-visitor--devotee)
  - [A2. Staff (gate / scanner)](#a2-staff-gate--scanner)
  - [A3. Admin & volunteer](#a3-admin--volunteer)
  - [A4. System / background](#a4-system--background)
- [Part B — Test cases](#part-b--test-cases)
  - [B0. Environment & setup](#b0-environment--setup-env)
  - [B1. Public site — browsing](#b1-public-site--browsing-pub-site)
  - [B2. Registration form & declaration](#b2-registration-form--declaration-pub-reg)
  - [B3. Online payment (Razorpay)](#b3-online-payment-razorpay-pub-pay)
  - [B4. Part payment / advance](#b4-part-payment--advance-pub-part)
  - [B5. Offline payment submission](#b5-offline-payment-submission-pub-off)
  - [B6. Enquiry flow](#b6-enquiry-flow-pub-enq)
  - [B7. Donations / Seva](#b7-donations--seva-pub-don)
  - [B8. Waitlist](#b8-waitlist-pub-wl)
  - [B9. Self-service pass lookup](#b9-self-service-pass-lookup-pub-pass)
  - [B10. Contact, feedback, reminders](#b10-contact-feedback-reminders-pub-msc)
  - [B11. Live stream & news](#b11-live-stream--news-pub-live)
  - [B12. Language (EN/HI/MR)](#b12-language-enhimr-pub-i18n)
  - [B13. Entry pass, QR, scanner](#b13-entry-pass-qr-scanner-scan)
  - [B14. Admin auth & RBAC](#b14-admin-auth--rbac-adm-auth--adm-rbac)
  - [B15. Admin dashboard & health](#b15-admin-dashboard--health-adm-dash)
  - [B16. Registrations ledger](#b16-registrations-ledger-adm-reg)
  - [B17. Offline payment verification](#b17-offline-payment-verification-adm-ver)
  - [B18. Money operations](#b18-money-operations-adm-money)
  - [B19. QR sending](#b19-qr-sending-adm-qr)
  - [B20. Enquiries pipeline](#b20-enquiries-pipeline-adm-enq)
  - [B21. Scan log & manual check-in](#b21-scan-log--manual-check-in-adm-scan)
  - [B22. Settings — all panels](#b22-settings--all-panels-adm-set)
  - [B23. Audit log & message log](#b23-audit-log--message-log-adm-log)
  - [B24. Exports & broadcast](#b24-exports--broadcast-adm-exp)
  - [B25. Webhook](#b25-webhook-sys-wh)
  - [B26. Reconciliation](#b26-reconciliation-sys-rec)
  - [B27. Notifications (email / WhatsApp)](#b27-notifications-email--whatsapp-sys-msg)
  - [B28. Security & abuse](#b28-security--abuse-sec)
  - [B29. Performance, a11y, responsive](#b29-performance-a11y-responsive-nfr)
- [Part C — Matrices, data, smoke suite](#part-c--matrices-data-smoke-suite)
- [Appendix — Known doc/code discrepancies found while writing this](#appendix--known-doccode-discrepancies)

---
---

# Part A — Scenario inventory

## A1. Public (visitor / devotee)

### A1.1 Browsing & discovery
| # | Scenario |
|---|---|
| 1 | Land on **`/`** (home) — hero, stats strip, live-stream player (if live), about, pillars, rituals/highlights, schedule preview, lineup, leadership (featured guest), gallery, news, testimonials, FAQ, tickets/Seva cards, blessings, final CTA, downloads |
| 2 | Navigate the 7-item nav: Home · About · Event · Registration · Gallery · FAQ · Contact |
| 3 | **`/about`** — value cards, previous Mahayagyas archive, gallery snippet |
| 4 | **`/event`** — overview cards, schedule (per-day date/theme), rituals, venue facility cards, downloads, map link |
| 5 | **`/registration`** — all Sevas/tiers listed with price note, availability progress bar, "only N left", "Most Chosen" badge, per-Seva colour theme, "Already registered?" lookup card |
| 6 | **`/gallery`** — masonry images + YouTube embeds |
| 7 | **`/faq`** — accordion |
| 8 | **`/news`** — published announcements only, with attachments |
| 9 | **`/live`** — live stream page |
| 10 | **`/contact`** — info cards + contact form |
| 11 | **`/previous-events`** — archived events (`show_in_archive`) |
| 12 | **`/pitham`** — static info page |
| 13 | **`/terms`, `/privacy`, `/refund`** — legal pages (no-refund policy) |
| 14 | **`/feedback`** — post-event rating form |
| 15 | Countdown to `start_at`; Add-to-calendar; share buttons; floating WhatsApp/Register bar (mobile) |
| 16 | Site-wide **live banner** appears within ~60s of admin going live, on any page |
| 17 | Language switcher — EN / HI / MR, persists across pages via `bb_lang` cookie |

### A1.2 Registering
| # | Scenario |
|---|---|
| 18 | Pick a Seva → `/register/[id]` → **Step 1 Declaration** (Samanti Patra): read to bottom, enter Name + DOB + Mobile, accept |
| 19 | **Step 2**: dynamic form (built-in + admin custom fields), attendees count + per-attendee names, donation add-on, payment plan, terms checkbox |
| 20 | Pay **online (full)** via Razorpay → success screen + downloadable receipt PNG |
| 21 | Pay **online (advance / part payment)** → advance charged → balance link emailed/WhatsApped |
| 22 | Pay **offline** (bank transfer / cheque / cash / DD) → reference + proof upload → "under verification" |
| 23 | Pay **offline advance** (part-payment plan on an offline method) |
| 24 | **Enquire** on an enquiry-only tier, or on a paid tier with `allow_enquiry` |
| 25 | Registration **closed** (`registration_open=false` or event ended) → browse-only, "Registrations closed" |
| 26 | Tier **full** / capacity exhausted → blocked, waitlist offered |
| 27 | **Age gate** (`min_age`/`max_age`) rejects an out-of-range DOB |
| 28 | Razorpay modal **dismissed** without paying → "Payment cancelled — try again" |
| 29 | Network failure mid-order → error shown, loader cleared |
| 30 | Duplicate checkout attempt within 3 min (same email + tier) → 429 |

### A1.3 After registering
| # | Scenario |
|---|---|
| 31 | Receive **confirmation** email + WhatsApp |
| 32 | Receive **QR entry pass** email + WhatsApp (after admin sends) → opens `/pass/[id]` |
| 33 | Pay the **balance link** later → registration completes → pass issued |
| 34 | **`/my-pass`** — enter phone → pass link re-sent to the contact **already on file** |
| 35 | Get **cancelled** by admin → cancellation email (states no automatic refund) |
| 36 | Get **rejected** offline payment → email asking to resubmit |
| 37 | Join a **waitlist** on a full tier → later notified when a seat frees |

### A1.4 Giving (independent of registration)
| # | Scenario |
|---|---|
| 38 | **`/donate`** — declaration gate modal → pick a Seva category preset or enter a custom amount → pay → receipt email |
| 39 | Donate **anonymously** (name never stored) |
| 40 | Donation payment fails / is abandoned → row stays unpaid |

---

## A2. Staff (gate / scanner)

| # | Scenario |
|---|---|
| 41 | Open **`/scan`** → **sign in with a named account holding `checkin:scan`** → choose checkpoint → camera |
| 42 | Scan a **paid** pass → **NEW** — green, Seva name large, wristband colour block, beep |
| 43 | Re-scan at the **same** checkpoint → **DUPLICATE** + prior count |
| 44 | Scan the same pass at a **different** checkpoint → **NEW** again |
| 45 | Scan an **unpaid / advance / cancelled** pass → **NOT_PAID** |
| 46 | Scan a bogus/garbage QR → **INVALID** |
| 47 | Attendee opens the QR with a **plain phone camera** → `/entry/[id]` — VALID/INVALID, Seva, band colour, "Bands to give = N" |
| 48 | Multiple kiosks scanning independently at once |
| 49 | Camera permission denied / no camera → graceful message |
| 50 | Admin does a **manual check-in** from the admin Scan Log (no camera) |

---

## A3. Admin & volunteer

### A3.1 Access
| # | Scenario |
|---|---|
| 51 | Log in at `/admin` with an `admin_users` account (admin or volunteer) |
| 52 | Wrong password / unknown user / deactivated user → rejected |
| 53 | Session expires (8h) → back to login |
| 54 | Log out |
| 55 | Volunteer sees only the tabs/panels their permissions allow (**13 permissions**, incl. `checkin:scan`) |
| 56 | Break-glass: `npm run create-admin` re-creates/resets an account |

### A3.2 Dashboard
| # | Scenario |
|---|---|
| 57 | Stat tiles: Today's Registrations (+ "N paid · ₹X"), Confirmed Attendees, Total Revenue, Total Registrations, Payments to Verify, Seva Raised, Checked In |
| 58 | **Data Health** issues (7 checks) + **Launch Check** (14 checks); ERROR count badges the Dashboard tab |
| 59 | Analytics: 14-day registrations / revenue / Seva bars, payment conversion, enquiry funnel, tier fill |
| 60 | Sales by Category table + per-category Sales & Enquiries chips |
| 61 | Permission-scoped tiles hide (not zero) for a volunteer lacking the permission |
| 62 | Auto-refresh every 30s; Auto ON/OFF chip; manual Refresh; "Updated HH:MM:SS" |

### A3.3 Registrations ledger
| # | Scenario |
|---|---|
| 63 | Filter: search (name/gotra/phone), date range, event, category |
| 64 | 11 section tabs with live counts: Master · To Verify · Cheque Pending · Advance Paid · Paid · Pending · Amount Mismatch · Rejected · Failed · Cancelled · Refunded |
| 65 | Desktop table ↔ mobile cards parity (incl. Registered timestamp, amount split "Seva ₹A + Donation ₹B") |
| 66 | Open detail modal — profile, payment, custom fields, attendees, activity timeline, person donations |
| 67 | Edit personal/contact/custom fields (validated email + phone) |
| 68 | Change status via dropdown (terminal states locked; `completed`/`refunded`/`amount_mismatch` NOT settable) |
| 69 | **Add Registration** manually (walk-in / VIP) — ignores capacity, flags oversell in audit |
| 70 | **Sync payment** (single row) / **Sync all** (batch, 365d) |
| 71 | **Copy balance link** (silent) vs **Re-send balance link** (notifies) |
| 72 | **Reconcile** an `amount_mismatch` row |
| 73 | **Cancel registration** (admin only, reason mandatory, never refunds, returns waitlist) |
| 74 | **Refund** (full/partial) via Razorpay |
| 75 | **Adjust donation** (change/remove; cancels stale balance link; refuses overpayment) |
| 76 | **Resend confirmation** (all channels, or only the failed one) |
| 77 | Bulk select → **Send QR** (breakdown + resend toggle) |
| 78 | Export CSV / Excel / Receipts PDF / Financial statement over the filtered set |
| 79 | **Broadcast** a message to a filtered set |
| 80 | **Clear pending** — bulk-tidy stale pending rows |

### A3.4 Offline verification
| # | Scenario |
|---|---|
| 81 | **View proof** (signed URL) |
| 82 | **Approve** full amount → completed + ticket |
| 83 | **Approve short** → advance_paid (if partial) or amount_mismatch |
| 84 | **Reject** with reason → payment_rejected + notify |
| 85 | **Cheque**: in hand → cheque_received → Cleared (completed) / Bounced (failed) |
| 86 | **Record ₹** — walk-in cash at desk on a pending/rejected/enquiry row |
| 87 | **Reverse** a completed offline payment → refunded, seat released |

### A3.5 Enquiries pipeline
| # | Scenario |
|---|---|
| 88 | Section tabs: New · Contacted · Payment Link Sent · Closed/Lost · All Open |
| 89 | Add timestamped notes (first note auto-advances New → Contacted) |
| 90 | **Request Payment** → sets tier price, status `awaiting_payment`, sends link |
| 91 | Enquiry pays link → same row completes |
| 92 | **Close** (reason) / **Reopen** |

### A3.6 Settings (20 panels, 5 groups)
| Group | Panels |
|---|---|
| Website Content | Event Setup · Home Page Content · Page Headers · Media Gallery · Media Library |
| Sevas & Registration | Sevas & Tiers · Form Fields · Declaration · Consent Records · Waitlist · Entry Checkpoints |
| Payments & Donations | Payment Details · Donations · Donation Presets · Sponsors |
| Messages & Contact | Contact & Social · Contact Messages · Feedback · Templates & Config · Message Log |
| System | Admin Users · Branding & SEO |

Scenarios: create/edit/delete events (+ set active, destructive delete needs own password), tiers with all flags, form-field catalog + per-category settings, home content (schedule/guests/highlights/pillars/blessings/FAQ/news/testimonials/hero/countdown/registration-open toggle/live stream), media library (public + private buckets, in-use 409 + force), checkpoints + wristband colours, bank/UPI/offline methods, donations list + CSV, Seva presets, sponsors, contact & social, contact inbox, feedback, email/WhatsApp/QR templates + gateway status + test email, message log + resend, admin users + permissions, branding colours + SEO.

### A3.7 Audit
| # | Scenario |
|---|---|
| 93 | Filter audit log by entity, action, free text; verify every mutating action is recorded |

---

## A4. System / background

| # | Scenario |
|---|---|
| 94 | Razorpay webhook: `payment.captured`, `payment_link.paid`, `payment.failed`, `refund.processed` |
| 95 | Webhook signature verification (HMAC, constant-time) |
| 96 | Webhook retry / duplicate delivery → idempotent |
| 97 | Cron reconcile (daily, Bearer `CRON_SECRET`) heals missed webhooks |
| 98 | Amount assertion (Layer 1) — shortfall → `amount_mismatch`; over/equal accepted |
| 99 | Capacity oversell detection after the fact (`capacity.oversold` audit) |
| 100 | Email via ZeptoMail; WhatsApp via Meta templates; every send logged in `message_log` |
| 101 | Cache invalidation — settings/content edits reach the public site immediately |
| 102 | Profile upsert by E.164 phone across repeat registrations |

---
---

# Part B — Test cases

**Legend** — Priority: **P0** blocks launch · **P1** major · **P2** minor/cosmetic.
Each case: **ID | Title | Pre-conditions | Steps | Expected**.

---

## B0. Environment & setup (ENV)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ENV-01 | Fresh DB provisioning | Run `supabase/schema.sql` on an empty project | All base + feature tables, RLS, grants created; no error | P0 |
| ENV-02 | Migration idempotency | Run `supabase/run_all.sql` **twice** | Second run completes with no error (regression: `day_label_hi` crash) | P0 |
| ENV-03 | Buckets exist | Supabase → Storage | `qr-codes` (private), `payment-proofs` (private), `admin-docs` (private), `event-media` (public) | P0 |
| ENV-04 | service_role grants | Insert into `admin_audit_logs`, `message_log`, `media_library`, `sponsors`, `registration_notes` via app | No silent failures; rows appear | P0 |
| ENV-05 | Env vars complete | Admin → Dashboard → Launch Check | All 14 checks green (Razorpay keys, webhook secret, SESSION_SECRET, ≥1 admin account, email key, email sender, WhatsApp, **Gate scanner access**, SITE_URL, active event, payable tier, checkpoints, qr-codes bucket, payment-proofs bucket) | P0 |
| ENV-05a | Gate scanner access check | Remove `checkin:scan` from every volunteer, keep 1 admin | Launch Check | Green, reporting the admin count — an admin can always scan | P1 |
| ENV-05b | No leftover SCANNER_PIN | Grep the repo + Vercel env | No `SCANNER_PIN` reference remains; the launch check no longer mentions it | P1 |
| ENV-06 | `NEXT_PUBLIC_SITE_URL` correct in prod | Trigger a QR send | Links point to the production domain, **not** `localhost:3000` | P0 |
| ENV-07 | Email DC matches token | Settings → Templates & Config → Gateway → Send test email | Email arrives; no 401 (India `api.zeptomail.in` vs `.com`) | P0 |
| ENV-08 | Razorpay test vs live | Gateway status panel | Correctly reports test/live from key prefix; key id masked; secret never returned | P0 |
| ENV-09 | Webhook subscribed to all 4 events | Razorpay dashboard | `payment.captured`, `payment_link.paid`, `payment.failed`, `refund.processed` all enabled | P0 |
| ENV-10 | Cron auth | `GET /api/cron/reconcile` without Bearer | 401 | P0 |
| ENV-11 | Cron auth (valid) | With `Authorization: Bearer $CRON_SECRET` | 200 + counts | P0 |
| ENV-12 | Build | `npm run build` | Compiles; `/terms`, `/privacy`, `/pitham`, `/feedback` still prerender as `○` (static) | P1 |
| ENV-13 | Lint | `npm run lint` | No errors | P2 |

---

## B1. Public site — browsing (PUB-SITE)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-SITE-01 | Home renders with active event | 1 event `is_active` | Open `/` | Hero (title, date, venue, hero image), all sections render | P0 |
| PUB-SITE-02 | No active event | Set all events inactive | Open `/` | Page renders without crashing; graceful empty state | P1 |
| PUB-SITE-03 | Stats strip | `events.stats` = `[{value:"36+",label:"Rituals"}]` | Open `/` | Dark counter strip under hero, values rendered as-is | P1 |
| PUB-SITE-04 | Stats strip hidden | `events.stats` empty | Open `/` | Strip absent (no empty band) | P2 |
| PUB-SITE-05 | Countdown | `start_at` in future | Open `/` | Counts down d/h/m/s; ticks live | P1 |
| PUB-SITE-06 | Countdown past | `start_at` in past | Open `/` | Does not show negative values | P2 |
| PUB-SITE-07 | Nav items | — | Inspect nav | Exactly 7: Home, About, Event, Registration, Gallery, FAQ, Contact + Donate & Register buttons | P1 |
| PUB-SITE-08 | Register CTA hidden when closed | `registration_open=false` | Load any page | Navbar/footer/hero/floating Register CTAs all hidden | P0 |
| PUB-SITE-09 | Glass nav on scroll | — | Scroll home | Nav opacity 0.72→0.92 + shadow; hero text does not bleed through | P2 |
| PUB-SITE-10 | Featured guest → Leadership hero | 1 guest `is_featured` | Open `/` | Large photo+bio "Under the Guidance Of"; that guest excluded from the lineup grid | P1 |
| PUB-SITE-11 | Highlight sections | Highlights filed as `highlights` / `pillars` / `blessings` / `about` | Open `/` and `/about` | Each non-empty section renders as its own block; empty ones hidden | P1 |
| PUB-SITE-12 | Highlights fallback | No highlight rows | Open `/` | Curated default ritual cards render, language-keyed | P2 |
| PUB-SITE-13 | Testimonials | 2 published, 1 unpublished | Open `/` | Only published quotes; section hidden when none published | P1 |
| PUB-SITE-14 | News published only | 1 published, 1 draft | Open `/` and `/news` | Draft absent; section hidden when zero published | P0 |
| PUB-SITE-15 | News attachment | News item with attachment | Open `/news` | Attachment link works; survives deleting the media-library row | P1 |
| PUB-SITE-16 | Gallery | Images + YouTube rows | Open `/gallery` | Masonry renders; YouTube thumbnails/embeds work; lazy-loaded | P1 |
| PUB-SITE-17 | Schedule per day | `schedule_days` set | Open `/event#schedule` | Intro + per-day date/theme + items in order | P1 |
| PUB-SITE-18 | Facilities cards | `events.facilities` set | Open `/event` | Parking/Meals/etc. cards render with icons | P1 |
| PUB-SITE-19 | Downloads section | Media library doc with `is_download` | Open `/event` | Download appears and downloads correctly | P1 |
| PUB-SITE-20 | Private doc never public | Doc with `visibility=private` | Try to reach its URL unauthenticated | No public URL exists; 403/404 | P0 |
| PUB-SITE-21 | FAQ accordion | FAQs exist | Open `/faq` and `/` | Expands/collapses; one at a time; localized | P1 |
| PUB-SITE-22 | Previous events | Archived event `show_in_archive=true` | Open `/previous-events` | Listed; inactive non-archive events absent | P1 |
| PUB-SITE-23 | Legal pages | — | Open `/terms`, `/privacy`, `/refund` | Render statically; refund page states the no-refund policy | P0 |
| PUB-SITE-24 | Map link | `map_url` set | Click venue map | Opens correct location in a new tab | P2 |
| PUB-SITE-25 | Add to calendar | `start_at` set | Click Add to Calendar | Downloads/opens an event with correct title, time, venue | P2 |
| PUB-SITE-26 | Share buttons | — | Click share | Correct URL + title shared | P2 |
| PUB-SITE-27 | Floating actions (mobile) | Mobile viewport | Scroll | Sticky bottom bar with WhatsApp + Register; Register hidden when closed | P1 |
| PUB-SITE-28 | OG preview | `seo.og_image` set | Share the URL / inspect meta | Preview image present; homepage prefers the active event's own title/description/hero | P1 |
| PUB-SITE-29 | Branding colour | Set brand colour `#1d4ed8` | Reload | Buttons render exactly `#1d4ed8` (600 step pinned); tints/hovers in family; no flash of old palette | P1 |
| PUB-SITE-30 | Unconfigured branding | Clear branding | Reload | Site renders in the default orange/gold, byte-identical | P1 |
| PUB-SITE-31 | Logo + wordmark | `logo_url` set | Inspect nav/footer | Logo image **and** two-line wordmark both visible | P2 |
| PUB-SITE-32 | Contact info from settings | Set contact in Settings → Contact & Social | Open `/contact` + footer | Phone/email/address/socials reflect settings (not event columns) | P1 |
| PUB-SITE-33 | Registration list cards | ≥3 tiers | Open `/registration` | Price note "per Yajmaan · one-time", availability bar, "only N left", Most Chosen badge, per-Seva colour | P1 |
| PUB-SITE-34 | Most Chosen suppressed when full | Recommended tier `is_full` | Open `/` | Badge suppressed | P2 |
| PUB-SITE-35 | Availability hidden | `show_availability=false` | Open `/registration` | No progress bar / seats-left text | P1 |
| PUB-SITE-36 | EMI badge | `show_emi_badge=true` | Open tier card | EMI badge shown | P2 |
| PUB-SITE-37 | Broken anchors | — | Click any `#livestream` style link | Lands on `/live` (not a dead anchor) | P2 |
| PUB-SITE-38 | Image weight | Upload a 15 MB hero | Inspect served file | Downscaled ≤2560px, WebP q80, few hundred KB | P1 |
| PUB-SITE-39 | Lazy loading | — | Inspect below-fold images | `loading="lazy" decoding="async"`; hero stays eager | P2 |

---

## B2. Registration form & declaration (PUB-REG)

### Declaration (Step 1)
| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-REG-01 | Declaration enabled → 2-step | Declaration on with body text | Open `/register/[id]` | Step 1 = declaration text + Name, DOB, Mobile + accept checkbox; step indicator shows 1 of 2 | P0 |
| PUB-REG-02 | Continue disabled until valid | Same | Leave a field blank | Continue disabled + hint shown | P0 |
| PUB-REG-03 | Scroll-to-bottom | Long declaration body | Do not scroll → try to accept | Accept gated until scrolled to bottom | P1 |
| PUB-REG-04 | Carry-over | Complete step 1 | Go to step 2 | Name, DOB, Mobile prefilled and consistent | P0 |
| PUB-REG-05 | Back to step 1 | On step 2 | Click back | Returns to step 1 with values intact | P1 |
| PUB-REG-06 | Shown every time | Complete a registration, start another | Reopen `/register/[id]` | Declaration shown again (no session skip) | P1 |
| PUB-REG-07 | Declaration disabled | Turn declaration off | Open `/register/[id]` | Single-step form; no declaration screen | P0 |
| PUB-REG-08 | Consent recorded | Declaration on; complete a registration | Admin → Consent Records | Row with name, phone, email, DOB, exact text snapshot, accepted_at, IP | P0 |
| PUB-REG-09 | Consent for enquiry | Submit an enquiry | Consent Records | Row with `kind='enquiry'` | P1 |
| PUB-REG-10 | Consent for donation | Donate | Consent Records | Row with `kind='donation'` | P1 |
| PUB-REG-11 | Consent print | Any consent row | Click print | Per-person document: name, date/time, exact accepted text, IP | P1 |
| PUB-REG-12 | Declaration localized | Set HI/MR body | Switch language | Correct language body shown | P1 |

### Form fields
| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-REG-20 | Core fields always present | Any tier | Open form | firstName, lastName, phone, email always visible + required; cannot be hidden from admin | P0 |
| PUB-REG-21 | Optional built-ins toggle | Hide `gotra` for a tier | Reload form | Gotra absent for that tier, present for others | P0 |
| PUB-REG-22 | Required toggle honoured | Mark `pincode` **optional** for a tier | Submit with pincode blank | **Accepted** — online, offline and enquiry paths alike (regression: all three used to hard-require it) | P0 |
| PUB-REG-22a | Hidden field honoured | **Hide** `pincode` for a tier | Open the form | Field not rendered; submit succeeds; taluka/state simply aren't auto-filled | P0 |
| PUB-REG-22b | Required toggle still enforced | Mark `pincode` **required** | Submit blank | Rejected client-side **and** server-side (`validateSubmission`) | P0 |
| PUB-REG-22c | Only core fields are hardcoded | Try to hide/optional-ise firstName, lastName, email, phone | Not possible in Form Fields; the submit routes also reject a blank one | P0 |
| PUB-REG-23 | Field order | Reorder fields | Reload | Rendered in the configured order | P1 |
| PUB-REG-24 | Custom text field | Add custom text field, opt tier in | Fill and submit | Value lands in `registrations.custom_fields` | P0 |
| PUB-REG-25 | Custom number/date/select/textarea | Add one of each | Submit | All stored correctly; select only accepts listed options | P1 |
| PUB-REG-26 | Custom required enforced server-side | Mark required; POST directly bypassing UI | `POST /api/razorpay` without it | 400 with a clear message | P0 |
| PUB-REG-27 | Custom label i18n | Set HI/MR labels | Switch language | Localized labels | P1 |
| PUB-REG-28 | Custom field not opted in | Field global, tier not opted in | Open that tier | Field absent | P1 |
| PUB-REG-29 | MUI label overlap | Any tier with Problem + Attendees | Inspect spacing | No label/border collision (`gap-y-6`) | P2 |

### Validation
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| PUB-REG-40 | Email format | Enter `abc@`, `abc.com`, `a b@c.com` | Rejected with "Invalid email address." | P0 |
| PUB-REG-41 | Phone valid | `9876543210` | Accepted | P0 |
| PUB-REG-42 | Phone with prefixes | `+919876543210`, `09876543210`, `919876543210` | All normalized and accepted | P0 |
| PUB-REG-43 | Phone invalid | `1234567890`, `98765`, `98765432101`, `abcdefghij` | Rejected — "valid 10-digit Indian number" | P0 |
| PUB-REG-44 | Phone stored E.164 | Register with `07264810290` | DB stores `+917264810290`; matches `profiles.phone` | P0 |
| PUB-REG-45 | Pincode format (value present) | `12345`, `1234567`, `abc123` | Rejected — "Enter a valid 6-digit pincode." — **whether or not the field is marked required** | P0 |
| PUB-REG-45a | Pincode blank + optional | Leave blank on a tier where it's optional | Accepted; stored NULL | P0 |
| PUB-REG-45b | Pincode autofill | Enter a valid 6-digit PIN | Taluka + state auto-fill | P1 |
| PUB-REG-46 | DOB future | Tomorrow's date | Rejected — "cannot be a future date" | P0 |
| PUB-REG-47 | Age below min | `min_age=18`, DOB gives 17 | Rejected with the tier's age message (client **and** server) | P0 |
| PUB-REG-48 | Age above max | `max_age=60`, DOB gives 65 | Rejected | P0 |
| PUB-REG-49 | Age boundary | Exactly min_age today | Accepted | P1 |
| PUB-REG-50 | No age limits | both null | Any DOB accepted | P1 |
| PUB-REG-51 | Terms unchecked | Leave terms unchecked | Submit blocked; server 400s if forced | P0 |
| PUB-REG-52 | Attendees clamp | `max_attendees_per_reg=3`; request 10 | Clamped to 3 | P0 |
| PUB-REG-53 | Global ceiling | Set tier max to 50 | Clamped to 20 | P1 |
| PUB-REG-54 | Attendees minimum | Send 0 or -1 | Clamped to 1 | P1 |
| PUB-REG-55 | Attendee names | 3 attendees | Each name captured and stored in `attendees` | P1 |
| PUB-REG-56 | HTML in Problem field | `<script>alert(1)</script>` | Tags stripped before storage; never executes anywhere in admin | P0 |
| PUB-REG-57 | `javascript:` scheme | Enter `javascript:alert(1)` in a text field | Stripped | P0 |
| PUB-REG-58 | Scroll-to-error | Submit with an error at the top, page scrolled down | Scrolls to + focuses first invalid field, shows "fix the highlighted fields" | P1 |
| PUB-REG-59 | Button gating | Any required field empty | Pay/Submit/Enquire disabled with a hint | P1 |
| PUB-REG-60 | Donation cap | Enter 99,99,999 | Clamped to ₹10,00,000 | P1 |
| PUB-REG-61 | Negative donation | Enter `-500` | Clamped to 0 | P1 |
| PUB-REG-62 | Non-numeric donation | Enter `abc` | Treated as 0 | P1 |

### Registration open/closed & capacity
| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-REG-70 | Closed by toggle | `registration_open=false` | Open `/register/[id]` | Closed panel with Event Details / Contact links; no form | P0 |
| PUB-REG-71 | Closed by end date | `end_at` in the past | Same | Auto-closed | P0 |
| PUB-REG-72 | Closed — server guard | Force `POST /api/razorpay` | 400 "Registrations are now closed." | P0 |
| PUB-REG-73 | Closed — offline guard | Force `POST /api/offline-payment` | Rejected | P0 |
| PUB-REG-74 | Closed — enquiry guard | Force `POST /api/enquiry` | Rejected | P0 |
| PUB-REG-75 | Tier `is_full` | Mark tier full | Register | 400 "Registrations for this category are full." | P0 |
| PUB-REG-76 | Capacity exact | `max_capacity=10`, 8 seats held, request 2 | Allowed | P0 |
| PUB-REG-77 | Capacity exceeded | Same, request 3 | 409 "Only 2 seat(s) left." | P0 |
| PUB-REG-78 | Capacity zero left | 10/10 held, request 1 | 409 "Registrations are full." | P0 |
| PUB-REG-79 | Enquiries don't hold seats | 10 `enquired` rows on a 10-seat tier | Register 1 | Allowed (only `completed`+`advance_paid` hold seats) | P0 |
| PUB-REG-80 | Cancelled releases seat | Tier full, cancel one row | Register again | Allowed | P0 |
| PUB-REG-81 | Offline pending doesn't hold | Several `payment_review` rows | Register | Seats still available | P0 |
| PUB-REG-82 | Enquiry-only cannot be paid | `is_enquiry_only=true` | `POST /api/razorpay` | 400 "enquiry-only and cannot be paid for" | P0 |
| PUB-REG-83 | Rate limit | Same email+tier twice within 3 min | Second attempt | 429 with the wait message | P0 |
| PUB-REG-84 | Rate limit expiry | Wait >3 min | Retry | Allowed | P1 |
| PUB-REG-85 | Different tier not limited | Same email, different tier, within 3 min | Allowed | P1 |

---

## B3. Online payment (Razorpay) (PUB-PAY)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-PAY-01 | Order created server-side | Valid form | Submit | `pending` row created with `razorpay_order_id`; response has orderId/amount/keyId | P0 |
| PUB-PAY-02 | Server-authoritative price | Tamper the request (send a different price/amount) | Submit | Amount charged = DB price + donation, ignoring client values | P0 |
| PUB-PAY-03 | Total = price + donation | Price ₹5000, donation ₹1000 | Submit | Order = ₹6000 | P0 |
| PUB-PAY-04 | Loader | Submit paid checkout | Full-screen "Opening secure payment gateway…" + button spinner until modal appears | P1 |
| PUB-PAY-05 | Network failure | Kill network mid-`fetch('/api/razorpay')` | Error shown; loader cleared (regression: stuck loader) | P0 |
| PUB-PAY-06 | Modal dismissed | Open Razorpay, close it | "Payment cancelled — try again"; row stays `pending` | P0 |
| PUB-PAY-07 | Success | Pay in full (test card) | Success screen with name, email, mobile, gotra, Seva, attendees, status, amounts, refs, date | P0 |
| PUB-PAY-08 | Receipt download | On success screen | PNG downloads with all listed fields correct | P1 |
| PUB-PAY-09 | Webhook completes the row | Pay | Row → `completed`, `amount_paid = total`, `razorpay_payment_id` set | P0 |
| PUB-PAY-10 | Confirmation sent | Same | "Registration Confirmed" email **and** WhatsApp, once each | P0 |
| PUB-PAY-11 | No duplicate ticket | Force a webhook retry + a manual Sync at once | Exactly one email and one WhatsApp (atomic transition) | P0 |
| PUB-PAY-12 | Payment failure | Use a failing test card | Row → `failed` (only if still `pending`) | P0 |
| PUB-PAY-13 | Failure never overwrites | `completed` row, replay `payment.failed` | Stays `completed` | P0 |
| PUB-PAY-14 | Overpayment accepted | Customer-fee-bearer on; captured > expected | Completes normally (no mismatch flag) | P0 |
| PUB-PAY-15 | Shortfall flagged | Simulate captured < expected − ₹1 | → `amount_mismatch`; no ticket; appears in Amount Mismatch tab | P0 |
| PUB-PAY-16 | Idempotent finalize | Replay `payment.captured` on a `completed` row | No change, no second ticket | P0 |
| PUB-PAY-17 | Profile upsert | Register twice with the same phone, second time sparse | `profiles` row updated, good data not nulled; both regs share `profile_id` | P1 |
| PUB-PAY-18 | Gateway not configured | Unset Razorpay keys | `POST /api/razorpay` | 500 "Server missing payment gateway credentials." | P1 |

---

## B4. Part payment / advance (PUB-PART)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-PART-01 | Toggle visible | `allow_part_payment=true` | Open form | Pay Full / Pay Advance choice shown | P0 |
| PUB-PART-02 | Toggle hidden | `allow_part_payment=false` | Open form | No advance option | P0 |
| PUB-PART-03 | Advance = % of price | Price ₹10,000, `advance_percent=25` | Choose advance | Charge now ₹2,500 | P0 |
| PUB-PART-04 | Advance excludes donation | Price ₹10,000, `advance_percent=25`, donation typed ₹1,000 | Choose advance | Donation **cleared to 0**; total ₹10,000; charge ₹2,500; balance ₹7,500 | P0 |
| PUB-PART-05 | Donation box replaced | Select Pay Advance | Donation box replaced by note + "Offer Seva separately →" link to `/donate` (new tab) | P0 |
| PUB-PART-06 | Server enforces no donation | Craft `POST /api/razorpay` with `paymentPlan:'partial'` + `donation:5000` | `donation_amount=0`, total = price only | P0 |
| PUB-PART-07 | Partial ignored when disallowed | `allow_part_payment=false`, send `paymentPlan:'partial'` | Treated as full payment | P0 |
| PUB-PART-08 | Advance percent bounds | Set `advance_percent` to 0 / 150 | Clamped to 1 / 100 | P1 |
| PUB-PART-09 | Ledger after advance capture | Pay the advance | Status `advance_paid`; `amount_paid`=advance; `amount_due`=balance; sum = total | P0 |
| PUB-PART-10 | Balance link created | Same | `balance_link_url` + `balance_link_id` (`plink_…`) stored; email + WhatsApp sent | P0 |
| PUB-PART-11 | Reference id unique | Create a second link for the same reg | `bal_<regId>_<ts>` — no Razorpay duplicate-reference error | P0 |
| PUB-PART-12 | Pay the balance | Open the link, pay | `payment_link.paid` → `completed`, `amount_paid=total`, `amount_due=0`, ticket sent | P0 |
| PUB-PART-13 | Balance shortfall | Simulate a short balance capture | → `amount_mismatch`, no ticket | P0 |
| PUB-PART-14 | No pass before full payment | `advance_paid` row | Try `GET /api/admin/qr/[id]` | 409; QR icon hidden in the UI | P0 |
| PUB-PART-15 | Advance holds a seat | Advance-paid row on a capacity-limited tier | Capacity count | Seat is held | P0 |
| PUB-PART-16 | Order summary | Advance selected | Summary shows Seva fee, Pay-now, Balance clearly | P1 |

---

## B5. Offline payment submission (PUB-OFF)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-OFF-01 | Chooser visible | `bank_details.offline_enabled=true` | Open form | Online + each enabled offline method shown | P0 |
| PUB-OFF-02 | Chooser hidden | Offline disabled | Open form | Online only | P0 |
| PUB-OFF-03 | Only enabled methods | Enable cheque + cash only | Open form | Bank transfer / DD absent | P1 |
| PUB-OFF-04 | Instructions shown | Pick bank transfer | Account/IFSC/UPI/payee/instructions displayed exactly as configured | P0 |
| PUB-OFF-05 | Reference required | Bank transfer, no UTR | Submit blocked | P0 |
| PUB-OFF-06 | Proof required (transfer/cheque) | No file | Submit blocked | P0 |
| PUB-OFF-07 | Proof optional (cash/DD) | Cash, no file | Submit allowed | P1 |
| PUB-OFF-08 | Accepts image + PDF | Upload JPG, PNG, PDF | All accepted | P1 |
| PUB-OFF-09 | Rejects other types | Upload `.exe` / oversized file | Rejected with a clear message | P1 |
| PUB-OFF-10 | Submission result | Submit | Status `payment_review`; proof in private `payment-proofs`; "under verification" email; **no Razorpay order**; **no seat held** | P0 |
| PUB-OFF-11 | Offline part payment | Tier allows partial; pick Pay Advance + bank transfer | `payment_plan='partial'`, `amount_due = total − advance` | P0 |
| PUB-OFF-12 | Offline partial has no donation | Same, with a donation typed | `donation_amount=0` (server-enforced) | P0 |
| PUB-OFF-13 | Proof not publicly reachable | Copy the stored path | Access anonymously | Denied — signed URL only | P0 |
| PUB-OFF-14 | Offline excluded from Razorpay sync | Run Sync all | Offline statuses untouched | P0 |

---

## B6. Enquiry flow (PUB-ENQ)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-ENQ-01 | Enquiry-only tier | `is_enquiry_only=true` | Open `/register/[id]` | Only "Enquire Now"; no payment UI | P0 |
| PUB-ENQ-02 | Dual tier | `allow_enquiry=true` on a paid tier | Open form | Both Pay and Enquire Now | P0 |
| PUB-ENQ-03 | Neither flag | Both false | `POST /api/enquiry` | 400 "does not accept enquiries" | P0 |
| PUB-ENQ-04 | Submit enquiry | Fill + Enquire | Row `enquired`; no Razorpay order; appears in Enquiries → New | P0 |
| PUB-ENQ-05 | Enquiry validation parity | Bad email / phone / pincode / age / terms | Same rejections as the paid path | P0 |
| PUB-ENQ-06 | Enquiry holds no seat | Fill a tier with enquiries | Paid registration still possible | P0 |
| PUB-ENQ-07 | Enquiry not in ledger tabs | Open Registrations → Master List | `enquired` rows are **not** listed there (they're in Enquiries) | P1 |

---

## B7. Donations / Seva (PUB-DON)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-DON-01 | Declaration gate | Declaration enabled | Open `/donate` | Blocking modal until accepted | P0 |
| PUB-DON-02 | Seva presets | `seva_categories` configured | Open `/donate` | Cards (Annadaan/Deep Daan…) set amount + prefill message | P1 |
| PUB-DON-03 | Preset fallback | No presets configured | Open `/donate` | Plain amount presets render | P1 |
| PUB-DON-04 | Custom amount | Enter ₹501 | Order created for ₹501 | P0 |
| PUB-DON-05 | Amount floor | Enter ₹0 or negative | 400 "between ₹1 and ₹10,00,000" | P0 |
| PUB-DON-06 | Amount cap | Enter ₹20,00,000 | 400 | P0 |
| PUB-DON-07 | Decimal amount | Enter ₹100.75 | Floored to ₹100 | P2 |
| PUB-DON-08 | Name required | Blank name, not anonymous | 400 "enter your name, or choose to give anonymously" | P0 |
| PUB-DON-09 | Anonymous | Tick anonymous | Name field disabled; `donations.name` stored **NULL**; `is_anonymous=true` | P0 |
| PUB-DON-10 | Anonymous receipt | Anonymous + email given | Receipt greets generically (never "Namaste null") | P1 |
| PUB-DON-11 | Invalid email | `abc@` | 400 | P1 |
| PUB-DON-12 | Message sanitised | HTML in message | Tags stripped; capped at 300 chars | P1 |
| PUB-DON-13 | Payment verify | Complete payment | `/api/donate/verify` HMAC-checks and marks paid; receipt email sent | P0 |
| PUB-DON-14 | Forged verify | POST a bad signature | Rejected; row stays unpaid | P0 |
| PUB-DON-15 | Abandoned donation | Close the modal | Row stays unpaid; visible as unpaid in admin Donations | P1 |
| PUB-DON-16 | Donation ≠ registration donation | Compare | `/donate` rows go to `donations`; checkout add-on to `registrations.donation_amount`; Seva tile/chart mean the former | P1 |
| PUB-DON-17 | Sponsorship aside | Open `/donate` | Aside links to `/contact` | P2 |

---

## B8. Waitlist (PUB-WL)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-WL-01 | Offered when full | Tier full | Open the tier | Waitlist option/modal available | P1 |
| PUB-WL-02 | Join | Name + valid phone | Submit | Row `waiting` in admin → Settings → Waitlist | P1 |
| PUB-WL-03 | Idempotent | Same phone + tier again | Submit | `{ok:true, already:true}`; no duplicate row | P1 |
| PUB-WL-04 | Phone validation | `12345` | 400 "valid 10-digit Indian mobile number" | P1 |
| PUB-WL-05 | Bad tier | Non-existent categoryId | 400 "That tier does not exist." | P2 |
| PUB-WL-06 | Optional email validated | `abc@` | 400 | P2 |
| PUB-WL-07 | Notified after a cancel | Cancel a registration on that tier | Admin sees the waitlist nudge; notify sends a message | P1 |

---

## B9. Self-service pass lookup (PUB-PASS)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-PASS-01 | Sends to contact on file | Completed reg with phone X | `/my-pass` → enter X | Link sent to the email/WhatsApp **on file**, never shown on screen | P0 |
| PUB-PASS-02 | No enumeration | Enter an unknown number | Same generic "check your email/WhatsApp" message | P0 |
| PUB-PASS-03 | Rate limit | 6 lookups for the same phone in an hour | 6th silently dropped; still generic response | P0 |
| PUB-PASS-04 | Last-10 matching | Reg stored `+919876543210` | Enter `9876543210` | Matched | P0 |
| PUB-PASS-05 | No false substring match | Reg `+919876543210` | Enter `987654321` (9 digits) | Rejected (needs 10) | P1 |
| PUB-PASS-06 | Actionable statuses only | Rows in `completed`, `advance_paid`, `pending`, `awaiting_payment`, `amount_mismatch`, `cheque_received`, `payment_review` | Look up | All listed with correct status labels; `failed`/`cancelled`/`closed` excluded | P1 |
| PUB-PASS-07 | Multiple registrations | Same phone, 3 regs | Look up | All listed, newest first | P1 |
| PUB-PASS-08 | Pass page (paid) | Open `/pass/[id]` | Scannable QR + details | P0 |
| PUB-PASS-09 | Pass page (unpaid) | `advance_paid` row | Open `/pass/[id]` | Status + "complete payment" link, **no** valid pass | P0 |
| PUB-PASS-10 | Pass page localized | Set `bb_lang=mr` | Open `/pass/[id]` | Marathi copy | P1 |
| PUB-PASS-11 | Pass id unguessable | — | Inspect URL | UUID; not enumerable | P1 |
| PUB-PASS-12 | Attendee gets `/pass`, not `/entry` | Send QR | Check email + WhatsApp link | Points to `/pass/[id]`; the QR **image** encodes `/entry/[id]` | P0 |

---

## B10. Contact, feedback, reminders (PUB-MSC)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| PUB-MSC-01 | Contact form | Submit name+email+message | Row in `contact_messages`; unread badge in admin inbox | P1 |
| PUB-MSC-02 | Contact validation | Missing name/email/message | 400 "Name, email and message are required." | P1 |
| PUB-MSC-03 | Contact email format | `abc@` | 400 | P1 |
| PUB-MSC-04 | Contact sanitisation | HTML + `javascript:` in message | Stripped; message capped at 4000 chars | P0 |
| PUB-MSC-05 | Feedback rating | Submit rating 1..5 | Saved, attached to the active event | P1 |
| PUB-MSC-06 | Feedback rating bounds | 0 or 6 | 400 "rating from 1 to 5" | P1 |
| PUB-MSC-07 | Feedback anonymous | No name/phone | Accepted | P2 |
| PUB-MSC-08 | Feedback sanitisation | HTML in comment | Stripped; capped at 1000 chars | P1 |
| PUB-MSC-09 | Reminder opt-in | Submit the reminder form | Row in `event_reminders`; exportable from admin | P1 |
| PUB-MSC-10 | Reminder duplicate | Same contact twice | No crash; sensible handling | P2 |

---

## B11. Live stream & news (PUB-LIVE)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| PUB-LIVE-01 | Not live | Toggle off | Open `/` | No player section, no banner | P0 |
| PUB-LIVE-02 | Toggle on, no URL | Toggle on with empty URL | Admin UI refuses; API treats as not live; no empty player | P0 |
| PUB-LIVE-03 | Live | URL + toggle on | Open `/` | Dark player section high on the page + site-wide sticky banner | P0 |
| PUB-LIVE-04 | YouTube URL forms | `youtu.be/x`, `watch?v=x`, `/embed/x` | All normalise and play | P1 |
| PUB-LIVE-05 | Non-YouTube embed | Paste another provider's iframe URL | Used as-is; plays | P1 |
| PUB-LIVE-06 | Banner appears without reload | Sit on `/register/[id]`, admin goes live | Banner appears within ~60s | P1 |
| PUB-LIVE-07 | Banner scrolls away | Scroll | Banner is not sticky; navbar remains the only sticky element | P2 |
| PUB-LIVE-08 | Static pages stay static | Build | `/terms`, `/privacy`, `/pitham`, `/feedback` still `○` (banner must stay a client fetch) | P1 |
| PUB-LIVE-09 | Banner text | Set `livestream_banner` | Custom line shown, translatable | P2 |

---

## B12. Language (EN/HI/MR) (PUB-I18N)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| PUB-I18N-01 | Switcher | Open the globe popover | EN / HI / MR with a checkmark on the active one | P1 |
| PUB-I18N-02 | Persistence | Switch to HI, navigate 5 pages, reload | Stays Hindi (`bb_lang` cookie) | P1 |
| PUB-I18N-03 | UI strings | Switch each language | No raw keys (`form_pay_button`) visible anywhere | P0 |
| PUB-I18N-04 | Content translations | Event/tier/schedule/FAQ/guest with `translations.hi`/`.mr` | Correct language shown | P0 |
| PUB-I18N-05 | Fallback | Field missing in MR | Falls back to English, not blank | P0 |
| PUB-I18N-06 | Server-rendered pages | `/pass/[id]` with `bb_lang=mr` | Marathi | P1 |
| PUB-I18N-07 | Emails/WhatsApp | Register in Hindi | (Confirm intended behaviour — templates are admin-authored) | P2 |
| PUB-I18N-08 | Numerals/currency | Any language | ₹ amounts formatted `en-IN` consistently | P2 |

---

## B13. Entry pass, QR, scanner (SCAN)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
> **Auth model changed 2026-07-22.** `/scan` is no longer PIN-protected — it signs in with the same named `admin_users` accounts as the admin panel and requires the **`checkin:scan`** permission. `SCANNER_PIN` and `/api/checkin/verify-pin` no longer exist.

| SCAN-01 | Wrong credentials | `/scan` | Enter a bad username/password | Rejected with "Incorrect username or password."; IP throttle applies after 5 fails | P0 |
| SCAN-02 | Valid gate account | Volunteer with `checkin:scan` | Sign in | Checkpoint picker appears; footer shows "Signed in as \<name\>" | P0 |
| SCAN-02a | Account without the permission | Volunteer with only `scanlog:view` | Sign in at `/scan` | Refused: "This account cannot scan entry passes…" **and** the session is ended (cookie cleared) — verify `/admin` also requires a fresh login | P0 |
| SCAN-02b | Admin always passes | Admin account | Sign in | Allowed without any permission ticked | P0 |
| SCAN-02c | Session rehydrate | Signed in, mid-shift | Refresh the page / lock and unlock the phone | Returns straight to the checkpoint picker — **no re-login** (shows "Checking your session…" briefly) | P0 |
| SCAN-02d | Session expiry mid-shift | Signed in; expire the cookie (or deactivate the account), then scan | Scan | Drops back to the sign-in screen with "Your session ended. Please sign in again." — **not** a phantom `INVALID` | P0 |
| SCAN-02e | Sign out | Click "Signed in as … — sign out" | Session destroyed; back to sign-in; camera stopped | P1 |
| SCAN-02f | PIN is really gone | Grep the repo / set a `SCANNER_PIN` env var and try it | No PIN field exists; `/api/checkin/verify-pin` returns 404 | P0 |
| SCAN-03 | Checkpoint list | Active + inactive checkpoints exist | Picker | Only active ones listed, in `sort_order` | P0 |
| SCAN-03a | Checkpoints not public | Log out entirely | `GET /api/checkpoints` | **401** (no longer a public endpoint) | P0 |
| SCAN-03b | Checkpoints permission | Volunteer without `checkin:scan` | `GET /api/checkpoints` | 403 | P0 |
| SCAN-04 | No checkpoint chosen | `POST /api/checkin/[id]` without `checkpointId` | `INVALID` / `no_checkpoint` | P1 |
| SCAN-05 | First scan | Paid reg, checkpoint A | Scan | **NEW**; `checkins` row inserted; beep; green banner | P0 |
| SCAN-06 | Duplicate scan | Same reg + checkpoint A again | Scan | **DUPLICATE** + count; **no second row inserted** — verify in the DB that `checkins` still has exactly 1 row for that reg+checkpoint | P0 |
| SCAN-06a | Count is not inflated | Scan the same pass 5× at checkpoint A | Dashboard **Checked In** tile + Scan Log | Counted **once**; Scan Log shows one row | P0 |
| SCAN-07 | Second checkpoint | Same reg, checkpoint B | Scan | **NEW** again | P0 |
| SCAN-08 | Unpaid | `pending`/`advance_paid`/`payment_review` reg | Scan | **NOT_PAID** | P0 |
| SCAN-09 | Cancelled | Cancelled reg | Scan | **NOT_PAID** (pass void) | P0 |
| SCAN-10 | Refunded | Refunded reg | Scan | **NOT_PAID** | P0 |
| SCAN-11 | Unknown id | Random UUID | Scan | **INVALID** / `not_found` | P0 |
| SCAN-12 | Garbage QR | Scan a non-app QR | Handled gracefully, no crash | P1 |
| SCAN-13 | Wristband colour | Band mapped for the Seva | Scan a paid pass | Seva name large + correct band colour block | P0 |
| SCAN-14 | No band mapped | Seva with no band | Scan | `band=null`; UI degrades gracefully | P1 |
| SCAN-15 | Band change is immediate | Change a band in Settings | Scan within a minute | New colour shown (cache busted on save) | P0 |
| SCAN-16 | Unpaid gets no band | Unpaid scan | No band shown | P1 |
| SCAN-17 | `/entry/[id]` valid | Paid reg | Open in a phone camera | VALID green, name, gotra, Seva (large), band, **Bands to give = attendees**, amount, phone, payment ref | P0 |
| SCAN-18 | `/entry/[id]` invalid | Unpaid reg | Open | INVALID + the actual status | P0 |
| SCAN-19 | Multi-kiosk | Two devices, different checkpoints | Scan the same pass on both | Each records NEW independently | P1 |
| SCAN-20 | Check-in RBAC | Volunteer with **zero** permissions, logged in | `POST /api/checkin/[id]` | **403** (regression: used to be accepted by `requireAdmin:false`) | P0 |
| SCAN-20a | Unauthenticated check-in | No session | `POST /api/checkin/[id]` | 401 | P0 |
| SCAN-21 | Camera denied | Deny permission | Clear message + fallback (manual entry) | P1 |
| SCAN-22 | Offline network | Drop network mid-scan | Error surfaced, no silent false NEW | P1 |
| SCAN-23 | Scan speed | 20 scans in a row | Each resolves <2s; no UI lock-up | P1 |
| SCAN-24 | QR contrast config | Set low-contrast/inverted QR colours | Regenerate + scan | **Known risk** — verify the QR still scans at the gate before going live | P0 |
| SCAN-25 | Manual check-in gating | Volunteer with `scanlog:view` only | Open Scan Log | **Manual check-in block hidden**; **Undo column hidden**; `DELETE /api/admin/checkins` 403s if forced | P0 |
| SCAN-26 | Undo permitted | Volunteer with `checkin:scan` | Undo a check-in | Row removed; person can be scanned in again; `checkin.undo` audit entry written | P0 |
| SCAN-27 | Manual check-in permitted | Same volunteer | Manual check-in a paid reg | Row inserted with `manual=true`; MANUAL tag in the Scan Log | P1 |

---

## B14. Admin auth & RBAC (ADM-AUTH / ADM-RBAC)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-AUTH-01 | Valid login | Correct username + password | Session cookie set; dashboard loads | P0 |
| ADM-AUTH-02 | Wrong password | — | Rejected, generic message | P0 |
| ADM-AUTH-03 | Unknown user | — | Rejected, no user enumeration | P0 |
| ADM-AUTH-04 | Deactivated user | Deactivate then log in | Rejected | P0 |
| ADM-AUTH-05 | No env password fallback | Set an `ADMIN_PASSWORD` env var and try it | Rejected — DB accounts only | P0 |
| ADM-AUTH-06 | Session expiry | Wait past 8h (or forge an expired JWT) | Redirected to login | P0 |
| ADM-AUTH-07 | Tampered cookie | Modify the JWT payload | Rejected (signature) | P0 |
| ADM-AUTH-08 | Logout | Click logout | Cookie destroyed; `/admin` requires login again | P0 |
| ADM-AUTH-09 | Direct API without session | `GET /api/admin/data` unauthenticated | 401 | P0 |
| ADM-AUTH-10 | create-admin CLI | `npm run create-admin` | Creates the account; re-running the same username **resets** the password | P0 |
| ADM-AUTH-11 | Destructive re-auth | Delete an event/tier/media | Prompts for **your own** password; wrong password → refused | P0 |
| ADM-AUTH-12 | Volunteer re-auth | Volunteer with `settings:manage` deletes media | Own password works | P1 |

### RBAC — run each as a volunteer with ONLY the listed permission
| ID | Permission | Expected visible | Expected blocked (UI **and** API) | Pri |
|---|---|---|---|---|
| ADM-RBAC-01 | *(none)* | Login succeeds, no tabs | `/api/admin/data` returns `registrations: []` and all `stats` null | P0 |
| ADM-RBAC-02 | `dashboard:view` | Dashboard tiles (server-computed, no PII) | `registrations` array is `[]`; no analytics rows | P0 |
| ADM-RBAC-03 | `registrations:view` | Registrations tab, read-only | Cannot change status, verify, refund, cancel | P0 |
| ADM-RBAC-04 | `registrations:manage` | Add/edit/status (implies `registrations:view`) | **Cannot cancel** (admin-only) | P0 |
| ADM-RBAC-05 | `qr:send` | Bulk Send QR **and** the per-row QR download (implies view) | Cannot verify payments | P0 |
| ADM-RBAC-05a | `registrations:view` only | Rows visible | **QR download icon hidden**; `GET /api/admin/qr/[id]` **403** (regression: was `registrations:view`) | P0 |
| ADM-RBAC-06 | `export:data` | Exports (implies view) | Cannot mutate | P1 |
| ADM-RBAC-07 | `payments:verify` | Approve/reject/cheque/record/reconcile, Sync all, payment proofs, adjust donation | Cannot refund | P0 |
| ADM-RBAC-08 | `payments:refund` | Refund / reverse | Cannot verify offline | P0 |
| ADM-RBAC-09 | `reminders:send` | Balance reminders, message-log resend | Cannot read the message log without `audit:view` | P1 |
| ADM-RBAC-10 | `enquiries:manage` | Enquiries tab, notes, request payment, close/reopen | Ledger actions blocked | P0 |
| ADM-RBAC-11 | `scanlog:view` | Scan Log tab (read-only) + `checkedInRegs` stat | `GET /api/admin/checkins` blocked without it; **Undo column + Manual check-in hidden**; `DELETE` 403s | P0 |
| ADM-RBAC-11a | `checkin:scan` | Opens `/scan`; `GET /api/checkpoints`; records check-ins; Undo + Manual check-in | Cannot read the Scan Log without `scanlog:view` | P0 |
| ADM-RBAC-12 | `audit:view` | Audit tab + Message Log sub-tab | Message Log sub-tab **hidden** if they have `settings:manage` but not `audit:view` | P0 |
| ADM-RBAC-13 | `settings:manage` | All Settings panels except Message Log; `donations` stats; `GET /api/admin/app-settings` | Cannot cancel/refund | P0 |
| ADM-RBAC-13a | app-settings is not open | Volunteer **without** `settings:manage` (e.g. `checkin:scan` only) | `GET /api/admin/app-settings` | **403** — no bank/UPI details, contact record or message templates leak (regression: was any authenticated) | P0 |
| ADM-RBAC-14 | Admin role | Everything, always | — | P0 |
| ADM-RBAC-15 | Implied permissions | Grant only `qr:send` | `registrations:view` auto-granted | P1 |
| ADM-RBAC-16 | Unknown permission key | Save a volunteer with a bogus key | Dropped silently, no crash | P2 |
| ADM-RBAC-17 | PII boundary (the real one) | Volunteer without `registrations:view` calls `/api/admin/data` directly | `registrations: []` — the tab-hide is cosmetic, this is the guard | P0 |
| ADM-RBAC-18 | Every admin route guarded | Call all 60+ `/api/admin/*` verbs unauthenticated | Every one 401 (only `login`, `logout`, `session` are unguarded by design, and `session` returns only the caller's own role/name/permissions) | P0 |
| ADM-RBAC-19 | No `:view` grants a write | Review every route's `authorize()` | No route accepts a `*:view` permission for a POST/PATCH/DELETE | P0 |
| ADM-RBAC-20 | Permission matches effect | Review every route | The permission reflects what the call *does*, not which tab the button is on (e.g. `qr/[id]` → `qr:send`) | P0 |
| ADM-RBAC-21 | Unauthenticated public probe | Hit `/api/checkpoints`, `/api/admin/app-settings`, `/api/admin/qr/[id]` logged out | All 401 | P0 |

---

## B15. Admin dashboard & health (ADM-DASH)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-DASH-01 | Today's Registrations | Create a reg today | Tile increments from **local** midnight; sub-line "N paid · ₹X" correct | P1 |
| ADM-DASH-02 | Confirmed Attendees | 3 paid regs of 2 attendees each | Tile = 6 | P1 |
| ADM-DASH-03 | Total Revenue | Mixed statuses | Counts only Paid | P0 |
| ADM-DASH-04 | Payments to Verify | 2 `payment_review` rows | Tile = 2; click → To Verify tab | P1 |
| ADM-DASH-05 | Seva Raised | Donations exist | Tile = donations total + count; click → Settings → Donations | P1 |
| ADM-DASH-06 | Checked In | Some check-ins | Unique regs scanned + % of paid; click → Scan Log | P1 |
| ADM-DASH-07 | Tiles are global | Apply a Registrations filter | Dashboard figures **unchanged** (never tied to the filter bar) | P1 |
| ADM-DASH-08 | Health: Paid with ₹0 | Craft such a row | ERROR issue listed with examples | P0 |
| ADM-DASH-09 | Health: paid but short | `completed` with `amount_paid < total−1` | Issue listed | P0 |
| ADM-DASH-10 | Health: advance without link | `advance_paid`, no `balance_link_url` | Issue listed | P1 |
| ADM-DASH-11 | Health: duplicate phone in a tier | Register the same phone twice in one tier | Duplicate issue listed | P1 |
| ADM-DASH-12 | Health: delivery failures | Force an email failure | Issue listed | P1 |
| ADM-DASH-13 | Health: unsent QRs | Paid rows with `qr_sent_at` null | Issue listed | P1 |
| ADM-DASH-14 | Health: stale offline queue | `payment_review` older than 2 days | Issue listed | P1 |
| ADM-DASH-15 | Health: oversold tier | Seats held > `max_capacity` | ERROR issue naming tier and counts | P0 |
| ADM-DASH-16 | Health badge | Any ERROR-severity issue | Dashboard tab shows the error count badge | P1 |
| ADM-DASH-17 | Launch check red | Unset `RAZORPAY_WEBHOOK_SECRET` | That row goes red with the fix hint | P1 |
| ADM-DASH-18 | Analytics 14-day | Data across 14 days | Registrations / revenue / Seva bars correct | P1 |
| ADM-DASH-19 | Conversion | — | Paid ÷ payment attempts (documented meaning) | P2 |
| ADM-DASH-20 | Enquiry funnel | Enquiries across statuses | Funnel matches | P1 |
| ADM-DASH-21 | Tier fill | Capacity + seats held | Fill % correct | P1 |
| ADM-DASH-22 | Sales by Category | Mixed tiers | Totals reconcile with the ledger; donation add-on shown here | P1 |
| ADM-DASH-23 | Auto-refresh | Create a reg in another browser | Appears within ~30s without a page reload; no loading flicker | P1 |
| ADM-DASH-24 | Auto-refresh paused | Open a detail modal | No background refresh while open | P1 |
| ADM-DASH-25 | Auto OFF | Toggle Auto OFF | No polling | P1 |
| ADM-DASH-26 | Manual refresh | Click Refresh | Data updates; "Updated HH:MM:SS" changes | P2 |
| ADM-DASH-27 | Refresh scope | Refresh while editing Settings | Settings state undisturbed | P1 |

---

## B16. Registrations ledger (ADM-REG)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-REG-01 | Search by name | Type a partial name | Matching rows only | P1 |
| ADM-REG-02 | Search by phone | Type last 6 digits | Matches | P1 |
| ADM-REG-03 | Search by gotra | — | Matches | P2 |
| ADM-REG-04 | Date range | Set from/to | Only regs in range | P1 |
| ADM-REG-05 | Event filter | Multi-event data | Only that event's rows | P1 |
| ADM-REG-06 | Category filter | — | Only that tier | P1 |
| ADM-REG-07 | Combined filters | Search + date + tier | Correct intersection | P1 |
| ADM-REG-08 | Section tab counts | — | Counts respect the other filters and are live | P1 |
| ADM-REG-09 | All 11 sections | Seed one row per status | Each tab shows exactly its status | P0 |
| ADM-REG-10 | Mobile/desktop parity | Same filter on both | Identical rows and fields (shared render helpers) | P1 |
| ADM-REG-11 | No horizontal scroll | Mobile viewport | Cards fit; no side-scroll | P1 |
| ADM-REG-12 | Registered column | — | `created_at` date + time, also in modal and mobile card | P1 |
| ADM-REG-13 | Amount split | Row with a donation | "Seva ₹A + Donation ₹B" under the total, desktop **and** mobile | P1 |
| ADM-REG-14 | Payment mode label | Online + each offline method | Online / Bank Transfer / Cheque / Cash / Demand Draft | P1 |
| ADM-REG-15 | Detail modal completeness | Open a rich row | Profile, payment, custom fields, attendees, timeline, person donations, registered-on | P0 |
| ADM-REG-16 | Person donations match | Donor gave via `/donate` with the same phone | Donations section shows it (exact last-10 or email match, not substring) | P1 |
| ADM-REG-17 | Person donations 403 | Volunteer without `settings:manage` | Section simply hidden, no error | P1 |
| ADM-REG-18 | Edit fields | Change name/email/gotra/custom | Saved; audit entry written | P0 |
| ADM-REG-19 | Edit invalid email | `abc@` | Rejected server-side | P0 |
| ADM-REG-20 | Edit invalid phone | `12345` | Rejected server-side (regression: used to save and break delivery) | P0 |
| ADM-REG-21 | Edit phone normalised | Enter `07264810290` | Stored `+917264810290` | P0 |
| ADM-REG-22 | Status dropdown limits | Open the dropdown on a `pending` row | `completed`, `refunded`, `amount_mismatch` are **absent** | P0 |
| ADM-REG-23 | Server rejects them too | `PATCH /api/admin/registrations {status:'completed'}` | Rejected — not in `VALID_STATUSES` | P0 |
| ADM-REG-24 | Terminal locked | Open the dropdown on `completed`/`cancelled`/`advance_paid`/etc. | Locked | P0 |
| ADM-REG-25 | Manual add | Add Registration for a walk-in | Row created with the entered details | P0 |
| ADM-REG-26 | Manual add ignores capacity | Tier at 10/10 | Add succeeds | P0 |
| ADM-REG-27 | Oversell surfaced | Same | `capacity.oversold` audit entry + modal says "This tier is now oversold — 11 of 10 seats held" | P0 |
| ADM-REG-28 | Public still capped | Same tier | Public `/api/razorpay` still 409s | P0 |
| ADM-REG-29 | Clear pending | Stale `pending` rows | Bulk clear works; audited | P1 |
| ADM-REG-30 | Row action visibility | Compare rows by status | QR download only on Paid; Sync only on advance/mismatch; Copy/₹ only on advance_paid; verify actions only on offline states | P1 |

---

## B17. Offline payment verification (ADM-VER)

| ID | Title | Pre-conditions | Steps | Expected | Pri |
|---|---|---|---|---|---|
| ADM-VER-01 | View proof | `payment_review` row with proof | Click View proof | Signed URL opens the file; expires | P0 |
| ADM-VER-02 | Proof RBAC | Volunteer without `payments:verify` | Hit `/api/admin/payment-proof/[id]` | 403 | P0 |
| ADM-VER-03 | Approve full | Confirm the full amount | Approve | → `completed`; `amount_paid` = total; ticket email + WhatsApp; QR-eligible; audited | P0 |
| ADM-VER-04 | Approve short (partial plan) | Row `payment_plan='partial'`, receive the advance | Approve with the received amount | → `advance_paid`; `amount_due = total − received`; **no pass** | P0 |
| ADM-VER-05 | Approve short (admin marks partial) | Full-plan row, short amount, tick "Record part payment" | Approve | → `advance_paid` | P0 |
| ADM-VER-06 | Approve short (unexpected) | Short amount, not partial | Approve | → `amount_mismatch`; no ticket | P0 |
| ADM-VER-07 | Reconcile a mismatch → complete | `amount_mismatch` row | Reconcile, enter the full amount | → `completed` + ticket | P0 |
| ADM-VER-08 | Reconcile a mismatch → advance | Same, confirm as part payment | → `advance_paid` with the balance due | P0 |
| ADM-VER-09 | Reject | Enter a reason | → `payment_rejected`; registrant emailed to resubmit; reason audited | P0 |
| ADM-VER-10 | Reject without a reason | Leave blank | Blocked | P1 |
| ADM-VER-11 | Cheque in hand | Cheque row | Click Cheque in hand | → `cheque_received` | P0 |
| ADM-VER-12 | Cheque cleared | From `cheque_received` | Cleared | → `completed` + ticket | P0 |
| ADM-VER-13 | Cheque bounced | From `cheque_received` | Bounced | → `failed`; seat released | P0 |
| ADM-VER-14 | Record ₹ on a pending row | Walk-in cash | Record with method + amount + ref | → `completed` (full) | P0 |
| ADM-VER-15 | Record ₹ short | Short + confirmed part payment | → `advance_paid` | P0 |
| ADM-VER-16 | Record ₹ short unconfirmed | Short, not partial | → `amount_mismatch` | P0 |
| ADM-VER-17 | Record ₹ without a method | Omit method | 400 "Choose a payment method." | P1 |
| ADM-VER-18 | Record ₹ on an enquiry | Price-less enquiry row | Record ₹5000 | Received amount defines the total; → `completed` | P0 |
| ADM-VER-19 | Reverse | `completed` offline row | Reverse | → `refunded`; seat released; audited | P0 |
| ADM-VER-20 | Not found | Bogus id | 404 | P2 |
| ADM-VER-21 | Every action audited | Do each action once | `payment.<action>` entries naming the person and phone | P0 |
| ADM-VER-22 | Amount tolerance | Receive `total − 1` | Treated as full (tolerance of ₹1) | P1 |
| ADM-VER-23 | Overpayment offline | Receive more than total | Accepted as complete (no mismatch) | P1 |

---

## B18. Money operations (ADM-MONEY)

### Cancel
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-MONEY-01 | Admin-only | Volunteer with `registrations:manage` calls `/api/admin/cancel-registration` | 403 | P0 |
| ADM-MONEY-02 | Reason mandatory | Cancel with no reason | 400 | P0 |
| ADM-MONEY-03 | Cancel succeeds | Cancel a `completed` row with a reason | → `cancelled`; `cancelled_at` + `cancellation_reason` set | P0 |
| ADM-MONEY-04 | Money untouched | Same | `amount_paid`, `amount_due`, `razorpay_payment_id`, `offline_reference` all unchanged | P0 |
| ADM-MONEY-05 | Seat released | Cancel on a full tier | A new public registration succeeds | P0 |
| ADM-MONEY-06 | Pass voided | Scan the cancelled pass | NOT_PAID; `/entry/[id]` INVALID | P0 |
| ADM-MONEY-07 | Registrant notified | Same | Cancellation email/WhatsApp with the reason + the no-refund statement | P0 |
| ADM-MONEY-08 | Notify failure is non-fatal | Break email temporarily | Row still fully cancelled; failure logged | P0 |
| ADM-MONEY-09 | Not cancellable | Try on `cancelled`/`refunded`/`failed`/`closed` | Rejected | P0 |
| ADM-MONEY-10 | Waitlist returned | Cancel on a tier with waiting entries | Response includes oldest-first waitlist; UI nudges to Settings → Waitlist | P1 |
| ADM-MONEY-11 | Audit | Same | `registration.cancel` entry with the reason | P0 |
| ADM-MONEY-12 | UI states no-refund | Confirm dialog + email + row banner | All three say cancel ≠ refund | P0 |
| ADM-MONEY-13 | Not settable from dropdown | Status dropdown | `cancelled` absent | P0 |

### Refund
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-MONEY-20 | Full refund | Refund a `completed` online row in full | Razorpay refund created; → `refunded` | P0 |
| ADM-MONEY-21 | Partial refund | Refund part | Refund created; status handled per spec (not `refunded` for a partial) | P0 |
| ADM-MONEY-22 | Refund RBAC | Volunteer without `payments:refund` | 403 | P0 |
| ADM-MONEY-23 | Refund webhook | Razorpay sends `refund.processed` | Row matched by `razorpay_payment_id` → `refunded` | P0 |
| ADM-MONEY-24 | Refund an offline row | Try on an offline-completed row | Use **Reverse** instead; behaviour is sane, not a crash | P1 |
| ADM-MONEY-25 | Refund seat release | After refund | Seat freed | P0 |

### Adjust donation
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-MONEY-30 | Remove donation | `completed` row, total ₹6000 (₹5000 + ₹1000) → set donation 0 | Total ₹5000; `amount_due` recalculated | P0 |
| ADM-MONEY-31 | Base from the row | Change the tier price afterwards | Seva base still derived from the row (`total − donation`), never re-billed | P0 |
| ADM-MONEY-32 | Refuses overpayment | Reduce below what's already collected | "use Refund instead" | P0 |
| ADM-MONEY-33 | Stale link cancelled | `advance_paid` row with a live balance link → adjust donation | Old link **cancelled on Razorpay** before being cleared; outcome in the audit summary + `linkCancelled` returned | P0 |
| ADM-MONEY-34 | Cancel failure surfaced | Link already paid / cancel fails | Explicit toast telling the admin to void it in the Razorpay dashboard | P0 |
| ADM-MONEY-35 | Auto-complete | Reduced total already covered on an `advance_paid` row | → `completed` + ticket sent | P0 |
| ADM-MONEY-36 | Partial rows have none | `partial` plan row | No donation to adjust (rule: partial ⇒ donation 0) | P1 |
| ADM-MONEY-37 | RBAC | Needs `payments:verify` | 403 without it | P1 |

### Balance links
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-MONEY-40 | Copy link (silent) | `advance_paid` row → Copy | Link returned; **no email/WhatsApp sent** | P0 |
| ADM-MONEY-41 | Copy creates if missing | Row with no link | Creates one with a unique `bal_<id>_<ts>` reference | P0 |
| ADM-MONEY-42 | Razorpay error surfaced | Break the gateway config | 502 with Razorpay's own message (not a blank error) | P1 |
| ADM-MONEY-42a | Copy link reference length | Advance-paid row with a real UUID id → **Copy balance link** | Link created; **no** "reference_id: length must be no more than 40" 502 (regression) | P0 |
| ADM-MONEY-42b | Reference is unique on re-create | Copy, then clear the stored link, then Copy again | Second creation succeeds — no Razorpay duplicate-reference error | P0 |
| ADM-MONEY-42c | Resend link reference length | Advance-paid row → **Resend balance link** | Sends; reference ≤ 40 chars | P0 |
| ADM-MONEY-42d | Paid link still maps back | Pay a link created with the compact reference | Webhook `payment_link.paid` matches via `notes.registration_id` → row completes | P0 |
| ADM-MONEY-43 | Re-send (notifies) | Click ₹ | Email + WhatsApp sent with the **reminder** wording (`balance_reminder`, not `balance_link`) | P0 |
| ADM-MONEY-44 | Resend confirmation (all) | `completed` row → Resend confirmation | Both channels re-sent | P1 |
| ADM-MONEY-45 | Resend only the failed channel | Email delivered, WhatsApp failed → click the ⚠ retry | **Only WhatsApp** re-sent; no duplicate email | P0 |

---

## B19. QR sending (ADM-QR)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-QR-01 | Bulk send to paid | Select 5 rows: 3 paid, 2 pending | Sends to the 3; reports `skippedNotPaid=2` | P0 |
| ADM-QR-02 | Breakdown bar | Select a mix | Bar shows Paid / new / already-sent / not-Paid counts | P1 |
| ADM-QR-03 | Unsent only by default | Mixed sent/unsent paid rows | Only unsent receive it | P0 |
| ADM-QR-04 | Resend toggle | Enable "Resend to already-sent" | Already-sent rows also receive it | P1 |
| ADM-QR-05 | `qr_sent_at` stamped | After a successful send | Row shows "✓ QR sent \<date\>"; unsent rows show "QR not sent" | P0 |
| ADM-QR-06 | QR renders in email | Open the email in Gmail | Image renders (hosted signed URL, not a stripped `data:` URI) | P0 |
| ADM-QR-07 | Fallback | Break the bucket upload | Falls back to the data URI without failing the send | P1 |
| ADM-QR-08 | WhatsApp image | Send | Image message if a URL is available, else a text link | P1 |
| ADM-QR-09 | Attendee link | Inspect the email/WhatsApp | Points to `/pass/[id]` | P0 |
| ADM-QR-10 | QR encodes `/entry/[id]` | Decode the QR image | Encodes the staff verify URL | P0 |
| ADM-QR-11 | Single download | Paid row → download icon | PNG downloads | P1 |
| ADM-QR-12 | Single download blocked | Non-paid row → `GET /api/admin/qr/[id]` | 409 | P0 |
| ADM-QR-13 | QR config applied | Change size / margin / colours / expiry | Applied in **both** send-qr and single download | P1 |
| ADM-QR-14 | Signed URL lifetime | Set `link_expiry_days` | Link expires accordingly | P1 |
| ADM-QR-15 | Missing bucket | Delete `qr-codes` | Send degrades to a text link; health check flags it | P1 |
| ADM-QR-16 | Ticket attachment | Media doc `attach_to_ticket` ≤5 MB | Attached to confirmation emails | P1 |
| ADM-QR-17 | Attachment cap | Doc >5 MB | Not attached; admin steered to publish it as a download | P1 |
| ADM-QR-18 | RBAC | `qr:send` required | 403 without it | P0 |

---

## B20. Enquiries pipeline (ADM-ENQ)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-ENQ-01 | Section tabs | Seed one per status | New / Contacted / Payment Link Sent / Closed-Lost / All Open filter correctly | P0 |
| ADM-ENQ-02 | Separate from the ledger | — | Enquiry rows never appear in Registrations sections | P1 |
| ADM-ENQ-03 | Add a note | Open Notes drawer, add | Timestamped note stored in `registration_notes` | P0 |
| ADM-ENQ-04 | First note auto-advances | Note on a New lead | → `contacted` | P0 |
| ADM-ENQ-05 | Multiple notes | Add 3 | All kept, newest first, with actor role | P1 |
| ADM-ENQ-06 | Request Payment | Click on a lead | `total_amount = amount_due = category.price`; → `awaiting_payment`; link emailed + WhatsApped | P0 |
| ADM-ENQ-07 | No typed amount | Same | Amount comes from the tier price only — never typed | P0 |
| ADM-ENQ-08 | Lead pays | Pay the link | **Same row** completes via `payment_link.paid`; ticket sent | P0 |
| ADM-ENQ-09 | Cron backstop | Suppress the webhook, run reconcile | Row still completes | P0 |
| ADM-ENQ-10 | Close | Click Close, give a reason | → `closed` + the reason recorded as a note | P0 |
| ADM-ENQ-11 | Close without a reason | Leave blank | Blocked | P1 |
| ADM-ENQ-12 | Reopen | On a closed lead | → `contacted` | P1 |
| ADM-ENQ-13 | RBAC | `enquiries:manage` for writes; GET notes needs `registrations:view` | Enforced | P0 |
| ADM-ENQ-14 | Tab badge | New enquiries exist | Enquiries tab badge shows the count | P2 |

---

## B21. Scan log & manual check-in (ADM-SCAN)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SCAN-01 | Log lists scans | After some scans | Rows with person, checkpoint, timestamp | P1 |
| ADM-SCAN-02 | Filter by checkpoint | — | Correct subset | P1 |
| ADM-SCAN-03 | Unique count | Scan one reg at 3 checkpoints | Counted once for "Checked In" | P1 |
| ADM-SCAN-04 | Manual check-in | Use ManualCheckin on a paid reg | Row inserted with `manual=true` | P1 |
| ADM-SCAN-05 | Manual on unpaid | Try | NOT_PAID | P1 |
| ADM-SCAN-06 | RBAC | Without `scanlog:view` | `/api/admin/checkins` 403; tab hidden | P0 |

---

## B22. Settings — all panels (ADM-SET)

### Event Setup
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-01 | Create event | Fill title/short/long + translations | Created; Marathi fields present (regression: create form was Hindi-only) | P0 |
| ADM-SET-02 | English required | Omit English title/short/long | Blocked in `handleCreateEvent` | P1 |
| ADM-SET-03 | Set active | Activate event B | B becomes the only active event; public site switches | P0 |
| ADM-SET-04 | Edit fields | Change date/venue/map/hero/start_at/end_at | Saved; public reflects immediately (revalidate) | P0 |
| ADM-SET-05 | Whitelist gap | Add a field not in `allowed` | **Silently fails to save** — verify each new field explicitly | P0 |
| ADM-SET-06 | Booleans | Toggle `show_in_archive`, `livestream_is_live`, `registration_open` **off** | Stored `false`, **not** `null` | P0 |
| ADM-SET-07 | Stats repeater | Add/remove stats | Persisted; render as-is | P1 |
| ADM-SET-08 | Facilities repeater | Add/remove | Persisted and rendered on `/event` | P1 |
| ADM-SET-09 | Delete event | Delete with the correct password | Deleted; audited | P0 |
| ADM-SET-10 | Delete blocked | Wrong password | Refused | P0 |

### Sevas & Tiers
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-20 | Create tier | Title, price, description | Appears publicly | P0 |
| ADM-SET-21 | Every flag | Toggle `is_full`, `is_enquiry_only`, `allow_enquiry`, `show_availability`, `show_emi_badge`, `allow_part_payment`, `is_recommended` | Each changes public behaviour as documented | P0 |
| ADM-SET-22 | Numeric settings | `max_capacity`, `max_attendees_per_reg`, `advance_percent`, `min_age`, `max_age` | Enforced client **and** server | P0 |
| ADM-SET-23 | Colour | Set `default`/`gold`/`maroon` | Card re-themes on `/registration` | P1 |
| ADM-SET-24 | Recommended forced gold | Mark recommended | Rendered gold | P2 |
| ADM-SET-25 | Media | Set tier image via MediaPicker | Shown on the card | P1 |
| ADM-SET-26 | Delete tier | With password | Deleted; audited | P0 |
| ADM-SET-27 | Translations | Fill HI/MR description | Rendered on language switch | P1 |

### Form Fields
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-30 | Core protected | Try to hide firstName/lastName/phone/email | Not possible | P0 |
| ADM-SET-31 | Toggle/reorder built-ins | — | Reflected on the public form after Save | P0 |
| ADM-SET-32 | Explicit save | Change without saving, navigate away | Not applied | P1 |
| ADM-SET-33 | Create custom field | Each of 5 types | Created globally | P0 |
| ADM-SET-34 | Per-category opt-in | Enable for tier A only | Appears on A, absent on B | P0 |
| ADM-SET-35 | Delete custom field | Delete one already answered | Existing answers survive in `custom_fields` | P1 |
| ADM-SET-36 | Public API | `GET /api/form-fields?categoryId=` | Returns exactly the active fields | P1 |

### Home Page Content
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-40 | Schedule CRUD | Add/edit/delete/reorder items | Reflected on `/` and `/event#schedule` | P1 |
| ADM-SET-41 | Guests CRUD + featured ★ | Toggle featured | Leadership hero renders; guest leaves the grid | P1 |
| ADM-SET-42 | Highlights + section | File under highlights/pillars/blessings/about | Each renders in its own block | P1 |
| ADM-SET-43 | FAQ CRUD | — | Accordion updates | P1 |
| ADM-SET-44 | News CRUD + eye toggle | Draft then publish | Only published shows publicly | P0 |
| ADM-SET-45 | Testimonials CRUD | Publish/hide | Only published shows | P1 |
| ADM-SET-46 | Live stream setup | Paste URL, save; then Go live | Two separate saves — going live does not commit half-typed edits | P0 |
| ADM-SET-47 | Registration toggle | Flip open/closed | Nav/footer/CTAs update immediately (`site-event` tag revalidated) | P0 |
| ADM-SET-48 | Countdown/helpline | Edit | Saved | P2 |
| ADM-SET-49 | Translatable everywhere | Every add-form | One input per non-English language, automatically | P1 |

### Media Gallery / Media Library
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-60 | Upload image | Upload a large JPG | Optimised to ≤2560px WebP q80; `media_library` row written | P0 |
| ADM-SET-61 | GIF untouched | Upload a GIF | Not re-encoded | P2 |
| ADM-SET-62 | Optimisation failure | Upload a corrupt image | Falls back to the original, no crash | P1 |
| ADM-SET-63 | Browse & reuse | Use MediaPicker in all six fields (gallery, tier image, guest photo, hero, sponsor logo, news image) | Can browse and reuse an existing file | P0 |
| ADM-SET-64 | Public vs private | Upload one of each | Public → `event-media` with a permanent URL; private → `admin-docs`, **no public URL** | P0 |
| ADM-SET-65 | Signed access to private | `GET /api/admin/media-file/[id]` with `settings:manage` | Short-lived signed URL | P0 |
| ADM-SET-66 | Delete in use | Delete a file referenced somewhere | **409 + the list of places** | P0 |
| ADM-SET-67 | Force delete | Re-send with `force:true` | Deleted | P1 |
| ADM-SET-68 | New consumer registered | Add a new place that uses library URLs | Must appear in `USAGE` — verify it does | P0 |
| ADM-SET-69 | `is_download` / `attach_to_ticket` | Set on a private doc | Server refuses (public documents only) | P0 |
| ADM-SET-70 | Delete media (gallery) | With password | Deleted; audited | P1 |
| ADM-SET-71 | No un-indexed upload path | Grep for `upload-image` | Route and `ImageUpload.js` remain deleted | P1 |

### Entry Checkpoints + Wristbands
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-80 | CRUD checkpoints | Add/rename/reorder/deactivate | `/api/checkpoints` reflects active ones in order | P0 |
| ADM-SET-81 | Band assignment | Assign a band per Seva | Fixed palette only (red/blue/green/yellow/orange/purple/pink/gold/white/black) — no hex picker | P0 |
| ADM-SET-82 | Band cache bust | Change and scan | New band within seconds | P0 |
| ADM-SET-83 | Bands only here | Check the Tiers editor | No band field there (gate ops stay in Checkpoints) | P2 |

### Payment Details / Donations / Presets / Sponsors
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-90 | Bank details | Edit account/IFSC/UPI/payee/instructions | Rendered verbatim in the public offline chooser | P0 |
| ADM-SET-91 | Method toggles | Enable/disable each of the 4 | Public chooser matches exactly | P0 |
| ADM-SET-92 | Offline master switch | Turn `offline_enabled` off | Chooser hidden; online only | P0 |
| ADM-SET-93 | Donations list | — | All donations incl. unpaid; paid/anonymous/pending breakdown; Razorpay ref shown | P1 |
| ADM-SET-94 | Donations CSV | Export | "Anonymous" for anonymous rows; ref column present | P1 |
| ADM-SET-95 | Seva presets CRUD | Add/edit/remove | `/donate` cards update | P1 |
| ADM-SET-96 | Sponsors CRUD | Add name/tier/amount/logo/contact/notes | Saved; total committed + count tile correct | P1 |
| ADM-SET-97 | Sponsors not public | Search the public site | Never rendered anywhere public | P0 |

### Contact & Social / Contact Messages / Feedback
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-100 | Contact settings | Edit phone/email/address/IG/FB/YT | Footer, `/contact`, floating WhatsApp all update | P0 |
| ADM-SET-101 | Single edit point | Check Event Setup + Home Content | No duplicate contact inputs there | P2 |
| ADM-SET-102 | Inbox | Submit a public contact message | Appears unread; unread count correct | P1 |
| ADM-SET-103 | Mark read/unread, reply, delete | — | All work; reply opens a mail composer to the sender | P1 |
| ADM-SET-104 | Feedback panel | Public feedback submitted | Listed with rating; filterable | P1 |

### Templates & Config
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-110 | Default templates | Open each of the 11 kinds | Registry defaults shown | P0 |
| ADM-SET-111 | Override + send | Edit one, save, trigger the real send | Override used | P0 |
| ADM-SET-112 | Reset to default | Reset | Override **deleted**; default restored | P0 |
| ADM-SET-113 | `{{var}}` escaping | Register as `<script>alert(1)</script>` | Name renders escaped in the email; no markup break-out | P0 |
| ADM-SET-114 | `{{{raw}}}` | QR data URI var | Renders raw as intended | P1 |
| ADM-SET-115 | `{{#if}}` | Template with a conditional | Included only when non-empty (e.g. `hadPaid=false` suppresses the no-refund line) | P1 |
| ADM-SET-116 | `wrap` behaviour | Compare a wrapped vs unwrapped kind | Ticket/QR are complete emails (no double header) | P1 |
| ADM-SET-117 | balance_link vs balance_reminder | Trigger both | Distinct copy: first-send confirmation vs admin chase | P0 |
| ADM-SET-118 | Template test send | Edit without saving → Send this template as a test | Test email uses the **unsaved** edits + sample data (real QR for `qr`) | P1 |
| ADM-SET-119 | WhatsApp template names | Change a name in settings | Resolved at send time (Settings → env → default); no redeploy needed | P0 |
| ADM-SET-120 | Literal name still works | Message-log resend of an old send | Passes through unresolved | P1 |
| ADM-SET-121 | QR config | Change size/download size/margin/dark/light/expiry | Applied in both QR paths | P1 |
| ADM-SET-122 | Gateway status | Open the panel | Configured, test/live, webhook secret set, CRON_SECRET set, email + WhatsApp status; key masked; **secret never returned** | P0 |
| ADM-SET-123 | Keys not editable | Look for edit inputs | Read-only by design | P0 |
| ADM-SET-124 | Generic test email | Click Send test email | Arrives; failure captured in the Message Log with the provider's error | P0 |
| ADM-SET-125 | Cache + immediate effect | Save a template, send within 5 min | New copy used immediately (tag revalidated, not the 5-min TTL) | P0 |

### Admin Users / Branding & SEO / Page Headers / Declaration / Consents / Waitlist
| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-SET-130 | Create volunteer | Tick a permission set | Account created; login works with exactly those permissions | P0 |
| ADM-SET-131 | Edit permissions | Add/remove | Effective immediately on next load | P0 |
| ADM-SET-132 | Deactivate user | — | Login refused | P0 |
| ADM-SET-133 | Reset password | — | Old password fails, new works | P0 |
| ADM-SET-134 | Cannot lock out | Delete/deactivate the last admin | Warned; recovery documented (`npm run create-admin`) | P0 |
| ADM-SET-135 | Branding colours | Pick a seed | 600 step exactly the seed; full 50→900 ramp; inlined in `<head>`; no flash | P1 |
| ADM-SET-136 | Site name + logo | Set | Reach client components via BrandingProvider | P1 |

#### Rename sweep (ADM-SET-136a…q) — **run all of these after changing `site_name`**
> Set `site_name` to a clearly different value (e.g. **"Testbrand Trust"**), then verify the old name appears **nowhere**. This is the regression suite for "we might change the name at any time".

| ID | Surface | Expected | Pri |
|---|---|---|---|
| ADM-SET-136a | Nav + footer | New name in the wordmark; footer reads `© <current year> Testbrand Trust · All rights reserved` — **no doubled name, no frozen 2025** | P0 |
| ADM-SET-136b | Confirmation email | Subject **and** header carry the new name | P0 |
| ADM-SET-136c | QR pass email | Subject + header + body | P0 |
| ADM-SET-136d | Balance link + balance reminder emails | Both | P0 |
| ADM-SET-136e | Cancellation / offline-submitted / offline-rejected emails | All three | P0 |
| ADM-SET-136f | Donation receipt + feedback emails | Both | P1 |
| ADM-SET-136g | Email shell header | Kicker = new name; second line = `brand_line2` (absent when blank) | P0 |
| ADM-SET-136h | Test email (generic + template modes) | Both carry the new name | P1 |
| ADM-SET-136i | WhatsApp free-text (offline submitted/rejected, cancellation, QR caption, `/my-pass`, feedback blast) | New name | P0 |
| ADM-SET-136j | Razorpay checkout modal (register + donate) | Merchant name shows the new name | P0 |
| ADM-SET-136k | Razorpay payment-link description (balance + enquiry + resend) | New name in the description the payer sees | P0 |
| ADM-SET-136l | `/entry/[id]` and `/pass/[id]` | Header + footer link | P0 |
| ADM-SET-136m | `/scan` sign-in header | New name | P1 |
| ADM-SET-136n | Checkout receipt PNG | Header text **and** the downloaded filename | P1 |
| ADM-SET-136o | Admin exports | CSV/Excel/Financial filenames + the Receipts PDF header + Financial `<h3>` | P1 |
| ADM-SET-136p | Donations CSV filename | New name | P2 |
| ADM-SET-136q | Homepage JSON-LD | `organizer.name` and the fallback event `name` | P1 |
| ADM-SET-136r | Immediacy | All of the above reflect the change on the **next** request — no waiting out a cache TTL (`revalidateTag('branding')`) | P0 |
| ADM-SET-136s | Blank name | Save an empty `site_name` | Falls back to `DEFAULT_BRANDING.site_name`; nothing renders blank | P1 |
| ADM-SET-136t | Escaping | Set `site_name` to `<b>X</b>` | Rendered escaped in emails — never as markup | P0 |
| ADM-SET-136u | Admin template overrides | Edit a template, keep `{{siteName}}` | Still resolves; the variable palette lists `siteName` | P1 |
| ADM-SET-136v | Grep check | Search the repo for the old name | Only `DEFAULT_BRANDING`, admin placeholders, the `EMAIL_FROM` default, and the Meta-template comments remain | P0 |
| ADM-SET-137 | SEO | Set title/description/og_image/keywords | Used everywhere except the homepage, which prefers the active event's own | P1 |
| ADM-SET-138 | Page Headers | Set hero per page | Applied to about/gallery/etc. | P2 |
| ADM-SET-139 | Declaration editor | Enable + set title/body in en/hi/mr | Public register + donate reflect it | P0 |
| ADM-SET-140 | Consent Records | List/search/export CSV/print | All work; DOB + snapshot present | P0 |
| ADM-SET-141 | Waitlist panel | View + notify | Oldest-first; notify sends and records | P1 |
| ADM-SET-142 | Settings search | Type "wristband" / "rbac" / "upi" | Correct panel surfaces via keywords | P1 |
| ADM-SET-143 | Gated panel hidden | `settings:manage` without `audit:view` | Message Log sub-tab absent | P0 |

---

## B23. Audit log & message log (ADM-LOG)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-LOG-01 | Every mutation logged | Perform one of each admin mutation | An `<entity>.<verb>` entry for each | P0 |
| ADM-LOG-02 | Reads/logins not logged | Browse + log in | No entries | P1 |
| ADM-LOG-03 | Filters | entity / action / `q` / limit | Correct; default 200, max 500 | P1 |
| ADM-LOG-04 | Actor + IP | — | `actor_role`, IP captured | P1 |
| ADM-LOG-05 | Logging never breaks the action | Break `admin_audit_logs` grants | The action still succeeds (fire-and-forget) | P0 |
| ADM-LOG-06 | Cron entries | Run reconcile | `reconcile.cron` with `actor_role: 'system'` | P1 |
| ADM-LOG-07 | Admin-only | Volunteer without `audit:view` | 403 | P0 |
| ADM-LOG-08 | Message log completeness | Trigger every send kind | All appear — email **and** WhatsApp, sent + failed | P0 |
| ADM-LOG-09 | New send site auto-logged | Add a send anywhere | Logged without touching the call site | P1 |
| ADM-LOG-10 | Failure detail | Force a provider failure | Row `failed` with the provider's error text | P0 |
| ADM-LOG-11 | Resend replays stored payload | Resend a failed message | Same rendered body / template + params — not re-derived | P0 |
| ADM-LOG-12 | Resend writes a new row | Same | New row with `metadata.resend_of`; the original is not mutated | P0 |
| ADM-LOG-13 | Timeline | Open a detail modal | Delivery events shown; failed sends dotted rose | P1 |
| ADM-LOG-14 | RBAC | GET needs `audit:view`; resend needs `reminders:send` | Enforced separately | P0 |
| ADM-LOG-15 | No service key in the bundle | Search `.next/static` | `SUPABASE_SERVICE_ROLE_KEY` absent (messageKinds vs messageLog split) | P0 |

---

## B24. Exports & broadcast (ADM-EXP)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| ADM-EXP-01 | CSV | Filter then export | Only filtered rows; all columns; commas/quotes/unicode intact | P1 |
| ADM-EXP-02 | Excel | Export | Opens cleanly; correct types | P1 |
| ADM-EXP-03 | Receipts PDF | Export | One receipt per row, correct amounts | P1 |
| ADM-EXP-04 | Financial statement | Export | Totals reconcile with the dashboard | P0 |
| ADM-EXP-05 | Empty set | Filter to zero rows | Graceful (no corrupt file) | P2 |
| ADM-EXP-06 | Large set | 5,000 rows | Completes without a timeout | P1 |
| ADM-EXP-07 | RBAC | `export:data` | 403 without it | P0 |
| ADM-EXP-08 | Broadcast | Send to a filtered set | Reaches exactly that set; each send logged | P0 |
| ADM-EXP-09 | Broadcast dry run | Preview before sending | Recipient count matches | P1 |
| ADM-EXP-10 | Bulk remind | Advance-paid set | Reminder to each; logged | P1 |
| ADM-EXP-11 | Reminders export | `GET /api/admin/reminders` | Opt-in list exports | P2 |

---

## B25. Webhook (SYS-WH)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| SYS-WH-01 | Valid signature | Send a correctly-signed `payment.captured` | Processed | P0 |
| SYS-WH-02 | Invalid signature | Wrong HMAC | Rejected; nothing written | P0 |
| SYS-WH-03 | Missing signature header | — | Rejected | P0 |
| SYS-WH-04 | Constant-time compare | Review | No early-exit string compare | P1 |
| SYS-WH-05 | `payment.captured` match | Known `razorpay_order_id` | `finalizeOrderCapture` runs | P0 |
| SYS-WH-06 | `payment.captured` no match | Unknown order (a balance-link payment) | Acknowledged, not an error | P0 |
| SYS-WH-07 | `payment_link.paid` by notes | `notes.registration_id` present | Matched → `finalizeBalancePaid` | P0 |
| SYS-WH-08 | `payment_link.paid` by reference | `reference_id = bal_<id>` (and `bal_<id>_<ts>`) | Matched | P0 |
| SYS-WH-09 | `payment.failed` | On a `pending` row | → `failed` | P0 |
| SYS-WH-10 | `payment.failed` guarded | On `completed`/`advance_paid` | Ignored | P0 |
| SYS-WH-11 | `refund.processed` | Match by `razorpay_payment_id` | → `refunded` | P0 |
| SYS-WH-12 | Duplicate delivery | Send the same event 3× | Exactly one state change, one ticket | P0 |
| SYS-WH-13 | Out-of-order delivery | `payment_link.paid` before `payment.captured` | Ledger ends correct | P1 |
| SYS-WH-14 | Malformed body | Garbage JSON | 4xx, no crash | P1 |
| SYS-WH-15 | Unknown event type | e.g. `order.paid` | Acknowledged, ignored | P1 |
| SYS-WH-16 | Missing `payment_link.paid` subscription | Disable it in Razorpay, pay a balance | Row stays `advance_paid` — **must** be healed by cron/Sync (the classic stuck-advance bug) | P0 |

---

## B26. Reconciliation (SYS-REC)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| SYS-REC-01 | Cron auth | No/invalid Bearer | 401 | P0 |
| SYS-REC-02 | Heals a missed capture | `pending` row whose Razorpay order is captured | → `completed` + ticket | P0 |
| SYS-REC-03 | Heals a missed balance | `advance_paid` whose link is paid | → `completed` + ticket | P0 |
| SYS-REC-04 | Re-evaluates a wrong mismatch | `amount_mismatch` that was actually fine | → `completed` | P0 |
| SYS-REC-05 | Genuine shortfall stays | Real shortfall | Stays `amount_mismatch` | P0 |
| SYS-REC-06 | Window | `RECONCILE_WINDOW_DAYS=30` | Rows older than 30d skipped by cron | P1 |
| SYS-REC-07 | Sync all window | Admin Sync all | 365-day window, batch 100 | P1 |
| SYS-REC-08 | Sync all report | Click | Reports checked / completed / advance / mismatch | P1 |
| SYS-REC-09 | Per-row Sync | ↻ on advance/mismatch | Verified against Razorpay — never a blind mark-paid | P0 |
| SYS-REC-10 | Offline excluded | `payment_review`/`cheque_received` rows | Never touched by reconcile | P0 |
| SYS-REC-11 | Audit on change | Any healed row | `reconcile.cron` / `reconcile.manual` entry | P1 |
| SYS-REC-12 | No change → no audit | Nothing to heal | No entry written | P2 |
| SYS-REC-13 | Batch size | 250 open rows | Processes 100 oldest-open first, no timeout | P1 |
| SYS-REC-14 | Idempotent | Run twice back to back | Second run changes nothing | P0 |
| SYS-REC-15 | `awaiting_payment` covered | Enquiry link paid, webhook missed | Healed | P0 |

---

## B27. Notifications (email / WhatsApp) (SYS-MSG)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| SYS-MSG-01 | Confirmation email | Complete a payment | Correct name, Seva, amount, refs | P0 |
| SYS-MSG-02 | Confirmation WhatsApp | Same | Approved template delivered | P0 |
| SYS-MSG-03 | Balance link email + WA | Advance captured | `balance_link` copy | P0 |
| SYS-MSG-04 | Balance reminder | Admin re-send | `balance_reminder` copy (a chase, not a fresh confirmation) | P0 |
| SYS-MSG-05 | QR email + WA | Send QR | Renders; correct `/pass` link | P0 |
| SYS-MSG-06 | Offline "under verification" | Offline submit | Sent | P0 |
| SYS-MSG-07 | Offline rejected | Reject | Sent with the reason + resubmit steps | P0 |
| SYS-MSG-08 | Cancellation | Cancel | Sent with the reason + no-refund statement | P0 |
| SYS-MSG-09 | Waitlist open | Notify from the waitlist | Sent | P1 |
| SYS-MSG-10 | Donation receipt | Donate | Sent; anonymous greeted generically | P0 |
| SYS-MSG-11 | Feedback / self-service | Trigger each | Sent | P1 |
| SYS-MSG-12 | Payment link (enquiry) | Request Payment | Sent | P0 |
| SYS-MSG-13 | Email not configured | Unset `EMAIL_API_KEY` | Sends skipped gracefully; health check red; no crash | P0 |
| SYS-MSG-14 | WhatsApp not configured | Unset the token | Email still sent; WA skipped | P0 |
| SYS-MSG-15 | Wrong DC | Point at the `.com` host with an India token | Every send 401s — caught by the test email + message log | P0 |
| SYS-MSG-16 | Unapproved WA template | Use an unapproved name | Failure captured in the message log | P0 |

#### WhatsApp media / template headers (SYS-MSG-16a…n)
> **The core regression:** a plain image or document message is free-form and is rejected outside the 24h window. Media must ride a template **header**.

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| SYS-MSG-16a | QR uses a template | Send QR to a registrant who has **never** messaged the business number | Arrives as an image + text. Message log row shows `template: entry_pass`, not a raw image send | P0 |
| SYS-MSG-16b | Header payload shape | Inspect the outgoing body | `components[0] = {type:'header', parameters:[{type:'image', image:{link}}]}`, `components[1] = body` with 4 params | P0 |
| SYS-MSG-16c | Signed URL is fetchable | Open `qrPublicUrl` in a logged-out browser | Loads — this is what Meta needs. A private path would 403 and the send would fail | P0 |
| SYS-MSG-16d | Unapproved template | Point `entryPass` at a name Meta hasn't approved | Send fails; message log carries Meta's error; **email still goes out** | P0 |
| SYS-MSG-16e | Wrong header format | Approve `entry_pass` with a TEXT header instead of IMAGE | Fails at Meta with a component error — verify the log makes this diagnosable | P1 |
| SYS-MSG-16f | Dynamic-URL button | Approve a template with a URL button | Fails ("expected parameter for component button") — confirms links must be body variables | P1 |
| SYS-MSG-16g | Missing bucket fallback | Delete the `qr-codes` bucket, send QR | Falls back to free-form text; **expected to fail outside 24h**; Data Health flags the missing bucket | P1 |
| SYS-MSG-16h | Resend replays the header | Message Log → Re-send a QR row | Re-sends **with** the image header; a new log row is written with `metadata.resend_of` | P0 |
| SYS-MSG-16i | Resend of a header-less template | Re-send a `ticketConfirmation` row | Sends body-only; no phantom header | P1 |
| SYS-MSG-16j | Broadcast with a document | Attach a public media-library doc, send to a segment | Email carries it as an attachment; WhatsApp uses `document_announcement` with a DOCUMENT header and the right filename | P0 |
| SYS-MSG-16k | Broadcast without a document | Leave attachment empty | Uses the plain `announcement` template; no header | P0 |
| SYS-MSG-16l | Private doc refused | Force `attachmentId` of a **private** doc via the API | **400** "That file is private" — never sent | P0 |
| SYS-MSG-16m | Non-document refused | Force an image's id | 400 "Only documents can be attached" | P1 |
| SYS-MSG-16n | Deleted doc | Force a stale id | 400 "no longer exists" | P2 |
| SYS-MSG-16o | Template shape hints | Settings → Templates & Config → WhatsApp | Each row shows its required header format + body variables | P1 |
| SYS-MSG-16p | Size limits | Attach a >100 MB document / >5 MB QR | Meta rejects; failure visible in the message log | P2 |
| SYS-MSG-16q | **Multi-line broadcast** | Type a 3-paragraph announcement, send to email + WhatsApp | **Both succeed.** WhatsApp arrives as one flattened block; email keeps the paragraphs (regression: every WhatsApp used to fail) | P0 |
| SYS-MSG-16r | Line-break warning | Type a newline with WhatsApp ticked | UI warns that line breaks are removed on WhatsApp | P1 |
| SYS-MSG-16s | Tabs / space runs | Include a tab and 8 spaces | Sanitised; send succeeds | P1 |
| SYS-MSG-16t | Length guard (UI) | Type 950 chars with WhatsApp ticked | Counter turns red; Send is refused with a clear message | P0 |
| SYS-MSG-16u | Length guard (API) | POST 1200 chars with `channels.whatsapp` | **400** before any send — no partial fan-out | P0 |
| SYS-MSG-16v | Long email-only | 1200 chars, WhatsApp unticked | Allowed — the cap is a WhatsApp limit, not an email one | P1 |
| SYS-MSG-16w | Log stores sanitised text | Multi-line broadcast → Message Log | Stored params are already flattened, so **Re-send succeeds** rather than failing identically | P1 |
| SYS-MSG-17 | `sendWhatsAppText` arg order | Review call sites | `previewUrl` passed explicitly so `log` lands in the right slot | P1 |
| SYS-MSG-18 | Attachment inlining | Ticket with an attached doc | Fetched and inlined as base64 with the right MIME | P1 |
| SYS-MSG-19 | Attachment >5 MB | Flag a big doc | Not attached | P1 |
| SYS-MSG-20 | Every send logged | Compare the message log to actions taken | 1:1, none missing | P0 |

---

## B28. Security & abuse (SEC)

| ID | Title | Steps | Expected | Pri |
|---|---|---|---|---|
| SEC-01 | RLS on PII | Query `registrations` / `profiles` with the anon key | Denied | P0 |
| SEC-02 | Anon reads allowed | Query `categories`/`events` with anon | Allowed | P1 |
| SEC-03 | Service key not in the browser | Search `.next/static` and the network tab | Absent | P0 |
| SEC-04 | Price tampering | Modify the request payload | Server price wins | P0 |
| SEC-05 | Status tampering | `PATCH` a status not in `VALID_STATUSES` | Rejected | P0 |
| SEC-06 | IDOR — QR | Request another registration's QR while unauthenticated | 401/403 | P0 |
| SEC-07 | IDOR — proof | Same for a payment proof | 403 | P0 |
| SEC-08 | IDOR — `/pass/[id]` | Guess a UUID | Not enumerable; accept the documented design (link goes only to the person's own contact) | P1 |
| SEC-09 | XSS — name | Register as `<img src=x onerror=alert(1)>` | Escaped in admin, emails, `/entry`, `/pass`, exports | P0 |
| SEC-10 | XSS — custom field / message / comment | Same payload | Stripped/escaped everywhere | P0 |
| SEC-11 | SQL injection | `'; DROP TABLE registrations;--` in search + form fields | Parameterised; no effect | P0 |
| SEC-12 | Check-in authorization | Volunteer with **no** permissions, logged in, calls `/api/checkin/[id]` | **403** — gate access is now a real permission (`checkin:scan`), not "any session" | P0 |
| SEC-13 | Scanner login brute force | 6 wrong passwords at `/scan` | Same IP throttle as `/admin` (5 fails → 15-min lockout, fail-open on DB error) | P0 |
| SEC-13a | Revoking gate access | Untick `checkin:scan` (or deactivate the account) mid-event | Next scan 403s → the kiosk returns to sign-in. **No redeploy needed** (the whole point of dropping the shared PIN) | P0 |
| SEC-14 | Self-service abuse | 50 lookups | Rate limit holds; no inbox bomb | P0 |
| SEC-15 | Registration spam | Scripted repeat submissions | 3-min duplicate guard holds | P1 |
| SEC-16 | Donation abuse | ₹1 spam | Bounds enforced; no crash | P2 |
| SEC-17 | Upload abuse | Huge / wrong-type / double-extension file | Rejected | P0 |
| SEC-18 | Path traversal | `../../` in a filename | Neutralised | P0 |
| SEC-19 | Open redirect | Manipulate callback/return URLs | No open redirect | P1 |
| SEC-20 | Cookie flags | Inspect the session cookie | HttpOnly, Secure, SameSite | P0 |
| SEC-21 | CSRF | Cross-site POST to an admin route | Blocked (SameSite + JSON content type) | P0 |
| SEC-22 | Enumeration | Login, `/my-pass`, waitlist | Generic responses; no existence leak | P0 |
| SEC-23 | Secrets in logs | Review server logs | No keys/tokens/PII dumps | P1 |
| SEC-24 | Cancelled/refunded pass | Try to enter with it | Refused at the gate | P0 |

---

## B29. Performance, a11y, responsive (NFR)

| ID | Title | Expected | Pri |
|---|---|---|---|
| NFR-01 | Home LCP | Hero eager, images optimised; acceptable on 4G | P1 |
| NFR-02 | Static pages stay static | `/terms`, `/privacy`, `/pitham`, `/feedback` build as `○` | P1 |
| NFR-03 | Admin with 10k registrations | Ledger filters and paints without freezing | P1 |
| NFR-04 | Auto-refresh cost | 30s poll doesn't degrade the UI | P1 |
| NFR-05 | Mobile 360px | No horizontal scroll anywhere public or admin | P0 |
| NFR-06 | Tablet 768px | Layouts intact | P1 |
| NFR-07 | Admin tab strip | Horizontally scrollable on mobile | P1 |
| NFR-08 | Bulk bar (mobile) | Sticky and usable | P1 |
| NFR-09 | Keyboard nav | Forms, modals, accordion reachable and escapable | P1 |
| NFR-10 | Screen reader labels | Inputs labelled; icon-only buttons have names | P1 |
| NFR-11 | Contrast | Brand colours meet AA for text | P1 |
| NFR-12 | Reduced motion | Reveal animations respect the preference | P2 |
| NFR-13 | Browsers | Chrome, Safari (iOS), Firefox, Edge — checkout + scanner | P0 |
| NFR-14 | Scanner on iOS Safari | Camera works (HTTPS required) | P0 |
| NFR-15 | Slow network | Loaders show; no double submission | P1 |
| NFR-16 | Double-click Pay | Only one order created | P0 |
| NFR-17 | Back button after payment | No duplicate/ghost registration | P1 |
| NFR-18 | Two tabs | Two checkouts of the same tier behave sanely | P1 |

---
---

# Part C — Matrices, data, smoke suite

## C1. Test tier matrix

Create these once; most cases reuse them.

| Tier | price | enquiry_only | allow_enquiry | part_pay | adv% | capacity | max/reg | ages | flags |
|---|---|---|---|---|---|---|---|---|---|
| **T1 Standard** | 2100 | ✗ | ✗ | ✗ | — | none | 5 | none | baseline |
| **T2 Part-pay** | 11000 | ✗ | ✗ | ✓ | 25 | none | 5 | none | — |
| **T3 Limited** | 5100 | ✗ | ✗ | ✗ | — | **3** | 2 | none | `show_availability` |
| **T4 Enquiry only** | 0 | ✓ | — | ✗ | — | none | 5 | none | — |
| **T5 Paid + Enquire** | 25000 | ✗ | ✓ | ✓ | 50 | 10 | 10 | 18–60 | `is_recommended`, EMI badge |
| **T6 Full** | 3100 | ✗ | ✗ | ✗ | — | 1 | 5 | none | `is_full=true` |

## C2. Status seed matrix

Seed one registration in **every** status so all 11 ledger tabs + the 4 enquiry tabs can be verified in one pass:
`pending, completed, failed, refunded, enquired, contacted, awaiting_payment, closed, amount_mismatch, advance_paid, payment_review, cheque_received, payment_rejected, cancelled`.

## C3. Status-transition matrix (verify each is allowed / blocked)

| From ↓ To → | completed | advance_paid | amount_mismatch | failed | refunded | cancelled | payment_rejected |
|---|---|---|---|---|---|---|---|
| pending | ✅ capture / approve / record | ✅ advance capture / short-approve | ✅ shortfall | ✅ fail | ❌ | ✅ | ❌ |
| advance_paid | ✅ balance paid | — | ✅ short balance | ❌ | ✅ refund | ✅ | ❌ |
| amount_mismatch | ✅ reconcile | ✅ reconcile as advance | — | ❌ | ❌ | ✅ | ❌ |
| payment_review | ✅ approve | ✅ approve short (partial) | ✅ approve short | ❌ | ❌ | ✅ | ✅ reject |
| cheque_received | ✅ cleared | ❌ | ❌ | ✅ bounced | ❌ | ✅ | ❌ |
| payment_rejected | ✅ record ₹ | ✅ record short | ✅ record short | ❌ | ❌ | ✅ | — |
| completed | — | ❌ | ❌ | ❌ | ✅ refund / reverse | ✅ | ❌ |
| cancelled / refunded / failed / closed | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (already ended) | ❌ |

**Never settable from the status dropdown:** `completed`, `refunded`, `amount_mismatch`, `cancelled` + all terminal states.

## C4. Capacity allowlist check

Only **`completed`** and **`advance_paid`** hold a seat. Verify each of the other 12 statuses does **not**:
`pending, failed, refunded, enquired, contacted, awaiting_payment, closed, payment_review, cheque_received, payment_rejected, cancelled, amount_mismatch`.

> ⚠️ If you ever add a status, add it to this test. Capacity counting must stay an **allowlist**.

## C5. Pre-launch smoke suite (~45 min, run in this order)

1. **ENV-05** Launch Check all green
2. **ENV-09** Webhook has all 4 events
3. **PUB-SITE-01** Home renders
4. **PUB-REG-01/04/08** Declaration → step 2 → consent recorded
5. **PUB-PAY-07/09/10** Full payment → completed → confirmation received
6. **ADM-QR-01/05/06/09** Send QR → renders → `/pass` link
7. **SCAN-02/05/13** Sign in at `/scan` → scan → NEW + wristband colour
8. **SCAN-06/06a** Re-scan → DUPLICATE, count not inflated
9. **PUB-PART-03/09/10/12** Advance → balance link → pay → completed
10. **PUB-OFF-10** Offline submit → payment_review
11. **ADM-VER-03** Approve → completed + ticket
12. **PUB-ENQ-04 → ADM-ENQ-06/08** Enquiry → Request Payment → paid
13. **PUB-DON-04/13** Donate → receipt
14. **ADM-MONEY-03/05/06** Cancel → seat released → pass void
15. **SYS-REC-02** Reconcile heals a missed webhook
16. **ADM-RBAC-17** Volunteer without `registrations:view` gets no PII
16b. **SCAN-02a / SCAN-20 / ADM-RBAC-13a** Gate account can't scan without `checkin:scan`; no-permission volunteer 403s on check-in and on app-settings
16c. **PUB-REG-22** Optional pincode really submits blank
17. **PUB-REG-77** Capacity 409
18. **PUB-I18N-03** All three languages, no raw keys
19. **NFR-05** Mobile 360px, no horizontal scroll
20. **ENV-06** All links use the production domain

## C6. Event-day runbook checks

| Check | When |
|---|---|
| `entry_pass` template approved in Meta with an **IMAGE** header, and a real QR received on a test number | Week before |
| `document_announcement` approved if you plan to broadcast a file | Week before |
| Wristband colours assigned for every Seva | Day before |
| Every paid registration has `qr_sent_at` (Health check) | Day before |
| Checkpoints created and active | Day before |
| Each gate volunteer has an account with **`checkin:scan`**, and has signed in on their device once | Day before |
| One device tested per gate (sign in → checkpoint → live scan) | Morning |
| Scanner tested on the actual venue network + HTTPS | Morning |
| Health panel shows zero ERROR issues | Morning |
| Sync all run once | Morning |
| Manual check-in path known to the desk admin | Morning |

---

# Appendix — Discrepancy log (all resolved 2026-07-22)

Found while writing this plan; all three have since been fixed in code and/or docs. Kept here as the record of what changed and which cases were rewritten.

| ID | Issue | Resolution | Cases rewritten |
|---|---|---|---|
| **DEV-01** | `PROJECT_REFERENCE.md` §6/§10 claimed *"every scan inserts a `checkins` row"*; the route inserts **only on the first scan** per registration+checkpoint | **Code was right, doc was wrong.** One row per registration+checkpoint is intended — it stops `checkedInRegs` being inflated by a double-wave. §6 and §10 corrected | SCAN-06, SCAN-25 (new) |
| **DEV-02** | `pincode` could be marked optional in Form Fields, but three submit routes hardcoded it as required | All three now hardcode **only the CORE fields** (`firstName, lastName, email, phone`); everything else is decided by `validateSubmission` per category. Format still validated when present. `CheckoutForm` matches | PUB-REG-22, PUB-REG-45, PUB-REG-45a/b (new) |
| **DEV-03** | `/scan` used a shared `SCANNER_PIN`, and its session fallback was `authorize({ requireAdmin: false })` — any authenticated user could record entries | **PIN and `/api/checkin/verify-pin` deleted.** `/scan` now signs in with named accounts and requires the new **`checkin:scan`** permission. `/api/checkpoints` and `DELETE /api/admin/checkins` gated the same way | Whole B13 block, SCAN-01/02/20, SEC-12, ENV-05 |

## Additional RBAC fixes made in the same pass

| Route | Was | Now | Why |
|---|---|---|---|
| `GET /api/admin/app-settings` | any authenticated | `settings:manage` | Returns bank/UPI details, the contact record and every message template |
| `GET /api/admin/qr/[id]` | `registrations:view` | `qr:send` | Handing over the PNG **is** issuing a working entry pass |
| `DELETE /api/admin/checkins` | `scanlog:view` | `checkin:scan` | A *view* permission must never authorise a delete |

## Two invariants any future permission must respect

1. **A `:view` permission never authorises a write.**
2. **A route's permission matches its *effect*, not the screen the button sits on.**
</content>
</invoke>
