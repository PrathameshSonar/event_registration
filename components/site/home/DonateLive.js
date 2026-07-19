// components/site/home/DonateLive.js
// Split section: an "Offer a Seva" donation banner (→ /donate) and a live-stream
// promo (→ /live). The live banner only invites when a stream URL exists.
"use client";

import Link from "next/link";
import { Sparkle, Play } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import Reveal from "@/components/site/Reveal";

export default function DonateLive({ event }) {
  const { t } = useLanguage();
  const hasStream = !!event?.livestream_url;
  const bg = event?.hero_image_url;

  return (
    <section className="section-y">
      <div className="container-luxury grid lg:grid-cols-2 gap-8">
        <Reveal>
          <div className="relative luxury-card overflow-hidden p-7 md:p-9 min-h-[260px]">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white/95 to-gold-50/70" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-vermillion/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-vermillion font-semibold">
                <Sparkle className="h-3 w-3" /> {t("seva_badge") || "Offer a Seva"}
              </span>
              <h3 className="mt-5 font-display text-3xl text-brown">{t("section_seva_title") || "Every offering sustains the fire"}</h3>
              <p className="mt-4 text-brown/70 max-w-md">{t("section_seva_desc") || "Sponsor a ritual, offer Annadaan or light a lamp — even a small contribution keeps the event alive for those who cannot attend."}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/donate" className="btn-gold">{t("section_seva_cta") || "Donate Now"}</Link>
              </div>
            </div>
          </div>
        </Reveal>

        {hasStream && (
          <Reveal delay={120}>
            <div className="relative luxury-card overflow-hidden min-h-[260px]">
              {bg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(20,55%,18%)] to-[hsl(350,45%,22%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30,45%,10%)]/95 via-[hsl(30,45%,10%)]/40 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-8 md:p-10 text-ivory">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-ivory/90 backdrop-blur-md">
                  <span className={`h-1.5 w-1.5 rounded-full ${event?.livestream_is_live ? "bg-red-500 animate-pulse" : "bg-gold-400"}`} /> {t("live_now") || "Live"}
                </span>
                <h3 className="mt-5 font-display text-3xl">{t("section_live_title") || "Watch every mantra, wherever you are"}</h3>
                <p className="mt-4 text-ivory/80 max-w-md">{t("section_live_desc") || "The event is streamed live in high quality for devotees across the world."}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/live" className="btn-gold"><Play className="h-4 w-4" /> {t("live_watch") || "Watch Live"}</Link>
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
