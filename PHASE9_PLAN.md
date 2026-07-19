# Phase 9 — Emergent parity pass (PLAN ONLY — no code yet)

Goal: close every remaining gap vs the Emergent reference (`Bagla_bhairav-main/`,
read-only), keep everything **admin-controlled**, fix the **fonts**, and **reorganise
the admin** so things are easy to find. Reference confirmed by re-reading
`pages/Home.jsx` + `lib/site-data.js`.

---

## A. Homepage — preview links + missing content
Each homepage section is a PREVIEW that links to its full page, and a few pieces of
content were dropped. For each item: what to add · where · **admin change needed**.

1. **"Why this Mahayagya" (About Mahayagya)** — [home/AboutMahayagya.js]
   - Add CTAs: **"Read our story"** → `/about` (btn-outline-gold) + **"See full event"** → `/event` (text link + chevron).
   - Add the **Peak Day card** in the bento: 🔥 icon + "Pramukh Din · Sunday" + "30 November 2026 · The peak day of the yagya".
   - **Admin:** new `events.peak_day_label` + `events.peak_day_note` (translatable) — edit in Event Setup / Home Content. (Bento images = existing `about_images`.)
   - i18n: `home_read_story`, `home_see_event`.

2. **Guruji — detailed intro + pointers + a saying** — [home/Leadership.js]
   - Already built (Phase 3: `event_guests.bullets` + `.quote`, shown when a guest is **Featured**; role = the "Mahamandaleshwar" badge). **Action:** verify it renders + admin form is clear; no schema change.

3. **"Our Sanctum" — what is performed** — [home/Pillars.js]
   - Reframe kicker→"Our Sanctum", add **numbered badges (01/02/03)** on the image cards (Puja/Gyan/Bhakti).
   - **Admin:** `event_highlights` section=`pillars` + per-card image (both exist). No schema change.

4. **Blessings & Benefits** — [home/Benefits.js] — exists (section=`blessings`). Verify heading + accent (see §B).

5. **Schedule — intro + "view full" + per-day key point** — [home/SchedulePreview.js]
   - Add a **short + long intro** paragraph before the schedule.
   - Add **"View full schedule"** → `/event#schedule`.
   - Add a **per-day theme / key point** + day date (Emergent: "Sthapana & Sacred Beginnings", etc.).
   - **Admin (schema):** `events.schedule_intro` (translatable) + `events.schedule_days` jsonb `{ "<day_label>": { date, theme } }`, edited via a small repeater in Home Content. Homepage/event group items by `day_label` and read the day's date+theme.
   - i18n: `home_view_schedule`.

6. **"Reserve your seat" — Most Chosen + short tagline** — [home/RegistrationCta.js]
   - Ensure the **2–3 word tagline** shows with the tier **Main Title** (data: `categories.tagline`, exists).
   - Add **"See all categories"** → `/registration`.
   - **Admin:** none (tagline exists).

7. **Gallery — "Full gallery" button** → `/gallery`. [home/Gallery.js]

8. **News — "All updates" link** → `/news`. [home/News.js]

9. **FAQ — "All FAQs" + "Ask a question"** → `/faq`, `/contact`. [home/Faq.js] (Emergent accordion UI — we have it.)

10. **Social buttons** — add an on-page **Contact/social block** on the homepage (phone + Instagram/YouTube/Facebook), matching Emergent's social presence.
    - **Admin:** event socials (`instagram_url`/`facebook_url`/`youtube_url`) exist. No schema change.

---

## B. Fonts — "different fonts at different places" (the key visual signature)
Emergent headings are **two lines**: main line in **Cinzel** (`display-section`), the
**accent second line in Cormorant Garamond *italic*** (`font-cormorant italic text-vermillion`,
or `text-gold-400`/`text-white/95` on dark). Our rebuild made headings single-line Cinzel —
this is what looks "off".

