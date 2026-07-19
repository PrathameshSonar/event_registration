// components/site/home/FinalCta.js
// Closing gradient banner. Uses the event dates; CTAs to register + contact.
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import SectionKicker from "@/components/site/SectionKicker";
import LuxuryHeading from "@/components/site/LuxuryHeading";

export default function FinalCta({ event, hasCategories }) {
  const { t, lang } = useLanguage();
  const dates = pick(event, "date_time", lang);

  return (
    <section className="section-y">
      <div className="container-luxury">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[hsl(10,72%,42%)] via-[hsl(24,90%,48%)] to-[hsl(43,82%,52%)] p-10 md:p-16 text-white shadow-luxury-lg grain">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
          <div className="relative grid md:grid-cols-[1.4fr_1fr] items-center gap-10">
            <div>
              {dates && <SectionKicker light>{dates}</SectionKicker>}
              <LuxuryHeading dark className="mt-5" main={t("section_final_title") || "Come sit before"} accent={t("section_final_accent")} />
              <p className="mt-5 text-white/85 max-w-md">{t("section_final_desc") || "Reserve early to receive the tier of your choice."}</p>
            </div>
            <div className="md:justify-self-end space-y-3 w-full md:w-auto">
              {hasCategories && (
                <Link href="/registration" className="w-full md:w-auto justify-center inline-flex btn-maroon">
                  {t("hero_register_cta") || "Register Now"} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link href="/#contact" className="w-full md:w-auto justify-center inline-flex h-12 items-center gap-2 rounded-full border-2 border-white/60 px-7 font-semibold text-white hover:bg-white/10">
                {t("section_final_contact") || "Talk to us"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
