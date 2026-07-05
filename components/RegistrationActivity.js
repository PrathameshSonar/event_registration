// components/RegistrationActivity.js
// A merged, newest-first timeline for a single registration: every admin action
// (from the audit log) plus every contact note. Shown inside the detail modal so
// you can see one person's whole story — payment, edits, QR sends, notes — in one
// place. Read-only; loads on mount.
"use client";

import { useEffect, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";

const ACTION_DOT = (action) => {
    if (action === "note") return "bg-blue-400";
    if (action.startsWith("payment") || action.includes("refund") || action.includes("balance")) return "bg-green-500";
    if (action.includes("status")) return "bg-amber-500";
    if (action.includes("reminder")) return "bg-orange-500";
    if (action.includes("qr")) return "bg-purple-500";
    if (action.includes("delete") || action.includes("reject") || action.includes("reverse")) return "bg-rose-500";
    return "bg-neutral-400";
};

const fmt = (iso) => {
    try {
        return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
};

/** @param {{ registrationId: string }} props */
export default function RegistrationActivity({ registrationId }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/registration-activity?registrationId=${encodeURIComponent(registrationId)}`);
            const data = await res.json().catch(() => ({}));
            setEvents(Array.isArray(data.events) ? data.events : []);
        } catch {
            setEvents([]);
        }
        setLoading(false);
    };

    // Defer the first fetch out of the effect body so we don't set state synchronously.
    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registrationId]);

    return (
        <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-2 border-b pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Activity Timeline</h3>
                <button onClick={load} className="text-neutral-400 hover:text-neutral-700 transition" title="Refresh"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /></button>
            </div>
            {loading ? (
                <p className="text-sm text-neutral-400 py-2">Loading history…</p>
            ) : events.length === 0 ? (
                <p className="text-sm text-neutral-400 py-2">No recorded activity yet.</p>
            ) : (
                <ol className="relative border-l border-neutral-200 ml-1.5 space-y-3 max-h-64 overflow-y-auto pr-2">
                    {events.map((e) => (
                        <li key={e.id} className="ml-4">
                            <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ${ACTION_DOT(e.action)} ring-2 ring-white`} />
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm text-neutral-800">{e.kind === "note" ? <span className="italic">“{e.text}”</span> : e.text}</p>
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5">{fmt(e.at)} · {e.actor}{e.kind === "note" ? " · note" : ""}</p>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
