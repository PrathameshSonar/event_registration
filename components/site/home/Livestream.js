// components/site/home/Livestream.js
// Live player section — only rendered when the admin is actually live (URL set +
// toggle on). YouTube links are normalised; any other provider's embed URL is
// used as-is. Composer decides whether to mount this.
"use client";

import { Radio } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { youtubeId, youtubeEmbedUrl } from "@/lib/youtube";

export default function Livestream({ event }) {
  const { t } = useLanguage();
  const url = event?.livestream_url;
  if (!url) return null;
  const embed = youtubeId(url) ? youtubeEmbedUrl(url) : url;

  return (
    <section id="livestream" className="scroll-mt-24 bg-neutral-900 py-16 md:py-20">
      <div className="container-luxury">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> {t("live_now") || "Live now"}
          </span>
          <h3 className="font-display text-2xl md:text-3xl text-white mt-4 flex items-center justify-center gap-2">
            <Radio className="w-6 h-6 text-rose-500" /> {t("section_live_title") || "Live Stream"}
          </h3>
        </div>
        <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-700 shadow-2xl" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={embed}
            title={t("section_live_title") || "Live Stream"}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
