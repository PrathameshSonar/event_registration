# Replica Plan — port the "Mahayagya" (Emergent) UI onto our engine

> Goal: reproduce the exact look & feel of the Emergent marketing site
> (`Bagla_bhairav-main/`, **read-only reference — never edit it**) on top of OUR
> business logic (Supabase, Razorpay, QR, admin, RBAC, i18n). **Everything the
> visitor sees must be admin-controlled**, not hardcoded.
>
> Decisions locked: **whole-site** theme · embla for the carousel · execute phase
> by phase, build-verifying each.

## ⚠️ SCOPE CORRECTION (2026-07-19) — multi-page + restore dropped features
The reference is a **multi-page** site; the homepage sections are PREVIEWS that
link to full pages. Our Phase-4 build made the homepage single-page with anchor
links — WRONG. Also, the homepage rebuild dropped several sections our original
had. Both are now in scope (Phases 7–8 below).

**Reference pages the navbar links to (each its own route):**
`/about`, `/event` (full schedule/details), `/registration` (tier list) +
`/registration/[id]` (form) + `/registration/lookup`, `/gallery`, `/live`,
`/news`, `/faq`, `/contact` (+ form), `/donations`. Homepage sections link out.

**Dropped from our original in the Phase-4 rebuild (data + admin editors still exist — just not rendered):**
Videos (YouTube `event_media`), non-featured guest **lineup**, **venue map**,
**travel_info** ("Plan Your Visit"), **Downloads**, on-page **Contact** section,
social-proof count. To restore on the homepage and/or the new full pages.

## Their stack vs ours
| | Theirs (reference) | Ours |
|---|---|---|
| Framework | Next.js App Router | Next.js 16 App Router |
| CSS | Tailwind **v3** (`tailwind.config.js`) + shadcn/ui | Tailwind **v4** (`@theme inline` in `app/globals.css`) |
| Fonts | Cinzel / Cormorant Garamond / Inter (`next/font`) | Geist (to be replaced) |
| Anim | framer-motion + embla + tailwindcss-animate | CSS `.reveal` (to be augmented) |
| Content | hardcoded `lib/site-data.js` | **admin-controlled DB** (Supabase) |
| Payments/QR/admin | none (stub) | full engine (unchanged) |

## Design system to port (from their `design_guidelines.json` + `globals.css` + `tailwind.config.js`)
- **Fonts**: Cinzel (display/headings), Cormorant Garamond (italic accents), Inter (body, 17px/1.75).
- **Palette** (HSL): vermillion `10 70% 40%`, crimson `348 83% 47%`, maroon `350 45% 30%`(+900), temple-gold `43 74% 49%`(+400/600/700), amber2 `35 92% 50%`, saffron `32 95% 53%`, lotus `24 90% 55%`, ivory `40 33% 96%`(+50), cream, sand `34 30% 92%`, brown `20 25% 15%`(+700/500), charcoal, mutedgold. **Never pure black text.**
- **Component classes**: `container-luxury` (max-1280 px-6/10), `container-nav` (max-1400), `section-y` (py-24/32), `kicker`/`kicker-light`, `luxury-card` (20px + soft shadow + hover -translate-y-1), `btn-gold`/`btn-outline-gold`/`btn-maroon` (48px, 14px radius, gradient), `display-hero`/`display-section` (Cinzel clamp), `glass-nav`, `mandala-bg`, `ornate-frame`, `ornament`, `text-hero-shadow`, `grain`, `.reveal`.
- **Shadows**: `luxury` `0 10px 30px -10px rgba(90,45,20,.08)`, `luxury-lg`, `gold`.
- **Gradients**: `temple-lamp`, `sacred-fire`, `morning-sun`, `gold-shine`.
- **Animations**: `flicker` (3s), `fade-up` (.9s), `slow-zoom` (18s).

