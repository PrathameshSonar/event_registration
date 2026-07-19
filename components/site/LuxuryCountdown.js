// components/site/LuxuryCountdown.js
// Countdown timer for the luxury hero. `variant="glass"` = dark glassmorphism
// (on the hero image); "light" = ivory card. Hydration-safe: renders "—" until
// mounted so server and client markup match.
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const pad = (n) => String(n).padStart(2, "0");

export default function LuxuryCountdown({ targetISO, variant = "glass", label }) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date(targetISO).getTime());

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetISO).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const isDark = variant === "glass";

  // Once the target is reached, don't show 00:00:00 — switch to a "happening now"
  // badge. Only after mount (so server/client markup match and we never flash it).
  if (mounted && diff <= 0) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isDark ? "bg-rose-600/90 text-white" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
        <span className={`h-2 w-2 rounded-full animate-pulse ${isDark ? "bg-white" : "bg-rose-600"}`} />
        {t("countdown_started") || "The event has begun"}
      </span>
    );
  }

  const items = [
    { label: t("countdown_days") || "Days", value: mounted ? days : "—" },
    { label: t("countdown_hours") || "Hours", value: mounted ? pad(hours) : "—" },
    { label: t("countdown_mins") || "Minutes", value: mounted ? pad(minutes) : "—" },
    { label: t("countdown_secs") || "Seconds", value: mounted ? pad(seconds) : "—" },
  ];

  return (
    <div>
      {label && <p className={`mb-3 text-[11px] uppercase tracking-[0.32em] font-bold ${isDark ? "text-gold-400" : "text-vermillion"}`}>{label}</p>}
      <div
        className={`inline-flex items-stretch gap-2 sm:gap-3 rounded-2xl p-2 sm:p-3 ${
          isDark ? "bg-white/10 backdrop-blur-xl border border-white/20" : "bg-white/90 border border-gold/20 shadow-luxury"
        }`}
        aria-label="Countdown to the event"
      >
        {items.map((it) => (
        <div
          key={it.label}
          className={`flex min-w-[58px] sm:min-w-[84px] flex-col items-center rounded-xl px-2 py-2 sm:px-4 sm:py-3 ${
            isDark ? "bg-black/25" : "bg-cream"
          }`}
        >
          <span className={`font-display text-xl sm:text-4xl tabular-nums leading-none ${isDark ? "text-gold-400" : "text-vermillion"}`}>
            {it.value}
          </span>
          <span className={`mt-1 text-[9px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.24em] font-semibold uppercase whitespace-nowrap ${isDark ? "text-ivory/70" : "text-brown/60"}`}>
            {it.label}
          </span>
        </div>
        ))}
      </div>
    </div>
  );
}
