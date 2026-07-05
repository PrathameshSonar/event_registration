// components/EventOpsPanel.js
// Live event-day operations summary shown at the top of the Scan Log tab: how many
// paid attendees have arrived (been scanned), how many are still to come, the
// per-checkpoint breakdown, and the recent arrival rate. Auto-refreshes every 20s.
"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, DoorOpen, Clock, RefreshCw, TrendingUp } from "lucide-react";

const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

export default function EventOpsPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (silent) => {
        if (silent) setRefreshing(true); else setLoading(true);
        try {
            const res = await fetch("/api/admin/event-ops");
            const d = await res.json().catch(() => null);
            if (res.ok && d) setData(d);
        } catch { /* keep last good data */ }
        setLoading(false); setRefreshing(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => load(false), 0);
        const iv = setInterval(() => load(true), 20000);
        return () => { clearTimeout(t); clearInterval(iv); };
    }, [load]);

    if (loading && !data) {
        return <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-neutral-400 text-sm">Loading live operations…</div>;
    }
    if (!data) return null;

    const pct = data.pct || 0;
    const barColor = pct >= 90 ? "bg-green-500" : pct >= 50 ? "bg-orange-500" : "bg-amber-500";

    return (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Event-Day Operations</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                    {data.lastScanAt && <span>Last scan {fmtTime(data.lastScanAt)}</span>}
                    <button onClick={() => load(true)} title="Refresh" className="text-neutral-400 hover:text-white transition"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></button>
                </div>
            </div>

            {/* Arrival progress */}
            <div className="mb-5">
                <div className="flex items-end justify-between mb-2">
                    <div>
                        <span className="text-3xl md:text-4xl font-black">{data.arrivedAttendees}</span>
                        <span className="text-neutral-400 text-sm"> / {data.paidAttendees} attendees arrived</span>
                    </div>
                    <span className="text-2xl font-black text-orange-400">{pct}%</span>
                </div>
                <div className="h-3 bg-neutral-700 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1"><Users className="w-3.5 h-3.5" /> Arrived</div>
                    <div className="text-xl font-bold">{data.arrivedRegs}<span className="text-neutral-500 text-sm font-normal"> groups</span></div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1"><Clock className="w-3.5 h-3.5" /> Yet to arrive</div>
                    <div className="text-xl font-bold">{data.notArrivedAttendees}<span className="text-neutral-500 text-sm font-normal"> attendees</span></div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1"><TrendingUp className="w-3.5 h-3.5" /> Last 15 min</div>
                    <div className="text-xl font-bold">{data.recent?.last15 ?? 0}<span className="text-neutral-500 text-sm font-normal"> scans</span></div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1"><TrendingUp className="w-3.5 h-3.5" /> Last 30 min</div>
                    <div className="text-xl font-bold">{data.recent?.last30 ?? 0}<span className="text-neutral-500 text-sm font-normal"> scans</span></div>
                </div>
            </div>

            {/* Per-checkpoint */}
            {data.perCheckpoint?.length > 0 && (
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">By checkpoint</p>
                    <div className="flex flex-wrap gap-2">
                        {data.perCheckpoint.map((cp) => (
                            <div key={cp.id} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                                <span className="font-semibold">{cp.name}</span>
                                <span className="text-neutral-400"> · {cp.attendees} attendee(s) · {cp.regs} group(s)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