## Homepage — their 14 sections → our admin data
1. **Hero** (full-bleed image, dark overlay, Cinzel title, glass countdown, gold CTAs) → `events` (title/dates/venue/hero_image/start_at).
2. **About Mahayagya** (bento: text + stat cards 36/3/5000 + image grid) → `events.long_description` + `events.stats` ✅ + bento images (NEW: `events.about_images` or reuse gallery).
3. **About Guruji** (portrait card + bullets + quote + "Mahamandaleshwar" badge) → `event_guests.is_featured` ✅ + NEW fields `bullets` (jsonb) + `quote`.
4. **About Pitham** (Puja / Gyan / Bhakti — 3 image cards) → `event_highlights` section=`pillars` ✅ (add optional per-card image).
5. **Key Rituals** (6 icon cards) → `event_highlights` section=`highlights` ✅ (icon supports Lucide name or emoji).
6. **Benefits** (6 blessing cards) → `event_highlights` section=`blessings` ✅.
7. **Schedule preview** (3 day cards, 3 items each) → `event_schedule` (needs day/desc grouping — schedule already has day_label + title; add `desc`, `sort`).
8. **Registration CTA** (maroon bg, 3 tier cards, "Most Chosen") → `categories` + `is_recommended` ✅ (+ optional `tagline`).
9. **Donation + Live** (split banners) → our `/donate` + `events.livestream_*` ✅.
10. **Testimonials** (embla carousel) → `event_testimonials` ✅.
11. **Gallery** (masonry + lightbox) → `event_media` (images).
12. **News** (3 cards) → `event_news` ✅.
13. **FAQ** (accordion) → `event_faqs` ✅.
14. **Final CTA** (gradient banner) → `events` dates.

**~70% of the content model already exists** (stats, pillars, blessings, testimonials, featured-guest, most-chosen were built 2026-07-19). Remaining schema is small + additive (Guruji bullets/quote, bento/pillar images, schedule desc, category tagline).

## Layout / Nav / Footer
- Root layout: add Cinzel/Cormorant/Inter; keep branding (`unstable_cache`) + `LiveBanner` + providers; keep static pages static.
- Port the **glass sticky Navbar** (scroll-aware, mobile drawer, gold pill CTAs) and **luxury Footer** (big CTA, explore/contact columns, socials) — nav = our routes, footer contact/socials from `events`.

## Small helpers to port
`Countdown` (glass), `SectionKicker`, `Reveal` (framer-motion), `TestimonialsCarousel` (embla), `GalleryMasonry` (+ lightbox), `ScrollToTop`.

## Business logic — untouched, just re-skinned
Registration → `/register/[id]` + `CheckoutForm` (restyled). Donations → `/donate`. Live → livestream. Lookup → `/my-pass`. Payments / QR / scanner / admin / RBAC / reconciliation — **unchanged**.

## Phased execution
1. **Foundation** *(this phase)* — fonts + port full theme into v4 `@theme` + component classes, keeping admin branding intact; add `framer-motion` + `embla-carousel-react` deps.
2. **Nav + Footer + helpers** (Countdown, Kicker, Reveal, carousel, masonry, ScrollToTop).
3. **Schema top-ups** — Guruji bullets/quote, bento/pillar images, schedule desc, category tagline (all admin-editable).
4. **Homepage rebuild** — 14 sections, each wired to admin data + i18n, build-verified.
5. **Re-skin** register / donate / checkout / lookup / legal in the new theme.
6. **Polish** — animations, mobile, reduced-motion, lighthouse, static-page `○` check.
7. **Multi-page structure (NEW)** — build the separate routes the reference has, and
   turn the homepage sections into PREVIEWS that link to them:
   - `/about`, `/event` (full schedule + rituals + guruji), `/gallery` (full grid),
     `/live` (stream page), `/news` (list), `/faq` (full), `/contact` (info + form),
     `/registration` (tier list page). All admin-data-driven + i18n + in the (site) group.
   - Homepage previews gain "See full …" links; nav switches from anchors to routes.
