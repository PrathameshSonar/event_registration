// components/site/LuxuryNavbar.js
// Glass sticky navbar in the luxury theme. Admin-controlled: brand name + logo
// come from the BrandingProvider; labels from the language dictionaries. Links
// point at our real routes + homepage section anchors.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Flame } from "lucide-react";
import { useBranding } from "@/components/BrandingProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { useRegistrationOpen } from "@/components/RegistrationProvider";
import LangToggle from "@/components/LangToggle";

// Nav links map to our structure (single-page homepage sections + real routes).
// `t(key) || fallback` keeps it working before the i18n keys are added.
function useNavLinks() {
  const { t } = useLanguage();
  // News + Live intentionally kept OFF the primary nav (they live in the footer
  // and the live banner) so the bar stays uncluttered.
  return [
    { label: t("nav_home") || "Home", to: "/" },
    { label: t("nav_about") || "About", to: "/about" },
    { label: t("nav_event_details") || "Event", to: "/event" },
    { label: t("nav_register") || "Registration", to: "/registration" },
    { label: t("nav_gallery") || "Gallery", to: "/gallery" },
    { label: t("nav_faq") || "FAQ", to: "/faq" },
    { label: t("nav_contact") || "Contact", to: "/contact" },
  ];
}

function Logo({ line1, line2, subtitle, logoUrl }) {
  // The mark is the admin logo image if set, otherwise the flame badge. The
  // wordmark text renders BESIDE the mark either way — logo + wordmark together.
  return (
    <Link href="/" className="group flex items-center gap-3 sm:gap-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={line1} className="h-12 sm:h-14 w-auto object-contain shrink-0" />
      ) : (
        <span className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(43,82%,55%)] via-[hsl(24,90%,50%)] to-[hsl(10,70%,42%)] shadow-gold">
          <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow" strokeWidth={1.6} />
          <span className="pointer-events-none absolute -inset-1 rounded-2xl ring-1 ring-gold/40" />
        </span>
      )}
      <span className="leading-tight">
        <span className="block font-display text-[15px] sm:text-[17px] font-semibold tracking-[0.14em] text-brown">{line1}</span>
        {line2 && <span className="block font-display text-[15px] sm:text-[17px] font-semibold tracking-[0.14em] text-vermillion -mt-0.5">{line2}</span>}
        {subtitle && <span className="mt-0.5 hidden sm:block font-cormorant italic text-[12.5px] leading-tight text-mutedgold whitespace-nowrap">{subtitle}</span>}
      </span>
    </Link>
  );
}

export default function LuxuryNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const branding = useBranding();
  const { t } = useLanguage();
  const registrationOpen = useRegistrationOpen();
  const links = useNavLinks();
  const brandName = branding?.site_name || "BaglaBhairav";
  const line1 = branding?.brand_line1 || brandName;
  const line2 = branding?.brand_line2 || "";
  const subtitle = branding?.brand_subtitle || "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (to) => (to === "/" ? pathname === "/" : pathname.startsWith(to.split("#")[0]) && to !== "/");

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? "glass-nav" : "bg-transparent"}`}>
      <div className="container-nav flex h-16 md:h-20 items-center justify-between">
        <Logo line1={line1} line2={line2} subtitle={subtitle} logoUrl={branding?.logo_url} />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              className={`relative px-3 py-2 text-[15px] font-medium tracking-wide transition-colors ${isActive(l.to) ? "text-vermillion" : "text-brown/85 hover:text-vermillion"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-3">
          <LangToggle />
          <Link href="/donate" className="btn-outline-gold h-11 px-5 text-[15px] whitespace-nowrap">
            {t("nav_donate") || "Donate"}
          </Link>
          {registrationOpen && (
            <Link href="/registration" className="btn-gold h-11 px-5 text-[15px] whitespace-nowrap">
              {t("nav_register") || "Register Now"}
            </Link>
          )}
        </div>

        <button
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-white/80 text-brown xl:hidden shadow-sm"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`xl:hidden overflow-hidden transition-[max-height] duration-500 ease-out ${open ? "max-h-[640px]" : "max-h-0"}`}>
        <div className="container-nav pb-6">
          <div className="rounded-2xl border border-gold/20 bg-white/95 p-4 shadow-luxury">
            <ul className="flex flex-col divide-y divide-gold/10">
              {links.map((l) => (
                <li key={l.to}>
                  <Link href={l.to} className={`block px-2 py-3.5 text-[16px] font-medium ${isActive(l.to) ? "text-vermillion" : "text-brown/85"}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <LangToggle />
              <div className="flex flex-1 gap-3">
                <Link href="/donate" className="btn-outline-gold h-12 flex-1 text-[15px]">{t("nav_donate") || "Donate"}</Link>
                {registrationOpen && <Link href="/registration" className="btn-gold h-12 flex-1 text-[15px]">{t("nav_register") || "Register"}</Link>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
