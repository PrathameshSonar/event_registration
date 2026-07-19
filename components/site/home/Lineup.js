// components/site/home/Lineup.js
// Homepage "Chief Guests & Saints" — the guest lineup (non-featured guests; the
// featured one renders separately as the Leadership hero). Links to /event.
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function Lineup({ guests }) {
  const { t, lang } = useLanguage();
  const list = guests || [];
  if (!list.length) return null;

  return (
    <section className="section-y bg-morning-sun">
      <div className="container-luxury">
        <Reveal className="text-center max-w-xl mx-auto mb-8">
          <SectionKicker>{t("section_lineup_home_desc") || "Revered Guests"}</SectionKicker>
          <LuxuryHeading className="mt-5" main={t("section_lineup_home_title") || "Chief Guests"} accent={t("section_lineup_home_accent")} />
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {list.slice(0, 6).map((g) => {
            const gName = pick(g, "name", lang);
            const gRole = pick(g, "role", lang);
            return (
              <Reveal key={g.id}>
                <div className="text-center">
                  {g.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.photo_url} alt={gName} loading="lazy" decoding="async" className="w-full aspect-square rounded-3xl object-cover shadow-luxury" />
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

        {list.length > 6 && (
          <div className="mt-10 text-center">
            <Link href="/event" className="text-sm inline-flex items-center gap-1 font-semibold text-vermillion hover:text-lotus">
              {t("nav_event_details") || "See the full event"} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
