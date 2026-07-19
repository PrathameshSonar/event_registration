// components/site/home/AboutMahayagya.js
// Asymmetric bento: intro copy + stat cards on the left, an admin image grid on
// the right. Stats come from events.stats; images from events.about_images.
"use client";

import { Flame } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function AboutMahayagya({ event }) {
  const { t, lang } = useLanguage();
  const aboutText = pick(event, "long_description", lang);
  const stats = Array.isArray(event?.stats) ? event.stats : [];
  const images = (Array.isArray(event?.about_images) ? event.about_images : []).filter(Boolean).slice(0, 4);

  if (!aboutText && !stats.length && !images.length) return null;

  return (
    <section id="about" className="section-y mandala-bg">
      <div className="container-luxury">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <Reveal>
            <SectionKicker>{t("section_about_kicker") || "Why this gathering"}</SectionKicker>
            <LuxuryHeading className="mt-5" main={t("section_about_title") || "About the Mahayagya"} accent={t("section_about_accent")} />
            {aboutText && <p className="mt-6 text-brown/80 max-w-xl leading-[1.8] whitespace-pre-wrap" style={{ fontSize: "1.125rem" }}>{aboutText}</p>}

            {stats.length > 0 && (
              <ul className={`mt-8 grid gap-4 ${stats.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {stats.map((s, i) => (
                  <li key={i} className="luxury-card p-5 text-center">
                    <div className="font-display text-2xl md:text-3xl text-vermillion">{s.value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-brown/60">{s.label}</div>
                  </li>
                ))}
              </ul>
            )}
          </Reveal>

          {images.length > 0 && (
            <Reveal delay={100}>
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-4 row-span-2 ornate-frame overflow-hidden rounded-[24px] shadow-luxury">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[0]} alt="" className="h-full w-full object-cover aspect-[4/5]" />
                </div>
                {images[1] && (
                  <div className="col-span-2 overflow-hidden rounded-[24px] shadow-luxury">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[1]} alt="" className="h-full w-full object-cover aspect-square" />
                  </div>
                )}
                {images[2] && (
                  <div className="col-span-2 overflow-hidden rounded-[24px] shadow-luxury">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[2]} alt="" className="h-full w-full object-cover aspect-square" />
                  </div>
                )}
                {event?.date_time && (
                  <div className="col-span-6 luxury-card px-6 py-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-shine text-white shadow-gold">
                      <Flame className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-display text-lg text-brown">{pick(event, "title", lang)}</p>
                      <p className="text-sm text-brown/65">{pick(event, "date_time", lang)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
