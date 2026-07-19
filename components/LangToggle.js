// components/LangToggle.js
"use client";

import { useLanguage } from './LanguageProvider';
import { LANGUAGES } from '@/lib/i18n';

// Language switcher (dropdown). Driven by LANGUAGES in lib/i18n — add a language
// there and it appears here automatically (no edit needed).
export default function LangToggle() {
    const { lang, setLanguage } = useLanguage();

    return (
        <select
            value={lang}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Switch language"
            className="border border-gold/40 rounded-full text-xs font-semibold text-brown bg-white/70 backdrop-blur px-3 py-1.5 cursor-pointer focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 hover:bg-white transition [color-scheme:light]"
        >
            {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
            ))}
        </select>
    );
}
