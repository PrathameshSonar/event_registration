// components/site/pages/NewsPageContent.js — full news list (published event_news).
"use client";

import { FileText } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";

export default function NewsPageContent({ items, hero }) {
  const { t, lang } = useLanguage();
  const h = hero || {};
  const list = items || [];

  return (
    <>
      <PageHero image={h.image} kicker={h.kicker || t("section_news_kicker") || "Latest News"} title={h.title || t("section_news_title") || "News & Announcements"} subtitle={h.subtitle} />
      <section className="section-y mandala-bg">
        <div className="container-luxury">
          {list.length === 0 ? (
            <p className="text-center text-brown/50">{t("news_empty") || "No announcements yet."}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((n, i) => {
                const title = pick(n, "title", lang);
                const body = pick(n, "body", lang);
                return (
                  <Reveal key={n.id || i} delay={i * 60}>
                    <article className="luxury-card h-full overflow-hidden flex flex-col">
                      {n.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.image_url} alt="" className="w-full h-44 object-cover" />
                      )}
                      <div className="p-6 flex flex-col flex-1">
                        {n.published_at && <time className="text-[11px] font-semibold uppercase tracking-wider text-mutedgold">{new Date(n.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time>}
                        <h3 className="mt-2 font-display text-xl text-brown leading-tight">{title}</h3>
                        {body && <p className="mt-3 text-brown/70 text-[15px] leading-[1.75] flex-1 whitespace-pre-wrap">{body}</p>}
                        {n.attachment_url && (
                          <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-vermillion hover:text-lotus">
                            <FileText className="h-4 w-4" /> {n.attachment_name || t("download_cta") || "Download"}
                          </a>
                        )}
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