- **Fix:** convert every section heading (home + inner pages) to the **main + cormorant-italic-accent** pattern.
- **i18n:** add an `_accent` key per heading (e.g. `section_blessings_title`="What every devotee" + `section_blessings_accent`="carries home") in **en/hi/mr** (~15 headings).
- **Verify font roles everywhere:** Cinzel = headings/prices/stats/nav-brand; Cormorant = heading accents + large quotes/testimonials + nav subtitle; Inter = body/buttons/kickers/labels.

---

## C. Admin changes required (schema + editors)
- `events.peak_day_label`, `events.peak_day_note` (translatable) — Home Content / Event Setup.
- `events.schedule_intro` (translatable) + `events.schedule_days` (jsonb per-day date+theme) — Home Content repeater.
- **Contact Messages** — read-only admin panel over the existing `contact_messages` table (from the /contact form).
- **Downloads** — surface `is_download` documents on the site (footer and/or /event); data + editor already exist.
- (Already admin-controlled, no change: about_images, page_heroes, category tagline/perks/media_url, guest bullets/quote, highlights image/section.)
- New i18n keys added to en/hi/mr for all of the above.

---

## D. Admin reorganisation — "keep everything well grouped"
Settings today = a flat list of ~17 sub-tabs. Regroup the sidebar into labelled sections
(headers + reordered buttons; permission gating unchanged):

- **EVENT & PAGES** — Event Setup · Home Page Content · Page Headers · Media Gallery · Media Library
- **REGISTRATION** — Ticket Tiers · Form Fields · Entry Checkpoints · Waitlist
- **PAYMENTS & SEVA** — Payment Details · Donations
- **COMMUNICATIONS** — Templates & Config · Message Log · Feedback · Contact Messages (new)
- **PEOPLE & ACCESS** — Sponsors · Admin Users
- **APPEARANCE** — Branding & SEO

---

## PROGRESS
- ✅ Full reference review done (A–I captured).
- ✅ **D. Admin reorg** — Settings sidebar regrouped into 6 labelled sections (build-verified).
- ✅ **New admin fields (schema + editors)** — `events.peak_day_label/peak_day_note/schedule_intro/schedule_days` (EventRow: translatable fields + a per-day repeater) and `branding.brand_line1/line2/subtitle` (BrandingManager inputs + two-line logo in LuxuryNavbar). Re-run `run_all.sql`. Build-verified.
- ✅ **§B fonts (homepage)** — new `<LuxuryHeading>` (Cinzel main + Cormorant-italic accent); all 12 homepage section headings converted + `section_*_accent` keys in en/hi/mr. Build-verified.
- ✅ Fixed `countdown_mins`/`countdown_secs` key mismatch in LuxuryCountdown.
- ⬜ Next: **§A homepage previews** ("See full…" links) + render peak-day card + schedule intro/themes → **/about + /registration richness (G,H)** → inner-page heading accents → Contact Messages view + Downloads (C).

## E. Suggested sequence
1. **Fonts (B)** first — systematic; every section then inherits the correct look.
2. **Schema + admin editors (C)** for peak-day + schedule intro/day-themes.
3. **Homepage previews + content (A1–A10)** wired to the data.
4. **Admin reorg (D)**.
5. **Contact Messages view + Downloads (C)**.
6. Build-verify each step; then **visual QA**.

## F. Site logo — TWO wordmark lines + subtitle (NEW, found 2026-07-19)
Emergent's logo = flame mark + **"BAGLA BHAIRAV"** (brown) over **"MAHA YADNYA"** (vermillion),
plus a Cormorant-italic subtitle **"Shri Pitambara Baglamukhi Shakti Peeth"**. Ours shows a single
`site_name`. Render the two-line wordmark + subtitle in the Navbar (and Footer).
- **Admin (branding):** add `brand_line1`, `brand_line2`, `brand_subtitle` (keep `site_name` as fallback + for SEO). Editable in Branding & SEO. A `logo_url` still overrides the wordmark.

