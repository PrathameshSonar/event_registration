// components/LiveBanner.js
// Site-wide sticky "we're live" bar. Rendered from the root layout, so someone on
// /register or /donate still learns the stream has started.
//
// It's a CLIENT component fetching a small JSON endpoint rather than a server read
// in the layout: a DB call in the root layout would force every page (including the
// static /terms, /privacy, /pitham) to render dynamically on each request. Polling
// also means a visitor already sitting on the page sees the bar appear when the
// admin goes live, without reloading.
//
// Renders NOTHING unless the event is actually live, so it costs one small fetch.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { pick } from "@/lib/i18n";

const POLL_MS = 60_000;

export default function LiveBanner() {
    const { t, lang } = useLanguage();
    const [live, setLive] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            try {
                const res = await fetch("/api/livestream");
                const d = await res.json().catch(() => ({}));
                if (!cancelled) setLive(d?.live ? d : null);
            } catch {
                // Offline / transient — leave the bar as-is rather than flickering it away.
            }
        };
        check();
        const id = setInterval(check, POLL_MS);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    if (!live) return null;

    // The banner line is translatable like every other event field.
    const text = pick({ livestream_banner: live.banner, translations: live.translations }, "livestream_banner", lang)
        || t("live_default_banner");

    return (
        <Link
            href="/#livestream"
            className="sticky top-0 z-50 flex items-center justify-center gap-2.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm font-semibold transition"
        >
            <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {t("live_now")}
            </span>
            <span className="truncate">{text}</span>
            <span className="hidden sm:inline-flex items-center gap-1 underline underline-offset-2 flex-shrink-0">
                <Radio className="w-3.5 h-3.5" /> {t("live_watch")}
            </span>
        </Link>
    );
}
