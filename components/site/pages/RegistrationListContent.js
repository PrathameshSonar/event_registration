// components/site/pages/RegistrationListContent.js
// Registration landing: the full tier list with perks. Each tier links to
// /register/[id]; a full tier opens the waitlist. Admin-driven (categories).
"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import WaitlistModal from "@/components/WaitlistModal";

export default function RegistrationListContent({ categories, seatsTaken, hero }) {
  const { t, lang } = useLanguage();
  const [waitlistCat, setWaitlistCat] = useState(null);
  const cats = categories || [];
  const seats = seatsTaken || {};
  const h = hero || {};

  return (
    <>
      <PageHero
        image={h.image}
        kicker={h.kicker || t("section_register_kicker") || "Yajmaan Categories"}
        title={h.title || t("section_register_title") || "Choose how you wish to participate"}
        subtitle={h.subtitle || t("section_register_desc")}
      />

      <section className="section-y mandala-bg">
        <div className="container-luxury">
          {cats.length === 0 ? (
            <p className="text-center text-brown/50">{t("category_soon") || "Registrations opening soon."}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
              {cats.map((c) => {
                const cap = Number(c.max_capacity) || 0;
                const remaining = Math.max(0, cap - (seats[c.id] || 0));
                const isFull = c.is_full || (cap > 0 && remaining === 0);
                const featured = c.is_recommended && !isFull;
                const title = pick(c, "title", lang);
                const tagline = pick(c, "tagline", lang) || c.tagline;
                const desc = pick(c, "description", lang);
                const perks = Array.isArray(c.perks) ? c.perks : [];
                const priceLabel = c.price > 0 ? `₹${Number(c.price).toLocaleString("en-IN")}` : (t("category_enquire_price") || "Enquire");

                return (
                  <Reveal key={c.id} className="h-full">
                    <article className={`relative flex h-full flex-col rounded-[24px] overflow-hidden transition-all duration-500 hover:-translate-y-1 ${featured ? "bg-white ring-2 ring-gold shadow-gold" : "luxury-card"}`}>
                      {featured && (
                        <span className="absolute top-4 left-4 z-10 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white font-bold shadow">
                          {t("category_recommended") || "Most Chosen"}
                        </span>
                      )}
                      {c.media_url && (
                        <div className="relative h-44 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.media_url} alt={title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                      )}
                      <div className={`flex flex-col flex-1 p-8 ${c.media_url ? "" : "pt-8"}`}>
                      {tagline && <span className="kicker">{tagline}</span>}
                      <h3 className="mt-3 font-display text-2xl text-brown">{title}</h3>
                      <p className="mt-3 font-display text-3xl text-vermillion">{priceLabel}</p>
                      {desc && <p className="mt-3 text-brown/70 text-sm leading-relaxed">{desc}</p>}

                      {perks.length > 0 && (
                        <ul className="mt-6 space-y-2.5 flex-1">
                          {perks.map((p, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-brown/80">
                              <Check className="h-4 w-4 text-gold-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-8">
                        {isFull ? (
                          <button onClick={() => setWaitlistCat(c)} className="btn-outline-gold w-full justify-center">
                            🔔 {t("category_join_waitlist") || "Join the waitlist"}
                          </button>
                        ) : (
                          <Link href={`/register/${c.id}`} className="btn-gold w-full justify-center">
                            {c.is_enquiry_only ? (t("category_enquire") || "Enquire") : (t("category_register") || "Reserve")} <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/my-pass" className="text-sm inline-flex items-center gap-1 font-semibold text-vermillion hover:text-lotus">
              {t("section_register_lookup") || "Find my registration"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {waitlistCat && <WaitlistModal category={waitlistCat} onClose={() => setWaitlistCat(null)} />}
    </>
  );
}
