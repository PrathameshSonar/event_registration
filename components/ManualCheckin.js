// components/ManualCheckin.js
// Gate fallback: when a paid person's QR won't scan (dead phone, email never
// arrived), staff search them by name/phone, pick the checkpoint, and check them
// in manually. Uses the same /api/checkin endpoint as the scanner, flagged
// manual:true so the log shows it wasn't a QR scan.
"use client";

import { useState } from "react";
import { UserCheck, Search } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";

/**
 * @param {{ registrations?: any[], checkpoints?: any[], onCheckedIn?: () => void }} props
 */
export default function ManualCheckin({ registrations = [], checkpoints = [], onCheckedIn }) {
    const [q, setQ] = useState("");
    const [checkpointId, setCheckpointId] = useState(checkpoints[0]?.id || "");
    const [busyId, setBusyId] = useState(null);

    const query = q.trim().toLowerCase();
    const matches = query.length >= 2
        ? registrations.filter((r) => r.payment_status === "completed" && (
            `${r.full_name || ""} ${r.first_name || ""} ${r.last_name || ""}`.toLowerCase().includes(query) ||
            String(r.phone || "").includes(query)
          )).slice(0, 6)
        : [];

    const checkin = async (reg) => {
        const cp = checkpoints.find((c) => c.id === checkpointId);
        if (!cp) { toast.error("Choose a checkpoint first."); return; }
        if (!(await confirmDialog({ title: "Manual check-in", message: `Check in ${reg.first_name} ${reg.last_name} (${reg.attendees_count || 1} attendee(s)) at "${cp.name}"?\nOnly do this after verifying their identity.`, confirmLabel: "Check in" }))) return;
        setBusyId(reg.id);
        try {
            const res = await fetch(`/api/checkin/${reg.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checkpointId, manual: true }),
            });
            const data = await res.json().catch(() => ({}));
            setBusyId(null);
            if (!res.ok) { toast.error(data.error || "Check-in failed."); return; }
            if (data.status === "NEW") { toast.success(`${reg.first_name} checked in at ${cp.name}.`); setQ(""); onCheckedIn?.(); }
            else if (data.status === "DUPLICATE") toast.info(`${reg.first_name} was already checked in at ${cp.name}.`);
            else toast.error(`Cannot check in — status ${data.status}.`);
        } catch {
            setBusyId(null);
            toast.error("Check-in failed. Try again.");
        }
    };

    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Manual Check-in</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-3">QR won’t scan or never arrived? Verify the person’s identity, find them below (Paid only), and check them in.</p>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search paid registrations by name or phone…" className="w-full pl-9 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" />
                </div>
                <select value={checkpointId} onChange={(e) => setCheckpointId(e.target.value)} className="border border-neutral-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-500">
                    {checkpoints.length === 0 && <option value="">No checkpoints</option>}
                    {checkpoints.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            {query.length >= 2 && (
                <div className="mt-2 border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden">
                    {matches.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-neutral-400 text-center">No paid registration matches “{q}”.</p>
                    ) : matches.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0">
                                <p className="font-semibold text-neutral-900 text-sm truncate">{r.full_name || `${r.first_name} ${r.last_name}`}</p>
                                <p className="text-xs text-neutral-500 truncate">{r.phone}{r.categories?.title ? ` · ${r.categories.title}` : ""} · {r.attendees_count || 1} attendee(s)</p>
                            </div>
                            <button onClick={() => checkin(r)} disabled={busyId === r.id || !checkpointId} className="flex-shrink-0 flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-50">
                                <UserCheck className="w-3.5 h-3.5" /> {busyId === r.id ? "Checking…" : "Check in"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
