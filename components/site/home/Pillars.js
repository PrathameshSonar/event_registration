// components/site/home/Pillars.js
// Image cards (e.g. Puja / Gyan / Bhakti) — event_highlights rows with
// section = 'pillars'. Each card can carry an image (highlight.image_url).
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function Pillars({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  return (
    <section className="section-y">
      <div className="container-luxury">
        <Reveal className="max-w-2xl">
          <SectionKicker>{t("section_pillars_kicker") || "Our foundation"}</SectionKicker>
          <LuxuryHeading className="mt-5" main={t("section_pillars_title") || "The Three Pillars"} accent={t("section_pillars_accent")} />
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-6">
          {items.slice(0, 3).map((h, i) => {
            const title = pick(h, "title", lang);
            const desc = pick(h, "description", lang);
            return (
              <Reveal key={h.id || i} delay={i * 100}>
                <article className="luxury-card overflow-hidden h-full">
                  {h.image_url ? (
                    <div className="relative h-28 sm:h-40 lg:h-44 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.image_url} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-4 left-5 rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-vermillion font-semibold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  ) : (
                    <div className="relative h-28 sm:h-40 lg:h-44 flex items-center justify-center bg-gradient-to-br from-gold-400/20 to-lotus/15 text-4xl sm:text-5xl">{h.icon || "🕉️"}</div>
                  )}
                  <div className="p-3.5 sm:p-5 lg:p-6">
                    <h3 className="font-display text-base sm:text-lg lg:text-xl text-brown leading-tight">{title}</h3>
                    {desc && <p className="mt-1.5 sm:mt-2.5 text-brown/75 leading-[1.6] line-clamp-3 text-[13px] sm:text-[0.95rem]">{desc}</p>}
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
