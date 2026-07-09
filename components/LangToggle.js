// components/LangToggle.js
"use client";

import { useLanguage } from './LanguageProvider';
import { LANGUAGES } from '@/lib/i18n';

// Compact language switcher. Driven by LANGUAGES in lib/i18n — add a language
// there and it appears here automatically (no edit needed).
export default function LangToggle() {
    const { lang, setLanguage } = useLanguage();

    return (
        <div className="flex items-center border border-neutral-300 rounded-md overflow-hidden text-xs font-bold select-none" aria-label="Switch language">
            {LANGUAGES.map((l, i) => (
                <span key={l.code} className="flex items-center">
                    {i > 0 && <span className="border-l border-neutral-300 self-stretch" />}
                    <button
                        onClick={() => setLanguage(l.code)}
                        className={`px-2.5 py-1 transition ${lang === l.code ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                        aria-pressed={lang === l.code}
                        title={l.label}
                    >
                        {l.short || l.native}
                    </button>
                </span>
            ))}
        </div>
    );
}
