// components/Countdown.js
// Live countdown to the event start. Renders nothing if no valid date.
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "./LanguageProvider";

function diff(target) {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    mins: Math.floor((ms / 60000) % 60),
    secs: Math.floor((ms / 1000) % 60),
  };
}

export default function Countdown({ startAt }) {
  const { t } = useLanguage();
  const target = startAt ? new Date(startAt).getTime() : NaN;
  const valid = !Number.isNaN(target);

  const [time, setTime] = useState(() => (valid ? diff(target) : null));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!valid) return;
    setMounted(true);
    setTime(diff(target));
    const id = setInterval(() => setTime(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target, valid]);

  if (!valid) return null;

  // Event already started / over.
  if (mounted && !time) {
    return (
      <div className="text-center">
        <span className="inline-block bg-white/15 text-white font-bold px-6 py-3 rounded-full text-sm md:text-base backdrop-blur-sm border border-white/20">
          {t("countdown_live")}
        </span>
      </div>
    );
  }

  const cells = [
    [time?.days ?? 0, t("countdown_days")],
    [time?.hours ?? 0, t("countdown_hours")],
    [time?.mins ?? 0, t("countdown_mins")],
    [time?.secs ?? 0, t("countdown_secs")],
  ];

  return (
    <div className="text-center">
      <p className="text-amber-100/90 text-xs md:text-sm font-semibold uppercase tracking-[0.2em] mb-4">
        {t("countdown_title")}
      </p>
      <div className="flex justify-center gap-3 md:gap-5">
        {cells.map(([val, label], i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl w-16 md:w-24 py-3 md:py-4 shadow-lg"
          >
            <div className="text-2xl md:text-4xl font-black text-white tabular-nums leading-none">
              {String(val).padStart(2, "0")}
            </div>
            <div className="text-[10px] md:text-xs text-amber-100/80 font-semibold uppercase tracking-wider mt-1.5">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
