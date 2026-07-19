// components/site/home/Benefits.js
// "Blessings & Benefits" cards with a soft hover glow. event_highlights rows with
// section = 'blessings'. Icon may be a Lucide name or emoji.
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import { getLucideIcon } from "@/lib/lucideIcons";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function Benefits({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  return (
    <section className="section-y">
      <div className="container-luxury">
        <Reveal className="text-center max-w-2xl mx-auto">
          <SectionKicker>{t("section_blessings_kicker") || "Blessings & Benefits"}</SectionKicker>
          <LuxuryHeading className="mt-5" main={t("section_blessings_title") || "Blessings & Benefits"} accent={t("section_blessings_accent")} />
          <p className="mt-5 text-brown/70">{t("section_blessings_desc") || "The blessings extend far beyond the days of the event."}</p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((b, i) => {
            const Icon = getLucideIcon(b.icon);
            const title = pick(b, "title", lang);
            const desc = pick(b, "description", lang);
            return (
              <Reveal key={b.id || i} delay={i * 60}>
                <article className="group relative overflow-hidden rounded-[20px] border border-gold/15 bg-white p-7 transition-all duration-500 hover:shadow-luxury-lg hover:-translate-y-1">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-gold-400/25 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-vermillion/10 text-vermillion text-lg">
                      {Icon ? <Icon className="h-5 w-5" strokeWidth={1.7} /> : (b.icon || "✨")}
                    </span>
                    <div>
                      <h3 className="font-display text-lg md:text-[22px] text-brown">{title}</h3>
                      {desc && <p className="mt-2 text-brown/75 leading-[1.8]" style={{ fontSize: "1rem" }}>{desc}</p>}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
