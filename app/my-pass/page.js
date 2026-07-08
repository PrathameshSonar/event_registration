// app/my-pass/page.js — public "Find my registration" self-service page.
"use client";

import { useState } from "react";
import Link from "next/link";

export default function MyPassPage() {
    const [phone, setPhone] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        const digits = phone.replace(/\D/g, "").slice(-10);
        if (digits.length !== 10) { setError("Enter your 10-digit mobile number."); return; }
        setBusy(true);
        try {
            await fetch("/api/my-registration", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: digits }),
            });
            // Always show the same message (we never reveal whether a number exists).
            setDone(true);
        } catch {
            setError("Something went wrong. Please try again.");
        }
        setBusy(false);
    };

    return (
        <main className="min-h-screen bg-ivory text-neutral-900 [color-scheme:light]">
            <header className="bg-white/90 border-b border-gold-200/70 sticky top-0 z-10 backdrop-blur-md">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="font-serif text-lg font-bold">BaglaBhairav</Link>
                    <Link href="/" className="text-sm text-neutral-500 hover:text-orange-600">← Home</Link>
                </div>
            </header>

            <div className="max-w-md mx-auto px-4 py-12">
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🎟️</div>
                    <h1 className="font-serif text-2xl font-bold">Find My Registration</h1>
                    <p className="text-neutral-500 text-sm mt-2">Lost your entry pass or need to finish a payment? Enter your registered mobile number and we&apos;ll send your pass link to your registered email &amp; WhatsApp.</p>
                </div>

                {done ? (
                    <div className="bg-white border border-gold-100 rounded-2xl shadow-warm p-6 text-center">
                        <div className="text-3xl mb-2">📩</div>
                        <h2 className="font-bold text-neutral-900 mb-1">Check your email &amp; WhatsApp</h2>
                        <p className="text-sm text-neutral-500">If that number is registered, we&apos;ve sent your pass link (and any pending payment link) to the email &amp; WhatsApp on file. It can take a minute to arrive.</p>
                        <button onClick={() => { setDone(false); setPhone(""); }} className="mt-5 text-sm font-semibold text-orange-600 hover:underline">Try another number</button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="bg-white border border-gold-100 rounded-2xl shadow-warm p-6 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 mb-1 block">Registered mobile number</label>
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={13} placeholder="10-digit mobile" className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-500" />
                        </div>
                        {error && <p className="text-rose-600 text-sm">{error}</p>}
                        <button type="submit" disabled={busy} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm">{busy ? "Sending…" : "Send my pass"}</button>
                        <p className="text-[11px] text-neutral-400 text-center">For your security, we send only to the contact on file — not shown here.</p>
                    </form>
                )}
            </div>
        </main>
    );
}
