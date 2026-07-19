// components/site/home/Rituals.js
// Icon feature cards — the "Sacred Rites". event_highlights rows with
// section = 'highlights' (the default group). Icon may be a Lucide name or emoji.
"use client";

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
        <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8 mb-14">
          <Reveal>
            <SectionKicker>{t("section_rituals_kicker") || "The Sacred Rites"}</SectionKicker>
            <LuxuryHeading className="mt-5 max-w-2xl" main={t("section_highlights_title") || "Key Rituals & Highlights"} accent={t("section_rituals_accent")} />
          </Reveal>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((h, i) => {
            const Icon = getLucideIcon(h.icon);
            const title = pick(h, "title", lang);
            const desc = pick(h, "description", lang);
            return (
              <Reveal key={h.id || i} delay={i * 60}>
                <article className="luxury-card h-full p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400/20 to-lotus/15 text-vermillion text-2xl">
                    {Icon ? <Icon className="h-6 w-6" strokeWidth={1.6} /> : (h.icon || "🪔")}
                  </div>
                  <h3 className="mt-6 font-display text-xl md:text-[22px] text-brown">{title}</h3>
                  {desc && <p className="mt-3 text-brown/75 leading-[1.8]" style={{ fontSize: "1rem" }}>{desc}</p>}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
