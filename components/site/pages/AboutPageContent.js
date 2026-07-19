// components/site/pages/AboutPageContent.js — the About page. Intro + admin image
// collage (events.about_images) + value cards (event_highlights section='about') +
// Leadership + Pillars + Legacy (past Mahayagyas) + a gallery snippet → /gallery.
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";
import Leadership from "@/components/site/home/Leadership";
import Pillars from "@/components/site/home/Pillars";

export default function AboutPageContent({ event, featuredGuest, pillars, valueCards, legacy, gallery, hero }) {
  const { t, lang } = useLanguage();
  const h = hero || {};
  const about = pick(event, "long_description", lang) || pick(event, "short_description", lang);
  const images = (Array.isArray(event?.about_images) ? event.about_images : []).filter(Boolean).slice(0, 4);
  const cards = valueCards || [];
  const past = legacy || [];
  const snapshots = (gallery || []).filter((m) => m.url).slice(0, 6);

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

      {/* Mission / Vision / Purpose / Importance — value cards */}
      {cards.length > 0 && (
        <section className="section-y bg-morning-sun">
          <div className="container-luxury">
            <Reveal className="text-center max-w-xl mx-auto mb-12">
              <SectionKicker>{t("about_values_kicker") || "What we stand for"}</SectionKicker>
              <LuxuryHeading className="mt-5" main={t("about_values_title") || "Our guiding"} accent={t("about_values_accent") || "principles"} />
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((c, i) => {
                const title = pick(c, "title", lang);
                const desc = pick(c, "description", lang);
                return (
                  <Reveal key={c.id || i} delay={i * 70}>
                    <div className="luxury-card h-full p-7 text-center">
                      {c.icon && <div className="text-3xl mb-3">{c.icon}</div>}
                      <h3 className="font-display text-lg text-brown">{title}</h3>
                      {desc && <p className="mt-2 text-sm text-brown/70 leading-relaxed">{desc}</p>}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Leadership guest={featuredGuest} />
      <Pillars items={pillars} />

      {/* Legacy — previous Mahayagyas (archived events) */}
      {past.length > 0 && (
        <section className="section-y bg-[hsl(34,30%,94%)]">
          <div className="container-luxury">
            <Reveal className="text-center max-w-xl mx-auto mb-12">
              <SectionKicker>{t("about_legacy_kicker") || "An unbroken lineage"}</SectionKicker>
              <LuxuryHeading className="mt-5" main={t("about_legacy_title") || "Previous"} accent={t("about_legacy_accent") || "Mahayagyas"} />
            </Reveal>
            <div className="grid gap-6 md:grid-cols-3">
              {past.map((e, i) => {
                const title = pick(e, "title", lang);
                const when = pick(e, "date_time", lang);
                return (
                  <Reveal key={e.id || i} delay={i * 70}>
                    <article className="luxury-card h-full overflow-hidden">
                      {e.hero_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.hero_image_url} alt={title} className="h-40 w-full object-cover" />
                      )}
                      <div className="p-6">
                        {when && <p className="kicker text-vermillion">{when}</p>}
                        <h3 className="mt-2 font-display text-xl text-brown">{title}</h3>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
            <div className="mt-10 text-center">
              <Link href="/previous-events" className="text-sm inline-flex items-center gap-1 font-semibold text-vermillion hover:text-lotus">
                {t("about_legacy_all") || "See all past events"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Gallery snippet */}
      {snapshots.length > 0 && (
        <section className="section-y">
          <div className="container-luxury">
            <Reveal className="text-center max-w-xl mx-auto mb-12">
              <SectionKicker>{t("section_gallery_kicker") || "Moments"}</SectionKicker>
              <LuxuryHeading className="mt-5" main={t("section_gallery") || "Gallery"} accent={t("section_gallery_accent")} />
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {snapshots.map((m, i) => (
                <Reveal key={m.id || i} delay={i * 50}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.caption || ""} className="rounded-2xl object-cover w-full aspect-square shadow-luxury" />
                </Reveal>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/gallery" className="btn-outline-gold">{t("home_full_gallery") || "View full gallery"}</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
