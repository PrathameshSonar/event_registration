// components/site/GalleryMasonry.js
// CSS-columns masonry gallery with a keyboard-navigable lightbox. Data-driven:
// pass `images` as [{ src, alt, h? }]; the homepage maps event_media → this.
"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function GalleryMasonry({ images = [], limit }) {
  const items = limit ? images.slice(0, limit) : images;
  const [openIndex, setOpenIndex] = useState(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(() => setOpenIndex((i) => (i === 0 ? items.length - 1 : i - 1)), [items.length]);
  const next = useCallback(() => setOpenIndex((i) => (i === items.length - 1 ? 0 : i + 1)), [items.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, prev, next]);

  if (!items.length) return null;

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
        {items.map((img, i) => (
          <button
            key={i}
            onClick={() => setOpenIndex(i)}
            className="mb-5 block w-full break-inside-avoid overflow-hidden rounded-[20px] shadow-luxury transition-transform duration-500 hover:-translate-y-1 hover:shadow-luxury-lg group"
            aria-label={img.alt || `Gallery image ${i + 1}`}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt || ""}
                loading="lazy"
                className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                style={{ minHeight: img.h ? `${Math.max(240, img.h / 2)}px` : "260px" }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {img.alt && (
                <div className="pointer-events-none absolute bottom-3 left-4 right-4 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                  <p className="text-white text-sm font-medium drop-shadow">{img.alt}</p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button onClick={close} className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous">
            <ChevronLeft className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={items[openIndex].src}
            alt={items[openIndex].alt || ""}
            className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next">
            <ChevronRight className="h-6 w-6" />
          </button>
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80">
            {openIndex + 1} / {items.length}
          </p>
        </div>
      )}
    </>
  );
}
