// components/site/home/Hero.js
// Cinematic hero — full-bleed admin hero image, dark overlay, Cinzel title,
// glass countdown, gold CTAs. All copy from the active event + language dict.
"use client";

import { Calendar, MapPin, ArrowRight, Sparkles, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useRegistrationOpen } from "@/components/RegistrationProvider";
import { pick } from "@/lib/i18n";
import LuxuryCountdown from "@/components/site/LuxuryCountdown";

export default function Hero({ event, hasCategories, showEnquiry }) {
  const { t, lang } = useLanguage();
  const registrationOpen = useRegistrationOpen();

  const title = pick(event, "title", lang) || t("hero_event_fallback");
  const desc = pick(event, "short_description", lang) || t("hero_desc_fallback");
  const dates = pick(event, "date_time", lang) || t("hero_dates");
  const venue = pick(event, "venue", lang) || t("hero_venue");
  const heroImage = event?.hero_image_url;

  return (
    <section className="relative isolate overflow-hidden text-ivory min-h-[72vh] md:min-h-[76vh] flex items-end">
      {heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt={title} className="absolute inset-0 h-full w-full object-cover animate-slow-zoom" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(10,60%,28%)] via-[hsl(350,45%,22%)] to-[hsl(20,55%,14%)]" />
      )}
      {/* Bottom-weighted scrim: keeps the image visible up top, darkens only
          toward the bottom-left where the title/text sit (so they stay legible). */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-[hsl(20,45%,8%)]/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,hsla(32,95%,55%,0.14),transparent_62%)]" />
      <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-black/45 to-transparent" />

      <div className="container-luxury relative z-10 pt-24 pb-14 md:pb-20 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-gold/40 bg-black/40 px-3.5 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-flicker" />
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.24em] text-gold-400 font-semibold">
              {t("hero_badge") || "Divine Protection"} · {venue}
            </span>
          </div>

          <h1 className="mt-5 font-display font-semibold text-ivory text-hero-shadow text-balance leading-[1.05]" style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)" }}>
            {title}
          </h1>

          <p className="mt-5 max-w-xl text-ivory/90 leading-[1.65] text-pretty" style={{ fontSize: "1rem" }}>
            {desc}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-ivory/90">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-gold-400" /> <span className="text-[15px]">{dates}</span></div>
            <div className="hidden sm:block h-4 w-px bg-white/25" />
            <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-gold-400" /> <span className="text-[15px]">{venue}</span></div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {hasCategories && registrationOpen && (
              <a href="/registration" className="btn-gold">
                {t("hero_register_cta") || "Register Now"} <ArrowRight className="h-4 w-4" />
              </a>
            )}
            <a href="/donate" className="btn-outline-gold !border-gold/70 !text-gold-400 hover:!bg-gold/15">
              <Sparkles className="h-4 w-4" /> {t("nav_donate") || "Donate Now"}
            </a>
            {/* Above-the-fold entry to the enquiry — jumps to the #enquire section
                (which holds the form). Shown only when General Enquiry is enabled;
                doubly useful with no Sevas live, when the Register CTA is hidden. */}
            {showEnquiry && (
              <a href="#enquire" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-6 text-[15px] font-semibold text-ivory hover:bg-white/10 transition">
                <MessageCircle className="h-4 w-4" /> {t("enquiry_home_cta") || "Enquire Now"}
              </a>
            )}
          </div>

          {event?.start_at && (
            <div className="mt-9">
              <LuxuryCountdown targetISO={event.start_at} variant="glass" label={t("hero_countdown_label") || "The event begins in"} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
