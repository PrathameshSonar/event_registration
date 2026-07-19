// components/site/home/SchedulePreview.js
// Three-day programme preview. event_schedule rows grouped by day_label; each
// item shows time / title / one-line description.
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

  // Group rows by day label, preserving order.
  const days = [];
  const byDay = {};
  items.forEach((it) => {
    const d = pick(it, "day_label", lang) || t("section_schedule_default_day") || "Schedule";
    if (!byDay[d]) { byDay[d] = []; days.push(d); }
    byDay[d].push(it);
  });

  return (
    <section id="schedule" className="section-y bg-[hsl(34,30%,94%)]">
      <div className="container-luxury">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-14">
          <Reveal>
            <SectionKicker>{t("section_schedule_kicker") || "The programme"}</SectionKicker>
            <LuxuryHeading className="mt-5" main={t("section_schedule_title") || "Daily Schedule"} accent={t("section_schedule_accent")} />
            <p className="mt-6 text-brown/70 leading-relaxed">{t("section_schedule_desc") || "A carefully curated sequence of rites from dawn to dusk."}</p>
            {scheduleIntro && <p className="mt-4 text-brown/70 leading-[1.8] whitespace-pre-wrap">{scheduleIntro}</p>}
            <div className="mt-8">
              <Link href="/event#schedule" className="inline-flex items-center gap-1 text-sm font-semibold text-vermillion hover:text-lotus">
                {t("home_view_schedule") || "View full schedule"} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-6">
              {days.map((d) => {
                const meta = dayMeta[String(d).trim().toLowerCase()];
                return (
                <div key={d} className="luxury-card p-6 md:p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-display text-lg text-vermillion tracking-wide">{d}</p>
                    {meta?.date && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brown/50">{meta.date}</p>}
                  </div>
                  {meta?.theme && <p className="mt-1 font-cormorant italic text-[17px] text-mutedgold">{meta.theme}</p>}
                  <ul className="mt-5 space-y-3">
                    {byDay[d].map((it, i) => {
                      const title = pick(it, "title", lang);
                      const desc = pick(it, "description", lang);
                      return (
                        <li key={it.id || i} className="flex items-start gap-4 rounded-xl border border-gold/10 bg-cream/60 px-4 py-3.5">
                          <span className="w-20 shrink-0 font-mono text-[13px] font-semibold text-vermillion tracking-wider">{it.time_label || "—"}</span>
                          <div>
                            <p className="text-base font-semibold text-brown">{title}</p>
                            {desc && <p className="text-[14.5px] text-brown/70 mt-0.5">{desc}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
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
