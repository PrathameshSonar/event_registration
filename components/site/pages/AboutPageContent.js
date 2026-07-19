// components/site/pages/AboutPageContent.js — the About page. Reuses the Leadership
// and Pillars sections; adds an intro + an admin image collage (events.about_images).
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import Leadership from "@/components/site/home/Leadership";
import Pillars from "@/components/site/home/Pillars";

export default function AboutPageContent({ event, featuredGuest, pillars, hero }) {
  const { t, lang } = useLanguage();
  const h = hero || {};
  const about = pick(event, "long_description", lang) || pick(event, "short_description", lang);
  const images = (Array.isArray(event?.about_images) ? event.about_images : []).filter(Boolean).slice(0, 4);

  return (
    <>
      <PageHero image={h.image} kicker={h.kicker || t("section_about_kicker") || "Our Sanctum"} title={h.title || t("section_about_title") || "About"} subtitle={h.subtitle} />

      {about && (
        <section className="section-y mandala-bg">
          <div className="container-luxury max-w-3xl">
            <Reveal>
              <SectionKicker>{t("section_about_kicker") || "Overview"}</SectionKicker>
              <p className="mt-6 text-brown/80 leading-[1.85] whitespace-pre-wrap" style={{ fontSize: "1.125rem" }}>{about}</p>
            </Reveal>
          </div>
        </section>
      )}

      {images.length > 0 && (
        <section className="section-y">
          <div className="container-luxury">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((src, i) => (
                <Reveal key={i} delay={i * 60}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className={`rounded-3xl object-cover w-full aspect-[3/4] shadow-luxury ${i % 2 ? "mt-6" : ""}`} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <Leadership guest={featuredGuest} />
      <Pillars items={pillars} />
    </>
  );
}
