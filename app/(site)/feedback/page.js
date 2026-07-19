// app/feedback/page.js — public post-event feedback form.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import LangToggle from "@/components/LangToggle";

export default function FeedbackPage() {
    const { t } = useLanguage();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!rating) { setError(t("fb_err_rating")); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment, name, phone }),
            });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) { setError(data.error || t("fb_err_generic")); return; }
            setDone(true);
        } catch { setBusy(false); setError(t("fb_err_generic")); }
    };

    const input = "w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-500";

    return (
        <main className="min-h-screen bg-ivory text-neutral-900 [color-scheme:light] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="flex justify-end mb-3"><LangToggle /></div>
                {done ? (
                    <div className="bg-white border border-gold-100 rounded-2xl shadow-warm p-8 text-center">
                        <div className="text-5xl mb-3">🙏</div>
                        <h1 className="font-serif text-2xl font-bold mb-1">{t("fb_thank_title")}</h1>
                        <p className="text-neutral-500 text-sm mb-6">{t("fb_thank_desc")}</p>
                        <Link href="/" className="inline-block bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition text-sm">{t("fb_back_home")}</Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="bg-white border border-gold-100 rounded-2xl shadow-warm p-8">
                        <div className="text-center mb-6">
                            <div className="text-3xl mb-2">🪔</div>
                            <h1 className="font-serif text-2xl font-bold">{t("fb_title")}</h1>
                            <p className="text-neutral-500 text-sm mt-1">{t("fb_desc")}</p>
                        </div>

                        <div className="flex justify-center gap-2 mb-6" onMouseLeave={() => setHover(0)}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
                                    className={`text-4xl transition ${(hover || rating) >= n ? "text-amber-400" : "text-neutral-200"}`} aria-label={`${n} star`}>★</button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <textarea className={input} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("fb_comment_ph")} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("fb_name_ph")} />
                                <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder={t("fb_phone_ph")} />
                            </div>
                            {error && <p className="text-rose-600 text-sm">{error}</p>}
                            <button type="submit" disabled={busy} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm">{busy ? t("fb_sending") : t("fb_submit")}</button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
