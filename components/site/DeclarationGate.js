// components/site/DeclarationGate.js
// Blocking "Samanti Patra" consent modal shown before the register / donate form.
// Self-fetches the admin declaration; if enabled and not yet accepted this session,
// it covers the page until the user scrolls to the bottom and accepts. Declining
// sends them back. Acceptance is remembered for the session so it won't re-prompt
// as they move between register/donate in the same visit.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollText, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const SESSION_KEY = "samanti_accepted";

export default function DeclarationGate() {
    const { t, lang } = useLanguage();
    const router = useRouter();
    const [decl, setDecl] = useState(null);
    const [accepted, setAccepted] = useState(true); // assume accepted until we know otherwise (no flash)
    const [atEnd, setAtEnd] = useState(false);
    const bodyRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const already = typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";
                const res = await fetch("/api/declaration");
                const d = await res.json().catch(() => ({}));
                if (cancelled) return;
                const dec = d?.declaration;
                if (dec?.enabled && (dec.body?.[lang] || dec.body?.en || dec.title?.[lang] || dec.title?.en) && !already) {
                    setDecl(dec);
                    setAccepted(false);
                } else {
                    setAccepted(true);
                }
            } catch {
                setAccepted(true);
            }
        })();
        return () => { cancelled = true; };
    }, [lang]);

    // Lock page scroll while the gate is open.
    useEffect(() => {
        if (accepted) return;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, [accepted]);

    // If the text is short enough that it doesn't scroll, the user has already
    // "reached the end" — enable Accept immediately.
    useEffect(() => {
        const el = bodyRef.current;
        if (el && el.scrollHeight <= el.clientHeight + 8) setAtEnd(true);
    }, [decl]);

    if (accepted || !decl) return null;

    const title = decl.title?.[lang] || decl.title?.en || t("declaration_title") || "Declaration";
    const body = decl.body?.[lang] || decl.body?.en || "";

    const onScroll = (e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setAtEnd(true);
    };

    const accept = () => {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
        setAccepted(true);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center gap-3 border-b border-gold/15 px-6 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vermillion/10 text-vermillion"><ScrollText className="h-5 w-5" /></span>
                    <h2 className="font-display text-lg md:text-xl text-brown">{title}</h2>
                </div>

                <div ref={bodyRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-5 text-[15px] leading-[1.8] text-brown/85 whitespace-pre-wrap">
                    {body}
                </div>

                <div className="border-t border-gold/15 bg-cream/40 px-6 py-4">
                    {!atEnd && <p className="mb-3 text-center text-xs text-brown/50">{t("declaration_scroll_hint") || "Please scroll to the bottom to continue."}</p>}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                        <button onClick={() => router.push("/")} className="btn-outline-gold justify-center">
                            {t("declaration_decline") || "Decline"}
                        </button>
                        <button onClick={accept} disabled={!atEnd} className="btn-gold justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                            <Check className="h-4 w-4" /> {t("declaration_accept") || "I have read & I agree"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
