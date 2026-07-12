// app/donate/page.js — public Seva / donation page.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import LangToggle from "@/components/LangToggle";

const PRESETS = [501, 1100, 2100, 5100, 11000];

function loadRazorpay() {
    return new Promise((resolve) => {
        if (typeof window !== "undefined" && window.Razorpay) return resolve(true);
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });
}

export default function DonatePage() {
    const { t } = useLanguage();
    const [amount, setAmount] = useState(1100);
    const [custom, setCustom] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [anonymous, setAnonymous] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(null);

    const effectiveAmount = custom ? Math.floor(Number(custom) || 0) : amount;

    const donate = async (e) => {
        e.preventDefault();
        setError("");
        // An anonymous donor's name is never collected, so don't demand one.
        if (!anonymous && !name.trim()) { setError(t("donate_err_name")); return; }
        if (!(effectiveAmount >= 1)) { setError(t("donate_err_amount")); return; }
        if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError(t("donate_err_email")); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/donate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, email, amount: effectiveAmount, message, isAnonymous: anonymous }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || t("donate_err_start")); setBusy(false); return; }

            const ok = await loadRazorpay();
            if (!ok) { setError(t("donate_err_gateway")); setBusy(false); return; }

            const rzp = new window.Razorpay({
                key: data.keyId, amount: data.amount, currency: data.currency, order_id: data.orderId,
                name: "BaglaBhairav", description: "Seva / Contribution",
                prefill: { name, email: email || undefined, contact: phone || undefined },
                theme: { color: "#ea580c" },
                handler: async (r) => {
                    const vRes = await fetch("/api/donate/verify", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }),
                    });
                    const vData = await vRes.json().catch(() => ({}));
                    setBusy(false);
                    if (vRes.ok) setDone({ name: vData.name, amount: vData.amount });
                    else setError(vData.error || t("donate_err_verify"));
                },
                modal: { ondismiss: () => setBusy(false) },
            });
            rzp.on("payment.failed", () => { setError(t("donate_err_generic")); setBusy(false); });
            rzp.open();
        } catch {
            setError(t("donate_err_generic"));
            setBusy(false);
        }
    };

    const input = "w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-orange-500";

    if (done) {
        return (
            <main className="min-h-screen bg-ivory flex items-center justify-center p-4 [color-scheme:light]">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gold-100">
                    <div className="text-5xl mb-3">🙏</div>
                    <h1 className="font-serif text-2xl font-bold text-neutral-900 mb-1">{t("donate_thank_title", done.name || t("donate_anon_donor"))}</h1>
                    <p className="text-neutral-600 text-sm mb-6">{t("donate_thank_desc", Number(done.amount).toLocaleString("en-IN"))} {email ? t("donate_thank_email") : ""}</p>
                    <Link href="/" className="inline-block bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition text-sm">{t("donate_back_home")}</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-ivory text-neutral-900 [color-scheme:light]">
            <header className="bg-white/90 border-b border-gold-200/70 sticky top-0 z-10 backdrop-blur-md">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="font-serif text-lg font-bold">BaglaBhairav</Link>
                    <div className="flex items-center gap-4">
                        <LangToggle />
                        <Link href="/" className="text-sm text-neutral-500 hover:text-orange-600">← {t("footer_home")}</Link>
                    </div>
                </div>
            </header>

            <section className="bg-gradient-to-b from-orange-700 to-amber-700 text-white">
                <div className="max-w-2xl mx-auto px-4 py-10 text-center">
                    <div className="text-3xl mb-2">🪔</div>
                    <h1 className="font-serif text-2xl md:text-3xl font-extrabold">{t("donate_hero_title")}</h1>
                    <p className="text-amber-50/90 text-sm mt-2 max-w-md mx-auto">{t("donate_hero_desc")}</p>
                </div>
            </section>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <form onSubmit={donate} className="bg-white border border-gold-100 rounded-2xl shadow-warm p-6 space-y-5">
                    <div>
                        <label className="text-xs font-semibold text-neutral-500 mb-2 block">{t("donate_choose_amount")}</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {PRESETS.map((p) => (
                                <button type="button" key={p} onClick={() => { setAmount(p); setCustom(""); }}
                                    className={`py-2.5 rounded-lg text-sm font-bold border transition ${!custom && amount === p ? "bg-orange-600 text-white border-orange-600" : "bg-white text-neutral-700 border-neutral-200 hover:border-orange-300"}`}>
                                    ₹{p.toLocaleString("en-IN")}
                                </button>
                            ))}
                        </div>
                        <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={t("donate_custom_ph")} className={`${input} mt-2`} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            className={`${input} ${anonymous ? "bg-neutral-100 text-neutral-400" : ""}`}
                            value={anonymous ? "" : name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={anonymous ? t("donate_anon_donor") : t("donate_name_ph")}
                            disabled={anonymous}
                        />
                        <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("donate_phone_ph")} inputMode="numeric" />
                    </div>
                    <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("donate_email_ph")} />
                    <textarea className={input} value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={t("donate_message_ph")} />

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={anonymous}
                            onChange={(e) => setAnonymous(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span>
                            <span className="text-sm font-medium text-neutral-700 block">{t("donate_anonymous")}</span>
                            <span className="text-xs text-neutral-400">{t("donate_anonymous_hint")}</span>
                        </span>
                    </label>

                    {error && <p className="text-rose-600 text-sm">{error}</p>}
                    <button type="submit" disabled={busy} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-sm">
                        {busy ? t("donate_processing") : t("donate_cta", (effectiveAmount || 0).toLocaleString("en-IN"))}
                    </button>
                    <p className="text-[11px] text-neutral-400 text-center">{t("donate_secured")}</p>
                </form>
            </div>
        </main>
    );
}
