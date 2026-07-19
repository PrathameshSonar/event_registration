# Replica Plan — port the "Mahayagya" (Emergent) UI onto our engine

> Goal: reproduce the exact look & feel of the Emergent marketing site
> (`Bagla_bhairav-main/`, **read-only reference — never edit it**) on top of OUR
> business logic (Supabase, Razorpay, QR, admin, RBAC, i18n). **Everything the
> visitor sees must be admin-controlled**, not hardcoded.
>
> Decisions locked: **whole-site** theme · use **framer-motion + embla** for 1:1
> fidelity · execute phase by phase, build-verifying each.

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
