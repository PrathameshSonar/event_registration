// components/site/LuxuryFooter.js
// Luxury footer: big CTA + explore/contact columns + socials + legal. Admin-
// controlled: brand from BrandingProvider; phone/socials/location from the event
// passed in. Only renders links whose data exists.
"use client";

import Link from "next/link";
import { Flame, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { InstagramIcon, YoutubeIcon, FacebookIcon } from "@/components/site/BrandIcons";
import { useBranding } from "@/components/BrandingProvider";
import { useLanguage } from "@/components/LanguageProvider";

const NAV = [
  { key: "nav_about", fallback: "About", to: "/about" },
  { key: "nav_event_details", fallback: "Event", to: "/event" },
  { key: "nav_register", fallback: "Registration", to: "/registration" },
  { key: "nav_gallery", fallback: "Gallery", to: "/gallery" },
  { key: "nav_news", fallback: "News", to: "/news" },
  { key: "nav_faq", fallback: "FAQ", to: "/faq" },
  { key: "nav_contact", fallback: "Contact", to: "/contact" },
];

export default function LuxuryFooter({ event }) {
  const branding = useBranding();
  const { t } = useLanguage();
  const brandName = branding?.site_name || "BaglaBhairav";

  const phone = event?.contact_phone;
  const location = event?.venue;
  const email = event?.contact_email;
  const socials = [
    { Icon: InstagramIcon, href: event?.instagram_url, label: "instagram" },
    { Icon: YoutubeIcon, href: event?.youtube_url, label: "youtube" },
    { Icon: FacebookIcon, href: event?.facebook_url, label: "facebook" },
  ].filter((s) => s.href);

  return (
    <footer className="relative mt-24 bg-[hsl(30,25%,10%)] text-ivory/85">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-24 bg-gradient-to-b from-background to-transparent" />

      {/* Big CTA */}
      <div className="container-luxury pt-24 pb-16">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr] items-end">
          <div>
            <p className="kicker text-gold/80">{t("footer_cta_kicker") || "Join the sacred gathering"}</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-ivory leading-[1.05]">
              {t("footer_cta_title") || "Let the fire of a thousand mantras bless you."}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row md:justify-end gap-3">
            <Link href="/registration" className="btn-gold">{t("nav_register") || "Register Now"}</Link>
            <Link href="/donate" className="btn-outline-gold border-gold/60 !text-ivory hover:!bg-gold/15">
              {t("footer_offer_seva") || "Offer Seva"}
            </Link>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* Main footer */}
      <div id="contact" className="container-luxury py-16 scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2 max-w-md">
            <div className="flex items-center gap-4">
              {branding?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo_url} alt={brandName} className="h-14 w-auto object-contain" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold via-amber2 to-lotus shadow-gold">
                  <Flame className="h-6 w-6 text-white drop-shadow" strokeWidth={1.6} />
                </span>
              )}
              <div className="font-display tracking-[0.14em] text-ivory text-[17px]">{brandName}</div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-ivory/70">{t("footer_about") || "A sanctum dedicated to devotion and dharma. Every ritual, offering and seva sustains an unbroken lineage."}</p>
            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socials.map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-gold-400 transition-colors hover:bg-gold/10">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-display text-sm tracking-[0.24em] text-gold-400">{t("footer_explore") || "EXPLORE"}</h4>
            <ul className="mt-5 space-y-3 text-sm">
              {NAV.map((l) => (
                <li key={l.to}>
                  <Link href={l.to} className="text-ivory/75 hover:text-gold-400 transition-colors">{t(l.key) || l.fallback}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-[0.24em] text-gold-400">{t("footer_contact") || "CONTACT"}</h4>
            <ul className="mt-5 space-y-4 text-sm">
              {location && (
                <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-gold-400" /><span className="text-ivory/75">{location}</span></li>
              )}
              {phone && (
                <>
                  <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-gold-400" /><a href={`tel:${phone}`} className="text-ivory/75 hover:text-gold-400">{phone}</a></li>
                  <li className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-gold-400" /><a href={`https://wa.me/${String(phone).replace(/\D/g, "")}`} className="text-ivory/75 hover:text-gold-400" target="_blank" rel="noopener noreferrer">{t("whatsapp_help") || "WhatsApp Helpline"}</a></li>
                </>
              )}
              {email && (
                <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-gold-400" /><a href={`mailto:${email}`} className="text-ivory/75 hover:text-gold-400">{email}</a></li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-gold/15" />

      <div className="container-luxury flex flex-col md:flex-row items-center justify-between gap-4 py-6 text-xs text-ivory/60">
        <p>© {brandName} · {t("footer_rights") || "All rights reserved"}</p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <li><Link href="/privacy" className="hover:text-gold-400">{t("footer_privacy") || "Privacy"}</Link></li>
          <li><Link href="/terms" className="hover:text-gold-400">{t("footer_terms") || "Terms"}</Link></li>
          <li><Link href="/refund" className="hover:text-gold-400">{t("footer_refund") || "Refund Policy"}</Link></li>
        </ul>
      </div>
    </footer>
  );
}
