// components/site/home/RegistrationCta.js
// High-contrast maroon section with the Yajmaan tier cards. Wired to our
// categories (price/tagline/is_recommended/is_full/enquiry) + seat counts.
// Full tiers open the waitlist via onWaitlist; the rest link to /register/[id].
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";

export default function RegistrationCta({ categories = [], seatsTaken = {}, onWaitlist }) {
  const { t, lang } = useLanguage();
  if (!categories.length) return null;

  return (
    <section id="categories" className="relative section-y overflow-hidden bg-[hsl(350,45%,16%)] text-ivory scroll-mt-24">
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(350,45%,14%)]/95 via-[hsl(350,45%,14%)]/70 to-transparent" />
      <div className="container-luxury relative z-10">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-14 items-center">
          <Reveal>
            <SectionKicker light>{t("section_register_kicker") || "Reserve your seat"}</SectionKicker>
            <h2 className="mt-5 display-section text-ivory">{t("section_register_title") || "Choose how you wish to participate"}</h2>
            <p className="mt-6 text-ivory/75 leading-relaxed max-w-md">{t("section_register_desc") || "Each tier offers a different depth of involvement. Seats are limited."}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/my-pass" className="btn-outline-gold border-gold/60 !text-ivory hover:!bg-white/10">
                {t("section_register_lookup") || "Find my registration"}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid sm:grid-cols-3 gap-4">
              {categories.map((c) => {
                const cap = Number(c.max_capacity) || 0;
                const remaining = Math.max(0, cap - (seatsTaken[c.id] || 0));
                const isFull = c.is_full || (cap > 0 && remaining === 0);
                const featured = c.is_recommended && !isFull;
                const title = pick(c, "title", lang);
                const tagline = pick(c, "tagline", lang) || c.tagline;
                const priceLabel = c.price > 0 ? `₹${Number(c.price).toLocaleString("en-IN")}` : t("category_enquire_price") || "Enquire";

                const cardBase = `relative flex flex-col rounded-3xl p-6 transition-all duration-500 ${featured ? "bg-gradient-to-br from-gold to-amber2 text-brown shadow-gold" : "bg-white/5 border border-white/10 text-ivory"}`;
                const inner = (
                  <>
                    {featured && (
                      <span className="absolute -top-3 left-6 rounded-full bg-brown px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-gold-400">
                        {t("category_recommended") || "Most Chosen"}
                      </span>
                    )}
                    {tagline && <span className="text-[11px] uppercase tracking-[0.24em] opacity-70">{tagline}</span>}
                    <h3 className={`mt-2 font-display text-xl ${featured ? "text-brown" : "text-ivory"}`}>{title}</h3>
                    <p className={`mt-4 font-display text-3xl ${featured ? "text-brown" : "text-gold-400"}`}>{priceLabel}</p>
                    <span className={`mt-6 inline-flex items-center gap-1 text-sm font-semibold ${featured ? "text-brown" : "text-gold-400"}`}>
                      {isFull ? (t("category_full") || "Full") : c.is_enquiry_only ? (t("category_enquire") || "Enquire") : (t("category_register") || "Reserve")}
                      {!isFull && <ArrowRight className="h-4 w-4" />}
                    </span>
                  </>
                );

                return isFull ? (
                  <button key={c.id} onClick={() => onWaitlist?.(c)} className={`${cardBase} text-left hover:-translate-y-1`}>{inner}</button>
                ) : (
                  <Link key={c.id} href={`/register/${c.id}`} className={`${cardBase} hover:-translate-y-1`}>{inner}</Link>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
