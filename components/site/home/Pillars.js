// components/site/home/Pillars.js
// Image cards (e.g. Puja / Gyan / Bhakti) — event_highlights rows with
// section = 'pillars'. Each card can carry an image (highlight.image_url).
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";

export default function Pillars({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  return (
    <section className="section-y">
      <div className="container-luxury">
        <Reveal className="max-w-2xl">
          <SectionKicker>{t("section_pillars_kicker") || "Our foundation"}</SectionKicker>
          <h2 className="mt-5 display-section text-brown">{t("section_pillars_title") || "The Three Pillars"}</h2>
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-3 gap-6">
          {items.map((h, i) => {
            const title = pick(h, "title", lang);
            const desc = pick(h, "description", lang);
            return (
              <Reveal key={h.id || i} delay={i * 100}>
                <article className="luxury-card overflow-hidden h-full">
                  {h.image_url ? (
                    <div className="relative h-56 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.image_url} alt={title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-4 left-5 rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-vermillion font-semibold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  ) : (
                    <div className="relative h-56 flex items-center justify-center bg-gradient-to-br from-gold-400/20 to-lotus/15 text-5xl">{h.icon || "🕉️"}</div>
                  )}
                  <div className="p-7">
                    <h3 className="font-display text-2xl text-brown">{title}</h3>
                    {desc && <p className="mt-3 text-brown/75 leading-[1.8]" style={{ fontSize: "1rem" }}>{desc}</p>}
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