## G. /about page — build the full version (NEW, found 2026-07-19)
Current AboutPageContent = hero + intro + collage + Leadership + Pillars. Emergent's About also has:
1. **Mission / Vision / Purpose / Importance** — 4 icon cards. **Admin:** reuse `event_highlights` with `section='about'` (icon+title+desc) — no new table.
2. **Pitham History** — text + a 4-image collage (we have `about_images`; add the history text).
   - **Admin:** `events.pitham_history` (translatable) OR reuse long_description; collage = `about_images`.
3. **Previous Mahayagyas (Legacy)** — 3 cards (year · theme · devotees). **Admin:** reuse the existing **past events** (`previous-events` data: `events` with `show_in_archive`) — pull year/title; OR a small `events.legacy` jsonb. Prefer reusing past events.
4. **Gallery snippet** + "Full gallery" → `/gallery` (masonry, limit 9).

## H. /registration page — richer (NEW, found 2026-07-19)
Current = hero + tier cards (image+perks). Emergent also has:
1. Price sub-label **"per Yajmaan · one-time"** under the price. i18n: `reg_price_note`.
2. **Availability** card — a **progress bar per tier** showing **% filled** (compute from `seatsTaken / max_capacity`; only for tiers with a capacity). Real data we already fetch. i18n: `reg_availability_*`.
3. **"Already registered?"** lookup card → `/my-pass` (btn-outline-gold with search icon).
- **Admin:** none (uses existing capacity + seat data).

## I. Remaining per-page details (full review 2026-07-19) — CORE vs OPTIONAL
Marked so we don't over-build. CORE = matches the page's structure; OPTIONAL = extra
card that needs static/derived content or a minor new feature.

**/event (EventDetails):**
- CORE: **3 overview info cards** (Location / Attendance / Livestream) — derive from event + livestream.
- CORE: **Rituals section** (6 numbered "Ritual · 01" cards) — reuse `event_highlights` section=`highlights`.
- CORE: **Venue facility cards** (Parking / Meals / Facilities / Refreshments) — **admin:** `events.facilities` jsonb `[{icon,title,note}]`, or fold into travel_info.
- CORE: **per-day theme** on schedule day cards (same as §A5).
- Guest speakers as large photo-overlay cards (we have a lineup grid — CORE styling tweak).

**/live (LiveStream):**
- OPTIONAL: **Live Updates** feed (timestamped notes beside the player) — reuse `event_news` (recent) or a small new field.

**/news:**
- OPTIONAL: **Newsletter signup** card — reuse the existing reminder opt-in (`event_reminders`).
- OPTIONAL: **Podcast** card (link out).

**/gallery:**
- OPTIONAL: category filter tabs (All / Rituals / Devotees…). Our media has no category — skip unless we add one.

**/donate (Donations):**
- CORE: **Seva categories** (Annadaan / Deep Daan / Kunda sponsorship…) as pick-able cards with preset amounts — **admin:** `app_settings.seva_categories` jsonb `[{title,amount,desc}]` (or reuse presets). Currently we only have amount presets.
- CORE: **Sponsorship aside** (image + copy + "Talk to us" → /contact) — reuse existing Sponsors concept.

**/contact:**
- CORE: render contact info as **luxury cards** (phone / WhatsApp / email / address), not a plain list. Address card = `events.venue`.

**Fonts (§B) — universal:** every PAGE HERO title AND section heading uses the two-line
Cinzel + Cormorant-italic-accent pattern (`text-gold-400` on dark heroes, `text-vermillion`
on light sections). Apply to ALL heroes + headings, not just homepage.

## Not forgotten / already done (so we don't redo)
Multi-page routes, page-hero system, category images+perks, testimonials, stats strip,
Most-Chosen badge, chief-guests lineup, contact form + table, image limit 15 MB,
LangToggle restyle, nav→routes.
