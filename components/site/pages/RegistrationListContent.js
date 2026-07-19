// components/site/pages/RegistrationListContent.js
// Registration landing: the full tier list with perks. Each tier links to
// /register/[id]; a full tier opens the waitlist. Admin-driven (categories).
"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Search, Lock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import WaitlistModal from "@/components/WaitlistModal";

export default function RegistrationListContent({ categories, seatsTaken, registrationOpen = true, hero }) {
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
          {!registrationOpen && cats.length > 0 && (
            <div className="mx-auto max-w-2xl mb-10 rounded-2xl border border-gold/30 bg-gold/10 px-6 py-5 text-center">
              <p className="font-display text-lg text-brown">{t("register_closed_title") || "Registrations are closed"}</p>
              <p className="mt-1 text-sm text-brown/65">{t("register_closed_desc") || "Registration for this event is no longer open. The tiers below are shown for reference."}</p>
            </div>
          )}
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
                // Availability bar: only for tiers that declare a real capacity.
                const filledPct = cap > 0 ? Math.min(100, Math.round(((seats[c.id] || 0) / cap) * 100)) : null;

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
                      {c.price > 0 && <p className="mt-1 text-xs text-brown/50">{t("reg_price_note") || "per Yajmaan · one-time"}</p>}
                      {desc && <p className="mt-3 text-brown/70 text-sm leading-relaxed">{desc}</p>}

                      {filledPct !== null && !isFull && (
                        <div className="mt-5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-brown/60">
                            <span>{t("reg_availability") || "Availability"}</span>
                            <span>{filledPct}% {t("reg_filled") || "filled"}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gold/15">
                            <div className={`h-full rounded-full ${filledPct >= 85 ? "bg-vermillion" : "bg-gradient-to-r from-gold to-amber2"}`} style={{ width: `${Math.max(4, filledPct)}%` }} />
                          </div>
                          {remaining > 0 && remaining <= 10 && (
                            <p className="mt-1.5 text-[11px] font-semibold text-vermillion">{(t("reg_seats_left") || "Only {n} seats left").replace("{n}", String(remaining))}</p>
                          )}
                        </div>
                      )}

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
                        {!registrationOpen ? (
                          <span className="flex w-full items-center justify-center gap-2 rounded-full border border-gold/25 bg-cream/60 py-3 text-sm font-semibold text-brown/50">
                            <Lock className="h-4 w-4" /> {t("register_closed_short") || "Registrations closed"}
                          </span>
                        ) : isFull ? (
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

          <Reveal className="mt-14">
            <div className="luxury-card mx-auto max-w-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <h3 className="font-display text-xl text-brown">{t("reg_lookup_title") || "Already registered?"}</h3>
                <p className="mt-1 text-sm text-brown/65">{t("reg_lookup_desc") || "Look up your pass, QR code and payment status any time."}</p>
              </div>
              <Link href="/my-pass" className="btn-outline-gold shrink-0">
                <Search className="h-4 w-4" /> {t("section_register_lookup") || "Find my registration"}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {waitlistCat && <WaitlistModal category={waitlistCat} onClose={() => setWaitlistCat(null)} />}
    </>
  );
}
