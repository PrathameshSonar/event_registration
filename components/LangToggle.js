// components/LangToggle.js
"use client";

import { useLanguage } from './LanguageProvider';

export default function LangToggle() {
    const { lang, setLanguage } = useLanguage();

    return (
        <div className="flex items-center border border-neutral-300 rounded-md overflow-hidden text-xs font-bold select-none" aria-label="Switch language">
            <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 transition ${lang === 'en' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                aria-pressed={lang === 'en'}
            >
                EN
            </button>
            <span className="border-l border-neutral-300 h-full" />
            <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1 transition ${lang === 'hi' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                aria-pressed={lang === 'hi'}
            >
                हिं
            </button>
        </div>
    );
}