8. **Restore dropped homepage features (NEW)** — re-add (as sections and/or on the new
   pages): **Videos** (YouTube event_media), **guest lineup** (non-featured guests),
   **venue map**, **travel_info**, **Downloads**, on-page **Contact**.

## Key risks / notes
- **Tailwind v3 → v4 translation** is the crux: their `tailwind.config.js` colors/shadows/gradients/animations must live in our `@theme`, and their `@apply`-based component classes must be re-expressed for v4. Must not break the admin **branding** override (brand/accent CSS vars).
- **Gold scale collision**: our `gold-*` is admin-brandable (maps to `--accent-*`); their gold values differ slightly. Resolution: align the accent defaults to their temple-gold ramp so an unbranded site matches theirs, branding still overrides.
- Every hardcoded string in `site-data.js` becomes admin content — nothing ships hardcoded.
- Heavy overlap with `components/HomeContent.js` — coordinate with the other dev.

## CSS structure (clean split — not one big file)
- `app/globals.css` — lean entry: `@import "tailwindcss"` + the three partials + body.
- `app/styles/tokens.css` — design tokens (`:root` brand vars + `@theme` palette/fonts/shadows/animations).
- `app/styles/luxury.css` — ported component classes (`container-luxury`, `btn-*`, `luxury-card`, `display-*`, `glass-nav`, `mandala-bg`, gradients) + keyframes.
- `app/styles/app.css` — app-specific utilities (QR scanner, scrollbar, gold-divider, reveal, diya-flicker).

## Changelog
- 2026-07-19 — plan created.
- 2026-07-19 — **Phase 1 (theme foundation) done, build-verified:**
  - Added **Cinzel / Cormorant Garamond / Inter** via next/font in `app/layout.tsx`.
  - Ported the full theme (palette, fonts, shadows, gradients, animations, component classes) into the new `app/styles/*.css` partials; `globals.css` is now a lean entry. Admin branding (brand/accent CSS vars) preserved; gold ramp aligned to the reference temple-gold.
  - Added `framer-motion` + `embla-carousel-react` to `package.json` — **⚠️ run `npm install` before Phase 2** (nothing imports them yet, so the build is green without it).
  - Next: Phase 2 (Navbar, Footer, Countdown, Reveal, SectionKicker, carousel, masonry).
