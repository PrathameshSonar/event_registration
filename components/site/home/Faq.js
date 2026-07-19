// components/site/home/Faq.js
// FAQ accordion in the luxury style. event_faqs (question/answer, translatable).
// Lightweight controlled accordion — no shadcn dependency.
"use client";

import { useState } from "react";
import { Plus, Minus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function Faq({ items = [] }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(0);
  if (!items.length) return null;

  return (
    <section id="faq" className="section-y scroll-mt-24">
      <div className="container-luxury grid lg:grid-cols-[0.9fr_1.1fr] gap-14">
        <Reveal>
          <SectionKicker>{t("section_faq_kicker") || "Common Questions"}</SectionKicker>
          <LuxuryHeading className="mt-5" main={t("section_faq_title") || "Everything you need to know"} accent={t("section_faq_accent")} />
          <p className="mt-6 text-brown/70 leading-relaxed max-w-md">{t("section_faq_desc") || "A few of the most common questions from devotees."}</p>
          <div className="mt-8">
            <Link href="/#contact" className="text-sm inline-flex items-center gap-1 font-semibold text-vermillion hover:text-lotus">
              {t("section_faq_ask") || "Ask a question"} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="luxury-card p-4 md:p-6">
            {items.slice(0, 8).map((f, i) => {
              const q = pick(f, "question", lang);
              const a = pick(f, "answer", lang);
              const isOpen = open === i;
              return (
                <div key={f.id || i} className="border-b border-gold/15 last:border-b-0">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] font-semibold text-brown"
                    aria-expanded={isOpen}
                  >
                    <span>{q}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vermillion/10 text-vermillion">
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <p className="pb-5 text-brown/75 leading-[1.8] whitespace-pre-wrap" style={{ fontSize: "1rem" }}>{a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
