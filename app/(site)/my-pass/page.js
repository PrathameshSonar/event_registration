// app/(site)/my-pass/page.js — public "Find my registration" self-service page.
// Nav/footer come from the (site) layout.
"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function MyPassPage() {
    const { t } = useLanguage();
    const [phone, setPhone] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        const digits = phone.replace(/\D/g, "").slice(-10);
        if (digits.length !== 10) { setError(t("mypass_err_phone")); return; }
        setBusy(true);
        try {
            await fetch("/api/my-registration", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: digits }),
            });
            // Always show the same message (we never reveal whether a number exists).
            setDone(true);
        } catch {
            setError(t("mypass_err_generic"));
        }
        setBusy(false);
    };

    return (
        <section className="section-y">
            <div className="container-luxury max-w-md">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">🎟️</div>
                    <h1 className="display-section text-brown">{t("mypass_title")}</h1>
                    <p className="text-brown/70 text-sm mt-3">{t("mypass_desc")}</p>
                </div>

                {done ? (
                    <div className="luxury-card p-8 text-center">
                        <div className="text-3xl mb-2">📩</div>
                        <h2 className="font-display text-xl text-brown mb-1">{t("mypass_done_title")}</h2>
                        <p className="text-sm text-brown/60">{t("mypass_done_desc")}</p>
                        <button onClick={() => { setDone(false); setPhone(""); }} className="mt-5 text-sm font-semibold text-vermillion hover:underline">{t("mypass_try_another")}</button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="luxury-card p-8 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-brown/60 mb-1 block uppercase tracking-wider">{t("mypass_phone_label")}</label>
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={13} placeholder={t("mypass_phone_ph")} className="w-full px-4 py-3 border border-gold/25 rounded-xl text-sm bg-white focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
                        </div>
                        {error && <p className="text-rose-600 text-sm">{error}</p>}
                        <button type="submit" disabled={busy} className="btn-gold w-full justify-center disabled:opacity-50">{busy ? t("mypass_sending") : t("mypass_send")}</button>
                        <p className="text-[11px] text-brown/40 text-center">{t("mypass_security")}</p>
                    </form>
                )}
            </div>
        </section>
    );
}