- 2026-07-19 — **Phase 2 (nav/footer/helpers) done, build-verified:**
  - ⚠️ **Dropped framer-motion** — inspection showed the reference never imports it (its `Reveal` is CSS + IntersectionObserver; masonry is CSS columns). Only **embla-carousel-react** is genuinely used, so only that was installed. Cleaner, lighter.
  - New `components/site/`: `Reveal`, `SectionKicker`, `LuxuryCountdown`, `TestimonialsCarousel` (embla), `GalleryMasonry` (+ lightbox), `LuxuryNavbar` (branding + i18n + our routes), `LuxuryFooter` (branding + event contact/socials). All **admin-driven / data-driven** — no hardcoded content.
  - Navbar/Footer are **not yet wired into the root layout** (would double up with HomeContent's inline header) — that swap happens in Phase 4 during the homepage rebuild.
  - i18n: components use `t(key) || fallback`; the full key set (countdown_*, nav_*, footer_*, section_*) lands in Phase 4 when all homepage copy is added at once.
  - Next: Phase 3 (schema top-ups: Guruji bullets/quote, bento/pillar images, schedule desc, category tagline) → Phase 4 (homepage rebuild).
- 2026-07-19 — **Phase 3 (schema top-ups) done, build-verified. Re-run `supabase/run_all.sql`.**
  - Additive columns: `event_guests.bullets`(jsonb)+`quote`(text); `event_highlights.image_url`; `event_schedule.description`; `categories.tagline`+`perks`(jsonb); `events.about_images`(jsonb). All whitelisted in their routes + typed.
  - Admin editing wired: CategoryRow (tagline + perks-per-line), EventRow (About bento MediaPicker grid), HomeContentManager (guest Leadership bullets+quote when featured, highlight card image, schedule one-line detail).
  - Next: **Phase 4** — rebuild the homepage as the 14 luxury sections, wire the new Navbar/Footer into the layout, add the full i18n key set.
- 2026-07-19 — **Phase 4 (homepage rebuild) DONE, build-verified. `/` still static `○`.**
  - `components/HomeContent.js` rewritten as a lean **composer**; the 14 sections live in `components/site/home/*` (Hero, Livestream, AboutMahayagya, Leadership, Pillars, Rituals, Benefits, SchedulePreview, RegistrationCta, DonateLive, Testimonials, Gallery, News, Faq, FinalCta) — one file per section (clean split).
  - Every section is **admin-data-driven** (pick() + our schema) and **hides itself when empty** — no hardcoded content. Icons resolve Lucide-name → component via new `lib/lucideIcons.js`, else render as emoji.
  - Navbar/Footer rendered by HomeContent (scoped to home for now). Social brand icons inlined in `components/site/BrandIcons.js` (our lucide 1.18 dropped Facebook/Instagram/Youtube).
  - Removed the now-unused `downloads`/`registeredCount` from `app/page.tsx` (the luxury design has no Downloads section / social-proof pill — can re-add later).
  - Full i18n chrome keys (nav_*, hero_*, section_*_kicker, section_register/faq/final_*, footer_*) added to **en/hi/mr**.
  - ⚠️ **Visual QA needed** — build passing ≠ pixel-correct. Run `npm run dev` and eyeball the hero/nav overlay, fonts, colours, mobile.
  - Next: **Phase 5** — re-skin register / donate / checkout / my-pass / legal in the luxury theme + put Navbar/Footer in a shared layout.
- 2026-07-19 — **Phase 5a (shared chrome) DONE, build-verified.**
  - New **`app/(site)/` route group** with `layout.tsx` rendering LuxuryNavbar + `<main>` + LuxuryFooter. Moved the public pages in (`page.tsx` home, donate, feedback, my-pass, pitham, previous-events, privacy, refund, register, terms). `admin`/`scan`/`api`/`entry`/`pass` stay outside — no marketing chrome. Navbar/Footer removed from HomeContent (now provided by the group layout).
  - Footer contact/socials come from new **`lib/siteEvent.js` `getSiteEvent()`** (unstable_cache, 5-min) so the layout does **not** turn static pages dynamic — verified `/`, `/terms`, `/privacy`, `/donate`, `/my-pass` all still `○`.
  - Fixed the Hero (removed the negative-margin overlay that put dark nav text on the dark hero — matches the reference's nav-above-hero bar).
  - ⚠️ The `app/register` move hit a Windows file lock (dev server running) — completed by moving the inner `[id]` folder. If you see a stray empty `app/register`, it's gone.
  - **Remaining (Phase 5b):** re-skin the page *contents* (register list, donate form, my-pass, legal, and the MUI-heavy CheckoutForm) into the luxury theme. They're now framed by the chrome + ivory bg but still use their old internal styling.
- 2026-07-19 — **Phase 5b (page re-skins) DONE, build-verified.**
  - Re-skinned to luxury + **removed the now-duplicate inline headers/footers** (they double-rendered under the (site) layout): legal pages (via new `components/site/LegalShell.js` + `.prose-legal`), `pitham`, `my-pass`, `donate`, `feedback`, `RegisterPageContent` (had its own `<Footer/>`!), `PreviousEventsContent` (own header + `<Footer/>`). Cleaned unused imports.
  - **Scope decisions locked (2026-07-19):** target = **Hybrid** (keep rich homepage + add a few key pages), restore dropped features **on the new full pages**, finish 5b before building pages.
  - Deferred: the MUI-heavy **CheckoutForm** internals (functional + framed by the luxury register shell; a full MUI→luxury re-theme is a later polish pass).
  - Next: **Phase 7 (hybrid)** — build `/event`, `/gallery`, `/registration` pages + homepage "See full…" preview links; **Phase 8** — restore videos/lineup/venue/travel/downloads onto those pages.
