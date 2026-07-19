// components/site/home/Testimonials.js
// Devotee testimonials carousel. Maps event_testimonials → the carousel's
// { quote, name, role, lang } shape, resolving the quote for the active language.
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import TestimonialsCarousel from "@/components/site/TestimonialsCarousel";

export default function Testimonials({ items = [] }) {
  const { t, lang } = useLanguage();
  if (!items.length) return null;

  const slides = items.map((tm) => ({
    quote: pick(tm, "quote", lang),
    name: tm.name,
    role: [tm.location].filter(Boolean).join(""),
    lang,
  }));

  return (
    <section className="section-y bg-[hsl(34,30%,94%)]">
      <div className="container-luxury">
        <Reveal className="text-center max-w-xl mx-auto mb-14">
          <SectionKicker>{t("section_testimonials_kicker") || "Voices of Devotees"}</SectionKicker>
          <h2 className="mt-5 display-section text-brown">{t("section_testimonials_title") || "Words from Devotees"}</h2>
        </Reveal>
        <TestimonialsCarousel items={slides} />
      </div>
    </section>
  );
}
