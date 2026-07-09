// app/feedback/page.js — public post-event feedback form.
"use client";

import { useState } from "react";
import Link from "next/link";

export default function FeedbackPage() {
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
        if (!rating) { setError("Please tap a star to rate."); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment, name, phone }),
            });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) { setError(data.error || "Something went wrong."); return; }
            setDone(true);
        } catch { setBusy(false); setError("Something went wrong. Try again."); }
    };

    const input = "w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-500";

    return (
        <main className="min-h-screen bg-ivory text-neutral-900 [color-scheme:light] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {done ? (
                    <div className="bg-white border border-gold-100 rounded-2xl shadow-warm p-8 text-center">
                        <div className="text-5xl mb-3">🙏</div>
                        <h1 className="font-serif text-2xl font-bold mb-1">Thank you!</h1>
                        <p className="text-neutral-500 text-sm mb-6">Your feedback helps us make the next Mahotsav even more blessed.</p>
                        <Link href="/" className="inline-block bg-neutral-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition text-sm">Back to Home</Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="bg-white border border-gold-100 rounded-2xl shadow-warm p-8">
                        <div className="text-center mb-6">
                            <div className="text-3xl mb-2">🪔</div>
                            <h1 className="font-serif text-2xl font-bold">How was the Mahotsav?</h1>
                            <p className="text-neutral-500 text-sm mt-1">Your feedback means a lot to us.</p>
                        </div>

                        <div className="flex justify-center gap-2 mb-6" onMouseLeave={() => setHover(0)}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
                                    className={`text-4xl transition ${(hover || rating) >= n ? "text-amber-400" : "text-neutral-200"}`} aria-label={`${n} star`}>★</button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <textarea className={input} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you love? What can we improve? (optional)" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" />
                                <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="Mobile (optional)" />
                            </div>
                            {error && <p className="text-rose-600 text-sm">{error}</p>}
                            <button type="submit" disabled={busy} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm">{busy ? "Sending…" : "Submit feedback"}</button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
