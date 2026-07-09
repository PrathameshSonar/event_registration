// components/FeedbackManager.js
// Settings → Feedback. Send a post-event thank-you + feedback request to all Paid,
// and view the responses with the average rating.
"use client";

import { useEffect, useState } from "react";
import { Star, Send } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";

const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };
const stars = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

export default function FeedbackManager() {
    const [data, setData] = useState({ feedback: [], count: 0, avg: 0 });
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/feedback");
            const d = await res.json().catch(() => ({}));
            if (res.ok) setData(d);
        } catch { /* ignore */ }
        setLoading(false);
    };
    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, []);

    const sendThankYou = async () => {
        if (!(await confirmDialog({ title: "Send thank-you + feedback", message: "Send a thank-you message with a feedback link to ALL paid attendees (email + WhatsApp)? Do this after the event.", confirmLabel: "Send" }))) return;
        setSending(true);
        try {
            const res = await fetch("/api/admin/feedback", { method: "POST" });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) { toast.error(d.error || "Could not send."); return; }
            toast.success(`Sent to ${d.recipients} — ${d.emailSent} email, ${d.waSent} WhatsApp.`);
        } finally { setSending(false); }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Post-event Feedback</h3>
                    <p className="text-sm text-neutral-500">Send a thank-you + feedback request after the event, and read the responses.</p>
                </div>
                <button onClick={sendThankYou} disabled={sending} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"><Send className="w-4 h-4" /> {sending ? "Sending…" : "Send thank-you to all Paid"}</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Star className="w-5 h-5" /></div>
                    <div><p className="text-xs text-neutral-500">Average Rating</p><p className="text-2xl font-bold">{data.avg || "—"}<span className="text-sm text-neutral-400"> / 5</span></p></div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Star className="w-5 h-5" /></div>
                    <div><p className="text-xs text-neutral-500">Responses</p><p className="text-2xl font-bold">{data.count}</p></div>
                </div>
            </div>

            <div className="space-y-2">
                {loading ? (
                    <p className="text-sm text-neutral-400">Loading…</p>
                ) : data.feedback.length === 0 ? (
                    <p className="text-sm text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-6 text-center">No feedback yet.</p>
                ) : data.feedback.map((f) => (
                    <div key={f.id} className="bg-white border border-neutral-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-amber-400 text-lg tracking-widest" title={`${f.rating}/5`}>{stars(f.rating)}</span>
                            <span className="text-xs text-neutral-400">{fmt(f.created_at)}</span>
                        </div>
                        {f.comment && <p className="text-sm text-neutral-700 mt-1.5">{f.comment}</p>}
                        {(f.name || f.phone) && <p className="text-xs text-neutral-400 mt-1">— {f.name || "Anonymous"}{f.phone ? ` · ${f.phone}` : ""}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
