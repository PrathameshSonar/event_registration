// components/site/home/SchedulePreview.js
// Programme preview — day-level only (day label + date + one-line theme). The
// full timed agenda lives on /event#schedule. Keeps the homepage compact.
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function SchedulePreview({ items = [], event }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  const scheduleIntro = pick(event, "schedule_intro", lang);
  // Per-day date + theme, keyed by day_label. Admin-edited repeater on the event.
  const dayMeta = {};
  (Array.isArray(event?.schedule_days) ? event.schedule_days : []).forEach((row) => {
    if (row && row.label) dayMeta[String(row.label).trim().toLowerCase()] = row;
  });

  // Unique day labels in order (we only show day-level info on the homepage).
  const days = [];
  items.forEach((it) => {
    const d = pick(it, "day_label", lang) || t("section_schedule_default_day") || "Schedule";
    if (!days.includes(d)) days.push(d);
  });

  return (
    <section id="schedule" className="section-y bg-[hsl(34,30%,94%)]">
      <div className="container-luxury">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          <Reveal>
            <SectionKicker>{t("section_schedule_kicker") || "The programme"}</SectionKicker>
            <LuxuryHeading className="mt-4" main={t("section_schedule_title") || "Daily Schedule"} accent={t("section_schedule_accent")} />
            <p className="mt-4 text-brown/70 leading-relaxed text-[15px]">{t("section_schedule_desc") || "A carefully curated sequence of rites from dawn to dusk."}</p>
            {scheduleIntro && <p className="mt-3 text-brown/70 leading-[1.7] text-[15px] whitespace-pre-wrap">{scheduleIntro}</p>}
            <div className="mt-6">
              <Link href="/event#schedule" className="inline-flex items-center gap-1 text-sm font-semibold text-vermillion hover:text-lotus">
                {t("home_view_schedule") || "View full schedule"} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-3">
              {days.map((d, i) => {
                const meta = dayMeta[String(d).trim().toLowerCase()];
                return (
                  <div key={d} className="luxury-card px-5 py-4 flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400/20 to-lotus/15 font-display text-lg text-vermillion">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <p className="font-display text-[17px] text-brown">{d}</p>
                        {meta?.date && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brown/50">{meta.date}</p>}
                      </div>
                      {meta?.theme && <p className="font-cormorant italic text-[15px] text-mutedgold leading-snug">{meta.theme}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
