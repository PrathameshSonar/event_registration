// components/LanguageProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '@/lib/lang/en';
import hi from '@/lib/lang/hi';
import mr from '@/lib/lang/mr';
import { LANG_CODES } from '@/lib/i18n';

type Lang = 'en' | 'hi' | 'mr';

interface LanguageContextValue {
    lang: Lang;
    toggle: () => void;
    setLanguage: (l: Lang) => void;
    t: (key: string, ...args: unknown[]) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dicts: Record<Lang, Record<string, any>> = { en, hi, mr };

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>('en');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('bb_lang');
            // Accept any configured language code (en/hi/mr/…).
            if (stored && stored !== 'en' && LANG_CODES.includes(stored)) setLang(stored as Lang);
            // Mirror to a cookie so SERVER components (e.g. /pass/[id]) can read the
            // chosen language — localStorage isn't visible server-side.
            if (stored) document.cookie = `bb_lang=${stored};path=/;max-age=31536000;samesite=lax`;
        } catch { /* localStorage not available */ }
    }, []);

    const setLanguage = (next: Lang) => {
        setLang(next);
        document.documentElement.lang = next;
        try {
            localStorage.setItem('bb_lang', next);
            document.cookie = `bb_lang=${next};path=/;max-age=31536000;samesite=lax`;
        } catch { /* ignore */ }
    };

    // Cycle through the configured languages (used by the compact toggle).
    const toggle = () => {
        const codes = LANG_CODES as Lang[];
        const idx = codes.indexOf(lang);
        setLanguage(codes[(idx + 1) % codes.length]);
    };

    const t = (key: string, ...args: unknown[]): string => {
        const val = dicts[lang]?.[key] ?? dicts['en']?.[key] ?? key;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return typeof val === 'function' ? val(...args) : String(val);
    };

    return (
        <LanguageContext.Provider value={{ lang, toggle, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}
