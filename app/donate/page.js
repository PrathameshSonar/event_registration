// app/donate/page.js — public Seva / donation page.
"use client";

import { useState } from "react";
import Link from "next/link";

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
    const [amount, setAmount] = useState(1100);
    const [custom, setCustom] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(null);

    const effectiveAmount = custom ? Math.floor(Number(custom) || 0) : amount;

    const donate = async (e) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) { setError("Please enter your name."); return; }
        if (!(effectiveAmount >= 1)) { setError("Please choose a valid amount."); return; }
        if (email && !/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email (or leave it blank)."); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/donate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, email, amount: effectiveAmount, message }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || "Could not start the payment."); setBusy(false); return; }

            const ok = await loadRazorpay();
            if (!ok) { setError("Could not load the payment gateway. Check your connection."); setBusy(false); return; }

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
                    else setError(vData.error || "Payment could not be verified. If money was deducted, contact us.");
                },
                modal: { ondismiss: () => setBusy(false) },
            });
            rzp.on("payment.failed", () => { setError("Payment failed. Please try again."); setBusy(false); });
            rzp.open();
        } catch {
            setError("Something went wrong. Try again.");
            setBusy(false);
        }
    };

    const input = "w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-orange-500";

    if (done) {
        return (
            <main className="min-h-screen bg-ivory flex items-center justify-center p-4 [color-scheme:light]">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gold-100">
                    <div className="text-5xl mb-3">🙏</div>
                    <h1 className="font-serif text-2xl font-bold text-neutral-900 mb-1">Dhanyavaad, {done.name}!</h1>
                    <p className="text-neutral-600 text-sm mb-6">Your Seva of <strong>₹{Number(done.amount).toLocaleString("en-IN")}</strong> is received. {email ? "A receipt is on its way to your email." : ""} May you be blessed.</p>
                    <Link href="/" className="inline-block bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition text-sm">Back to Home</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-ivory text-neutral-900 [color-scheme:light]">
            <header className="bg-white/90 border-b border-gold-200/70 sticky top-0 z-10 backdrop-blur-md">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="font-serif text-lg font-bold">BaglaBhairav</Link>
                    <Link href="/" className="text-sm text-neutral-500 hover:text-orange-600">← Home</Link>
                </div>
            </header>

            <section className="bg-gradient-to-b from-orange-700 to-amber-700 text-white">
                <div className="max-w-2xl mx-auto px-4 py-10 text-center">
                    <div className="text-3xl mb-2">🪔</div>
                    <h1 className="font-serif text-2xl md:text-3xl font-extrabold">Offer Your Seva</h1>
                    <p className="text-amber-50/90 text-sm mt-2 max-w-md mx-auto">Contribute to the BaglaBhairav Mahotsav. Every offering, big or small, sustains this sacred gathering.</p>
                </div>
            </section>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <form onSubmit={donate} className="bg-white border border-gold-100 rounded-2xl shadow-warm p-6 space-y-5">
                    <div>
                        <label className="text-xs font-semibold text-neutral-500 mb-2 block">Choose an amount</label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {PRESETS.map((p) => (
                                <button type="button" key={p} onClick={() => { setAmount(p); setCustom(""); }}
                                    className={`py-2.5 rounded-lg text-sm font-bold border transition ${!custom && amount === p ? "bg-orange-600 text-white border-orange-600" : "bg-white text-neutral-700 border-neutral-200 hover:border-orange-300"}`}>
                                    ₹{p.toLocaleString("en-IN")}
                                </button>
                            ))}
                        </div>
                        <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Or enter a custom amount (₹)" className={`${input} mt-2`} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" />
                        <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile (optional)" inputMode="numeric" />
                    </div>
                    <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (for a receipt)" />
                    <textarea className={input} value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Dedication / message (optional)" />

                    {error && <p className="text-rose-600 text-sm">{error}</p>}
                    <button type="submit" disabled={busy} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-50 text-sm">
                        {busy ? "Processing…" : `🙏 Donate ₹${(effectiveAmount || 0).toLocaleString("en-IN")}`}
                    </button>
                    <p className="text-[11px] text-neutral-400 text-center">Secured by Razorpay. Your contribution supports the Mahotsav.</p>
                </form>
            </div>
        </main>
    );
}
