// components/LangToggle.js
"use client";

import { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { LANGUAGES } from '@/lib/i18n';

// Language switcher — a custom popover (not a native <select>) so it matches the
// luxury theme. Driven by LANGUAGES in lib/i18n: add a language there and it
// appears here automatically.
export default function LangToggle() {
    const { lang, setLanguage } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Switch language"
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-white/70 backdrop-blur px-3 h-9 text-[13px] font-semibold text-brown hover:bg-white hover:border-gold transition"
            >
                <Globe className="h-4 w-4 text-vermillion" />
                <span>{current?.native}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-brown/50 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-luxury">
                    {LANGUAGES.map((l) => {
                        const active = l.code === lang;
                        return (
                            <button
                                key={l.code}
                                type="button"
                                onClick={() => { setLanguage(l.code); setOpen(false); }}
                                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition ${active ? 'bg-gold/10 text-vermillion font-semibold' : 'text-brown hover:bg-cream/60'}`}
                            >
                                <span className="flex flex-col leading-tight">
                                    <span>{l.native}</span>
                                    {l.label && l.label !== l.native && <span className="text-[11px] text-brown/45">{l.label}</span>}
                                </span>
                                {active && <Check className="h-4 w-4 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
