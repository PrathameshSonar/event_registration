// components/site/home/Gallery.js
// Masonry gallery preview. Maps event_media images → the masonry's { src, alt }.
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";
import GalleryMasonry from "@/components/site/GalleryMasonry";

export default function Gallery({ mediaItems = [] }) {
  const { t } = useLanguage();
  const images = mediaItems
    .filter((m) => m.media_type === "image" && m.url)
    .map((m) => ({ src: m.url, alt: m.caption || "" }));

  if (!images.length) return null;

  return (
    <section id="gallery" className="section-y scroll-mt-24">
      <div className="container-luxury">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <Reveal>
            <SectionKicker>{t("section_gallery_kicker") || "Moments"}</SectionKicker>
            <LuxuryHeading className="mt-5 max-w-xl" main={t("section_gallery") || "Gallery"} accent={t("section_gallery_accent")} />
          </Reveal>
        </div>
        <GalleryMasonry images={images} limit={9} />
        {images.length > 9 && (
          <div className="mt-10 text-center">
            <Link href="/gallery" className="btn-outline-gold">{t("home_full_gallery") || "View full gallery"}</Link>
          </div>
        )}
      </div>
    </section>
  );
}
