// components/FaqAccordion.js
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { pick } from "@/lib/i18n";

export default function FaqAccordion({ faqs }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(null);
  if (!faqs || !faqs.length) return null;

  return (
    <section className="bg-white py-14 md:py-20 border-b border-neutral-200">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-3xl">❓</span>
          <h3 className="text-2xl md:text-3xl font-bold mt-3 tracking-tight text-neutral-900">{t("faq_title")}</h3>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const q = pick(f, "question", lang);
            const a = pick(f, "answer", lang);
            const isOpen = open === i;
            return (
              <div key={f.id} className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-orange-50/40 transition"
                >
                  <span className="font-semibold text-neutral-900">{q}</span>
                  <ChevronDown className={`w-5 h-5 text-orange-500 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
