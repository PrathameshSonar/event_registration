// components/site/TestimonialsCarousel.js
// Embla carousel of devotee testimonials. Data-driven: pass `items` shaped as
// [{ quote, name, role, lang }] (the homepage maps event_testimonials → this,
// resolving the quote for the active language). Auto-advances every 7s.
"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

export default function TestimonialsCarousel({ items = [] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "center" });
  const [selected, setSelected] = useState(0);

  const scrollPrev = useCallback(() => embla && embla.scrollPrev(), [embla]);
  const scrollNext = useCallback(() => embla && embla.scrollNext(), [embla]);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    const id = setInterval(() => embla.scrollNext(), 7000);
    return () => {
      clearInterval(id);
      embla.off("select", onSelect);
    };
  }, [embla]);

  if (!items.length) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((it, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%] px-2 md:px-6">
              <figure className="mx-auto max-w-3xl luxury-card px-8 py-10 md:px-12 md:py-14 text-center">
                <Quote className="mx-auto h-8 w-8 text-gold" strokeWidth={1.5} />
                <blockquote
                  className={`mt-6 text-brown/90 text-balance whitespace-pre-wrap ${
                    it.lang === "mr" || it.lang === "hi"
                      ? "font-cormorant text-[26px] md:text-[30px] leading-[1.55]"
                      : "text-lg md:text-xl leading-[1.7]"
                  }`}
                >
                  {it.quote}
                </blockquote>
                {(it.name || it.role) && (
                  <figcaption className="mt-8 flex flex-col items-center gap-1">
                    {it.name && <span className="font-display text-lg text-vermillion">{it.name}</span>}
                    {it.role && <span className="text-xs uppercase tracking-[0.24em] text-mutedgold">{it.role}</span>}
                  </figcaption>
                )}
              </figure>
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={scrollPrev}
            aria-label="Previous testimonial"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-white text-vermillion transition-colors hover:bg-gold/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => embla && embla.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${selected === i ? "w-8 bg-vermillion" : "w-2.5 bg-gold/40"}`}
              />
            ))}
          </div>
          <button
            onClick={scrollNext}
            aria-label="Next testimonial"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-white text-vermillion transition-colors hover:bg-gold/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
