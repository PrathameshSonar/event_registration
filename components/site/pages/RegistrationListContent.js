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

// Per-Seva card themes (like the Emergent reference). Admin sets categories.color;
// a "recommended" tier is forced to the premium gold theme.
const BASE_BTN = "w-full inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold text-[15px] transition hover:brightness-105";
const CARD_THEMES = {
  default: {
    card: "luxury-card", kicker: "text-vermillion", title: "text-brown", price: "text-vermillion",
    note: "text-brown/50", desc: "text-brown/70", label: "text-brown/60", track: "bg-gold/15",
    bar: "bg-gradient-to-r from-gold to-amber2", perkIcon: "text-gold-600", perkText: "text-brown/80",
    btn: "bg-gradient-to-br from-[hsl(10,72%,44%)] via-[hsl(24,90%,50%)] to-[hsl(38,82%,52%)] text-white shadow-gold",
    btnAlt: "border-2 border-gold/50 text-brown hover:bg-gold/10",
  },
  gold: {
    card: "bg-gradient-to-br from-[hsl(43,74%,50%)] via-[hsl(38,88%,53%)] to-[hsl(24,90%,55%)] shadow-gold",
    kicker: "text-brown/70", title: "text-brown", price: "text-brown", note: "text-brown/60",
    desc: "text-brown/80", label: "text-brown/70", track: "bg-brown/15", bar: "bg-brown/70",
    perkIcon: "text-brown", perkText: "text-brown/85",
    btn: "bg-brown text-gold-400 hover:bg-[hsl(20,30%,15%)]", btnAlt: "border-2 border-brown/30 text-brown hover:bg-brown/5",
  },
  maroon: {
    card: "bg-[hsl(350,45%,18%)] shadow-luxury", kicker: "text-gold-400/85", title: "text-ivory", price: "text-gold-400",
    note: "text-ivory/55", desc: "text-ivory/80", label: "text-ivory/65", track: "bg-gold/15",
    bar: "bg-gradient-to-r from-gold to-amber2", perkIcon: "text-gold-400", perkText: "text-ivory/85",
    btn: "bg-gradient-to-r from-gold to-amber2 text-brown hover:brightness-110", btnAlt: "border-2 border-gold/40 text-gold-400 hover:bg-gold/10",
  },
};

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
                // Per-Seva colour theme; a recommended tier is forced to the gold theme.
                const th = CARD_THEMES[featured ? "gold" : (c.color || "default")] || CARD_THEMES.default;

                return (
                  <Reveal key={c.id} className="h-full">
                    <article className={`relative flex h-full flex-col rounded-[24px] overflow-hidden transition-all duration-500 hover:-translate-y-1 ${th.card}`}>
                      {featured && (
                        <span className="absolute top-4 left-4 z-10 rounded-full bg-brown px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-gold-400 font-bold shadow">
                          {t("category_recommended") || "Most Chosen"}
                        </span>
                      )}
                      {c.media_url && (
                        <div className="relative h-44 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.media_url} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                      )}
                      <div className="flex flex-col flex-1 p-8">
                      {tagline && <span className={`text-[11px] uppercase tracking-[0.24em] font-semibold ${th.kicker}`}>{tagline}</span>}
                      <h3 className={`mt-2 font-display text-2xl ${th.title}`}>{title}</h3>
                      <p className={`mt-3 font-display text-3xl ${th.price}`}>{priceLabel}</p>
                      {c.price > 0 && <p className={`mt-1 text-xs ${th.note}`}>{t("reg_price_note") || "per Yajmaan · one-time"}</p>}
                      {desc && <p className={`mt-3 text-sm leading-relaxed ${th.desc}`}>{desc}</p>}

                      {filledPct !== null && !isFull && (
                        <div className="mt-5">
                          <div className={`flex items-center justify-between text-[11px] font-semibold ${th.label}`}>
                            <span>{t("reg_availability") || "Availability"}</span>
                            <span>{filledPct}% {t("reg_filled") || "filled"}</span>
                          </div>
                          <div className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${th.track}`}>
                            <div className={`h-full rounded-full ${th.bar}`} style={{ width: `${Math.max(4, filledPct)}%` }} />
                          </div>
                          {remaining > 0 && remaining <= 10 && (
                            <p className={`mt-1.5 text-[11px] font-semibold ${th.price}`}>{(t("reg_seats_left") || "Only {n} seats left").replace("{n}", String(remaining))}</p>
                          )}
                        </div>
                      )}

                      {perks.length > 0 && (
                        <ul className="mt-6 space-y-2.5 flex-1">
                          {perks.map((p, i) => (
                            <li key={i} className={`flex items-start gap-2.5 text-[14.5px] ${th.perkText}`}>
                              <Check className={`h-4 w-4 shrink-0 mt-0.5 ${th.perkIcon}`} strokeWidth={2.4} />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-8">
                        {!registrationOpen ? (
                          <span className={`${BASE_BTN} ${th.btnAlt} opacity-70 cursor-default`}>
                            <Lock className="h-4 w-4" /> {t("register_closed_short") || "Registrations closed"}
                          </span>
                        ) : isFull ? (
                          <button onClick={() => setWaitlistCat(c)} className={`${BASE_BTN} ${th.btnAlt}`}>
                            🔔 {t("category_join_waitlist") || "Join the waitlist"}
                          </button>
                        ) : (
                          <Link href={`/register/${c.id}`} className={`${BASE_BTN} ${th.btn}`}>
                            {c.is_enquiry_only ? (t("category_enquire") || "Enquire") : (t("category_register") || "Choose this Seva")} <ArrowRight className="h-4 w-4" />
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
