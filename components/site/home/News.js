// components/site/home/News.js
// Latest-news cards. event_news (already filtered to published by the server).
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function News({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  return (
    <section id="news" className="section-y bg-morning-sun scroll-mt-24">
      <div className="container-luxury">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <Reveal>
            <SectionKicker>{t("section_news_kicker") || "Latest News"}</SectionKicker>
            <LuxuryHeading className="mt-5 max-w-xl" main={t("section_news_title") || "News & Announcements"} accent={t("section_news_accent")} />
          </Reveal>
          <Reveal>
            <Link href="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-vermillion hover:text-lotus">
              {t("home_all_updates") || "All updates"} <ChevronRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((n, i) => {
            const title = pick(n, "title", lang);
            const body = pick(n, "body", lang);
            return (
              <Reveal key={n.id || i} delay={i * 80}>
                <article className="luxury-card h-full p-7 flex flex-col">
                  {n.published_at && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-mutedgold">{new Date(n.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  )}
                  <h3 className="mt-4 font-display text-xl md:text-[22px] text-brown leading-tight">{title}</h3>
                  {body && <p className="mt-3 text-brown/75 leading-[1.8] flex-1 whitespace-pre-wrap" style={{ fontSize: "1rem" }}>{body}</p>}
                  {n.attachment_url && (
                    <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1 text-[15px] font-semibold text-vermillion hover:text-lotus">
                      {n.attachment_name || t("download_cta") || "Download"} <ChevronRight className="h-4 w-4" />
                    </a>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
