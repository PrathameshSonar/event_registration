// components/WaitlistModal.js
// Public: join the waitlist for a full tier. Shown from the homepage when a tier
// is sold out. Posts to /api/waitlist.
"use client";

import { useState } from "react";

export default function WaitlistModal({ category, onClose }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) { setError("Please enter your name."); return; }
        if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").replace(/^(91|0)/, ""))) { setError("Enter a valid 10-digit mobile number."); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryId: category.id, name, phone, email }),
            });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) { setError(data.error || "Something went wrong."); return; }
            setDone(true);
        } catch { setBusy(false); setError("Something went wrong. Try again."); }
    };

    const input = "w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:border-orange-500";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                {done ? (
                    <div className="text-center py-4">
                        <div className="text-4xl mb-3">🙏</div>
                        <h3 className="text-lg font-bold text-neutral-900 mb-1">You’re on the waitlist</h3>
                        <p className="text-sm text-neutral-500 mb-5">If a spot opens for <strong>{category.title}</strong>, we’ll message you a registration link right away.</p>
                        <button onClick={onClose} className="px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Done</button>
                    </div>
                ) : (
                    <>
                        <h3 className="text-lg font-bold text-neutral-900">Join the waitlist</h3>
                        <p className="text-sm text-neutral-500 mb-4"><strong>{category.title}</strong> is full. Leave your details and we’ll notify you if a spot opens.</p>
                        <form onSubmit={submit} className="space-y-3">
                            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number (10-digit)" inputMode="numeric" />
                            <input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" />
                            {error && <p className="text-rose-600 text-xs">{error}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Cancel</button>
                                <button type="submit" disabled={busy} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50">{busy ? "Joining…" : "Join waitlist"}</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
