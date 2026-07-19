// components/site/pages/FaqPageContent.js — full FAQ accordion (event_faqs).
"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";

export default function FaqPageContent({ items, hero }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(0);
  const list = items || [];
  const h = hero || {};

  return (
    <>
      <PageHero image={h.image} kicker={h.kicker || t("section_faq_kicker") || "Common Questions"} title={h.title || t("section_faq_title") || "Frequently Asked Questions"} subtitle={h.subtitle} />
      <section className="section-y mandala-bg">
        <div className="container-luxury max-w-3xl">
          {list.length === 0 ? (
            <p className="text-center text-brown/50">{t("faq_empty") || "No questions yet."}</p>
          ) : (
            <div className="luxury-card p-4 md:p-8">
              {list.map((f, i) => {
                const q = pick(f, "question", lang);
                const a = pick(f, "answer", lang);
                const isOpen = open === i;
                return (
                  <div key={f.id || i} className="border-b border-gold/15 last:border-b-0">
                    <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] font-semibold text-brown" aria-expanded={isOpen}>
                      <span>{q}</span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vermillion/10 text-vermillion">{isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden"><p className="pb-5 text-brown/75 leading-[1.8] whitespace-pre-wrap" style={{ fontSize: "1rem" }}>{a}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
