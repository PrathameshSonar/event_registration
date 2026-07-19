// components/site/home/Hero.js
// Cinematic hero — full-bleed admin hero image, dark overlay, Cinzel title,
// glass countdown, gold CTAs. All copy from the active event + language dict.
"use client";

import { Calendar, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import LuxuryCountdown from "@/components/site/LuxuryCountdown";

export default function Hero({ event, hasCategories }) {
  const { t, lang } = useLanguage();

  const title = pick(event, "title", lang) || t("hero_event_fallback");
  const desc = pick(event, "short_description", lang) || t("hero_desc_fallback");
  const dates = pick(event, "date_time", lang) || t("hero_dates");
  const venue = pick(event, "venue", lang) || t("hero_venue");
  const heroImage = event?.hero_image_url;

  return (
    <section className="relative isolate overflow-hidden text-ivory min-h-[88vh] flex items-end">
      {heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt={title} className="absolute inset-0 h-full w-full object-cover animate-slow-zoom" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(10,60%,28%)] via-[hsl(350,45%,22%)] to-[hsl(20,55%,14%)]" />
      )}
      {/* Cinematic dark overlay with a warm sunlit glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-[hsl(20,45%,8%)]/95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,hsla(32,95%,55%,0.20),transparent_60%)]" />
      <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-black/60 to-transparent" />

      <div className="container-luxury relative z-10 pt-32 pb-24 md:pb-32 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto">
          <div className="inline-flex items-center gap-3 rounded-full border border-gold/40 bg-black/40 px-4 py-2 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-flicker" />
            <span className="text-xs sm:text-[13px] uppercase tracking-[0.28em] text-gold-400 font-semibold">
              {t("hero_badge") || "Divine Protection"} · {venue}
            </span>
          </div>

          <h1 className="mt-7 font-display font-semibold text-ivory text-hero-shadow text-balance leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 6.5vw, 4.75rem)" }}>
            {title}
          </h1>

          <p className="mt-7 max-w-xl text-ivory/90 leading-[1.75] text-pretty" style={{ fontSize: "1.125rem" }}>
            {desc}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-ivory/90">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-gold-400" /> <span className="text-[15px]">{dates}</span></div>
            <div className="hidden sm:block h-4 w-px bg-white/25" />
            <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-gold-400" /> <span className="text-[15px]">{venue}</span></div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            {hasCategories && (
              <a href="/registration" className="btn-gold">
                {t("hero_register_cta") || "Register Now"} <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <a href="/donate" className="btn-outline-gold !border-gold/70 !text-gold-400 hover:!bg-gold/15">
              <Sparkles className="h-4 w-4" /> {t("nav_donate") || "Donate Now"}
            </a>
          </div>

          {event?.start_at && (
            <div className="mt-14">
              <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-gold-400 font-bold">{t("hero_countdown_label") || "The event begins in"}</p>
              <LuxuryCountdown targetISO={event.start_at} variant="glass" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
