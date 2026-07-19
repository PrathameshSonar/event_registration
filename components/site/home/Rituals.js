// components/site/home/Rituals.js
// Icon feature cards — the "Sacred Rites". event_highlights rows with
// section = 'highlights' (the default group). Icon may be a Lucide name or emoji.
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import { getLucideIcon } from "@/lib/lucideIcons";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function Rituals({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  return (
    <section className="section-y bg-morning-sun">
      <div className="container-luxury">
        <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8 mb-10">
          <Reveal>
            <SectionKicker>{t("section_rituals_kicker") || "The Sacred Rites"}</SectionKicker>
            <LuxuryHeading className="mt-5 max-w-2xl" main={t("section_highlights_title") || "Key Rituals & Highlights"} accent={t("section_rituals_accent")} />
          </Reveal>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3">
          {items.slice(0, 3).map((h, i) => {
            const Icon = getLucideIcon(h.icon);
            const title = pick(h, "title", lang);
            const desc = pick(h, "description", lang);
            return (
              <Reveal key={h.id || i} delay={i * 60}>
                <article className="luxury-card h-full p-4 sm:p-6 lg:p-7">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400/20 to-lotus/15 text-vermillion text-xl sm:text-2xl">
                    {Icon ? <Icon className="h-5 w-5" strokeWidth={1.6} /> : (h.icon || "🪔")}
                  </div>
                  <h3 className="mt-3 sm:mt-5 font-display text-base sm:text-lg lg:text-xl text-brown leading-tight">{title}</h3>
                  {desc && <p className="mt-1.5 sm:mt-2.5 text-brown/75 leading-[1.6] line-clamp-3 sm:line-clamp-4 text-[13px] sm:text-[0.95rem]">{desc}</p>}
                </article>
              </Reveal>
            );
          })}
        </div>

        {items.length > 3 && (
          <div className="mt-8 text-center">
            <Link href="/event" className="inline-flex items-center gap-1 text-sm font-semibold text-vermillion hover:text-lotus">
              {t("home_see_event") || "See full event"} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
