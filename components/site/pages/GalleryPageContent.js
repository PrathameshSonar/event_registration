// components/site/pages/GalleryPageContent.js
// Full gallery page: masonry of images + a grid of videos, from event_media.
// Client component so it can resolve i18n fallbacks; the thin server page passes
// the admin hero + media in.
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import PageHero from "@/components/site/PageHero";
import GalleryMasonry from "@/components/site/GalleryMasonry";
import YouTubeEmbed from "@/components/YouTubeEmbed";

export default function GalleryPageContent({ media, hero }) {
  const { t } = useLanguage();
  const images = (media || [])
    .filter((m) => m.media_type === "image" && m.url)
    .map((m) => ({ src: m.url, alt: m.caption || "" }));
  const videos = (media || []).filter((m) => m.media_type === "youtube" && m.url);
  const h = hero || {};
  const empty = images.length === 0 && videos.length === 0;

  return (
    <>
      <PageHero
        image={h.image}
        kicker={h.kicker || t("section_gallery_kicker") || "Moments"}
        title={h.title || t("section_gallery") || "Gallery"}
        subtitle={h.subtitle}
      />

      {images.length > 0 && (
        <section className="section-y">
          <div className="container-luxury">
            <GalleryMasonry images={images} />
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="section-y bg-[hsl(34,30%,94%)]">
          <div className="container-luxury">
            <h2 className="display-section text-brown text-center mb-12">{t("section_videos") || "Videos"}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <div key={v.id} className="luxury-card overflow-hidden">
                  <YouTubeEmbed url={v.url} title={v.caption || ""} />
                  {v.caption && <p className="px-5 py-4 text-sm text-brown/70">{v.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {empty && (
        <section className="section-y">
          <div className="container-luxury text-center text-brown/50">{t("gallery_empty") || "Photos & videos coming soon."}</div>
        </section>
      )}
    </>
  );
}
