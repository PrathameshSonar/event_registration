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
            className="border border-neutral-300 rounded-md text-xs font-bold text-neutral-700 bg-white px-2 py-1.5 cursor-pointer focus:outline-none focus:border-orange-500 hover:bg-neutral-50 transition"
        >
            {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native}</option>
            ))}
        </select>
    );
}
