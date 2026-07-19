// components/site/home/SchedulePreview.js
// Three-day programme preview. event_schedule rows grouped by day_label; each
// item shows time / title / one-line description.
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";

export default function SchedulePreview({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

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
            <h2 className="mt-5 display-section text-brown">{t("section_schedule_title") || "Daily Schedule"}</h2>
            <p className="mt-6 text-brown/70 leading-relaxed">{t("section_schedule_desc") || "A carefully curated sequence of rites from dawn to dusk."}</p>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-6">
              {days.map((d) => (
                <div key={d} className="luxury-card p-6 md:p-8">
                  <p className="font-display text-lg text-vermillion tracking-wide">{d}</p>
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
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
