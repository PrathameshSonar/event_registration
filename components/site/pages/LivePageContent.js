// components/site/pages/LivePageContent.js — the live stream page.
"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { youtubeId, youtubeEmbedUrl } from "@/lib/youtube";
import PageHero from "@/components/site/PageHero";

export default function LivePageContent({ event, hero }) {
  const { t } = useLanguage();
  const h = hero || {};
  const url = event?.livestream_url;
  const isLive = !!(event?.livestream_is_live && url);
  const embed = url ? (youtubeId(url) ? youtubeEmbedUrl(url) : url) : null;

  return (
    <>
      <PageHero image={h.image} kicker={h.kicker || t("live_now") || "Live"} title={h.title || t("section_live_title") || "Watch Live"} subtitle={h.subtitle || t("section_live_desc")} />

      <section className="section-y">
        <div className="container-luxury max-w-4xl">
          {embed ? (
            <>
              <div className="flex justify-center mb-6">
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${isLive ? "bg-rose-600 text-white" : "bg-gold-100 text-gold-700"}`}>
                  <span className={`w-2 h-2 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-gold-600"}`} />
                  {isLive ? (t("live_now") || "Live now") : (t("live_not_yet") || "Stream not live yet")}
                </span>
              </div>
              <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 shadow-luxury-lg" style={{ paddingTop: "56.25%" }}>
                <iframe src={embed} title={t("section_live_title") || "Live Stream"} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </>
          ) : (
            <div className="luxury-card p-12 text-center">
              <Radio className="h-10 w-10 text-gold-400 mx-auto mb-4" />
              <h2 className="font-display text-2xl text-brown">{t("live_soon_title") || "The live stream will appear here"}</h2>
              <p className="mt-3 text-brown/60 text-sm max-w-md mx-auto">{t("live_soon_desc") || "During the event, all sessions are streamed live on this page. Check back soon."}</p>
              <Link href="/registration" className="btn-gold mt-8">{t("hero_register_cta") || "Register Now"}</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
