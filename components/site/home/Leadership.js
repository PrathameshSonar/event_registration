// components/site/home/Leadership.js
// The featured guest (e.g. Guruji) rendered as a portrait + bullets + pull-quote.
// Data: event_guests row with is_featured = true (name/role/photo/bio/bullets/quote).
"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";
import Reveal from "@/components/site/Reveal";
import SectionKicker from "@/components/site/SectionKicker";

export default function Leadership({ guest, flip = false, primary = true }) {
  const { t, lang } = useLanguage();
  if (!guest) return null;

  const name = pick(guest, "name", lang);
  const role = pick(guest, "role", lang);
  const bio = pick(guest, "bio", lang);
  const quote = pick(guest, "quote", lang) || guest.quote;
  const bullets = Array.isArray(guest.bullets) ? guest.bullets : [];

  return (
    <section className={`relative section-y ${flip ? "bg-ivory" : "bg-[hsl(34,30%,94%)]"}`}>
      <div className="container-luxury">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <Reveal className={flip ? "lg:order-2" : ""}>
            <div className="relative mx-auto max-w-xs lg:max-w-sm">
              <div className="relative overflow-hidden rounded-[28px] shadow-luxury-lg aspect-[5/6] bg-gradient-to-br from-[hsl(10,60%,32%)] via-[hsl(350,45%,26%)] to-[hsl(20,55%,18%)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,hsla(43,90%,58%,0.35),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,hsla(24,90%,55%,0.28),transparent_60%)]" />
                {guest.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={guest.photo_url} alt={name} className="absolute inset-x-0 bottom-0 mx-auto h-[95%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]" />
                )}
                <span className="pointer-events-none absolute inset-4 rounded-[22px] ring-1 ring-gold/30" />
              </div>
              {role && (
                <div className="absolute -bottom-5 -right-4 md:-right-6">
                  <div className="rounded-2xl bg-gradient-to-br from-gold to-amber2 px-5 py-3 text-brown shadow-gold">
                    <span className="font-display text-[13px] tracking-[0.16em] font-semibold uppercase">{role}</span>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className={flip ? "lg:order-1" : ""}>
            <SectionKicker>{primary ? (t("section_leadership_kicker") || "The Guiding Light") : (t("section_leadership_kicker_alt") || "With the Blessings Of")}</SectionKicker>
            <h2 className="mt-4 display-section text-brown">
              {primary ? (
                <>
                  {t("section_leadership_title") || "Under the Guidance Of"}<br />
                  <span className="font-cormorant italic text-vermillion">{name}</span>
                </>
              ) : (
                <span className="font-cormorant italic text-vermillion">{name}</span>
              )}
            </h2>
            {bio && <p className="mt-4 text-brown/80 leading-[1.7] whitespace-pre-wrap" style={{ fontSize: "1rem" }}>{bio}</p>}
            {bullets.length > 0 && (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-brown/85">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-gold to-lotus" />
                    <span className="text-[15px] leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {quote && (
              <blockquote className="mt-6 border-l-2 border-gold pl-5 font-cormorant text-xl md:text-[22px] italic text-brown/85 leading-relaxed whitespace-pre-wrap">
                {quote}
              </blockquote>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
