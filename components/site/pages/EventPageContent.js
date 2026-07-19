// components/site/pages/EventPageContent.js
// Full event page: overview + full schedule + guest/priest lineup + venue map +
// travel info + registration CTA. All admin-data-driven (active event + its
// schedule/guests). Restores the venue map, travel and lineup dropped from the
// homepage rebuild.
"use client";

import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";

export default function EventPageContent({ event, schedule, guests, hero }) {
  const { t, lang } = useLanguage();
  const h = hero || {};
  const rows = schedule || [];
  const lineup = (guests || []);
  const overview = pick(event, "long_description", lang) || pick(event, "short_description", lang);
  const venue = pick(event, "venue", lang);
  const travel = pick(event, "travel_info", lang);
  const mapUrl = event?.map_url;

  // Group schedule by day label (show ALL items, unlike the homepage preview).
  const days = [];
  const byDay = {};
  rows.forEach((it) => {
    const d = pick(it, "day_label", lang) || t("section_schedule_default_day") || "Schedule";
    if (!byDay[d]) { byDay[d] = []; days.push(d); }
    byDay[d].push(it);
  });

  return (
    <>
      <PageHero
        image={h.image}
        kicker={h.kicker || t("nav_event_details") || "The Event"}
        title={h.title || pick(event, "title", lang) || t("hero_event_fallback")}
        subtitle={h.subtitle || pick(event, "date_time", lang)}
        size="lg"
      />

      {overview && (
        <section className="section-y mandala-bg">
          <div className="container-luxury max-w-3xl">
            <Reveal>
              <SectionKicker>{t("section_about_kicker") || "Overview"}</SectionKicker>
              <p className="mt-6 text-brown/80 leading-[1.85] whitespace-pre-wrap" style={{ fontSize: "1.125rem" }}>{overview}</p>
            </Reveal>
          </div>
        </section>
      )}

      {days.length > 0 && (
        <section id="schedule" className="section-y bg-[hsl(34,30%,94%)] scroll-mt-24">
          <div className="container-luxury">
            <Reveal className="text-center max-w-xl mx-auto mb-12">
              <SectionKicker>{t("section_schedule_kicker") || "Three Sacred Days"}</SectionKicker>
              <h2 className="mt-5 display-section text-brown">{t("section_schedule_title") || "Daily Schedule"}</h2>
            </Reveal>
            <div className="grid gap-6 lg:grid-cols-3">
              {days.map((d) => (
                <Reveal key={d}>
                  <div className="luxury-card p-6 md:p-7 h-full">
                    <p className="font-display text-lg text-vermillion tracking-wide">{d}</p>
                    <ul className="mt-5 space-y-3">
                      {byDay[d].map((it, i) => {
                        const title = pick(it, "title", lang);
                        const desc = pick(it, "description", lang);
                        return (
                          <li key={it.id || i} className="flex items-start gap-3 rounded-xl border border-gold/10 bg-cream/60 px-3.5 py-3">
                            <span className="w-16 shrink-0 font-mono text-[12px] font-semibold text-vermillion tracking-wide">{it.time_label || "—"}</span>
                            <div>
                              <p className="text-[15px] font-semibold text-brown">{title}</p>
                              {desc && <p className="text-[13.5px] text-brown/65 mt-0.5">{desc}</p>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {lineup.length > 0 && (
        <section className="section-y bg-morning-sun">
          <div className="container-luxury">
            <Reveal className="text-center max-w-xl mx-auto mb-12">
              <SectionKicker>{t("section_lineup_title") || "The Lineup"}</SectionKicker>
              <h2 className="mt-5 display-section text-brown">{t("section_lineup_desc") || "Saints, artists and priests"}</h2>
            </Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {lineup.map((g) => {
                const gName = pick(g, "name", lang);
                const gRole = pick(g, "role", lang);
                return (
                  <Reveal key={g.id}>
                    <div className="text-center">
                      {g.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.photo_url} alt={gName} className="w-full aspect-square rounded-3xl object-cover shadow-luxury" />
                      ) : (
                        <div className="w-full aspect-square rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-4xl">🙏</div>
                      )}
                      <h3 className="font-display text-lg text-brown mt-3">{gName}</h3>
                      {gRole && <p className="text-vermillion text-xs font-semibold">{gRole}</p>}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(venue || mapUrl) && (
        <section className="section-y">
          <div className="container-luxury grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <SectionKicker>{t("section_venue_title") || "The Venue"}</SectionKicker>
              {venue && <h2 className="mt-5 display-section text-brown">{venue}</h2>}
              {travel && <p className="mt-6 text-brown/75 leading-[1.85] whitespace-pre-wrap">{travel}</p>}
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 btn-outline-gold">
                  <MapPin className="h-4 w-4" /> {t("section_get_directions") || "Get Directions"}
                </a>
              )}
            </Reveal>
            <Reveal delay={100}>
              <div className="overflow-hidden rounded-[24px] shadow-luxury aspect-[4/3]">
                <iframe
                  title="Venue map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(venue || "India")}&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="relative section-y overflow-hidden bg-[hsl(350,45%,16%)] text-ivory">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsla(32,95%,55%,0.16),transparent_60%)]" />
        <div className="container-luxury text-center relative z-10">
          <SectionKicker light>{t("section_register_kicker") || "Reserve your seat"}</SectionKicker>
          <h2 className="mt-5 display-section text-ivory">{t("section_register_title") || "Choose a Yajmaan tier"}</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/registration" className="btn-gold">{t("hero_register_cta") || "Register Now"} <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/live" className="btn-outline-gold border-gold/60 !text-ivory hover:!bg-white/10">{t("live_watch") || "Watch Live"}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
