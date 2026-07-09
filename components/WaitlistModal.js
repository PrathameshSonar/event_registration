// components/WaitlistModal.js
// Public: join the waitlist for a full tier. Shown from the homepage when a tier
// is sold out. Posts to /api/waitlist.
"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

export default function WaitlistModal({ category, onClose }) {
    const { t, lang } = useLanguage();
    const tierTitle = lang === "hi" ? (category.title_hi || category.title) : category.title;
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) { setError(t("wl_err_name")); return; }
        if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").replace(/^(91|0)/, ""))) { setError(t("wl_err_phone")); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId: category.id, name, phone, email }),
            });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) { setError(data.error || t("wl_err_generic")); return; }
            setDone(true);
        } catch { setBusy(false); setError(t("wl_err_generic")); }
    };

    const input = "w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-orange-500";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                {done ? (
                    <div className="text-center py-4">
                        <div className="text-4xl mb-3">🙏</div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">{t("wl_done_title")}</h3>
                        <p className="text-sm text-neutral-500 mb-5">{t("wl_done_desc", tierTitle)}</p>
                        <button onClick={onClose} className="px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">{t("wl_done")}</button>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-bold text-neutral-900">{t("wl_title")}</h3>
                        <p className="text-sm text-neutral-500 mb-4">{t("wl_desc", tierTitle)}</p>
                        <form onSubmit={submit} className="space-y-3">
                            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("wl_name_ph")} />
                            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("wl_phone_ph")} inputMode="numeric" />
                            <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("wl_email_ph")} />
                            {error && <p className="text-rose-600 text-xs">{error}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">{t("wl_cancel")}</button>
                                <button type="submit" disabled={busy} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50">{busy ? t("wl_joining") : t("wl_join")}</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
