// components/ScanLogPanel.js
// Live scan log — every entry check-in recorded by the /scan kiosks, with the
// registrant's name/status and the checkpoint. Read-only; any admin/viewer.
"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, QrCode, Undo2 } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";

const STATUS_CLASS = {
    completed: "bg-green-100 text-green-700 border-green-200",
    advance_paid: "bg-amber-100 text-amber-800 border-amber-300",
};
const STATUS_LABEL = { completed: "Paid", advance_paid: "Advance" };

function nameOf(reg) {
    if (!reg) return "—";
    return [reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(" ");
}

/**
 * `canUndo` mirrors the server: undoing a check-in needs `checkin:scan`, not the
 * read-only `scanlog:view` that opens this panel. Without it the column is hidden
 * rather than shown-and-403ing.
 * @param {{ checkpoints?: any[], canUndo?: boolean }} props
 */
export default function ScanLogPanel({ checkpoints = [], canUndo = false }) {
    const [checkpointId, setCheckpointId] = useState("all");
    const [q, setQ] = useState("");
    const [rows, setRows] = useState([]);
    const [stats, setStats] = useState({ totalScans: 0, uniqueAttendees: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 25;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (checkpointId !== "all") params.set("checkpointId", checkpointId);
            const res = await fetch(`/api/admin/checkins?${params.toString()}`);
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setRows(data.checkins || []);
                setStats({ totalScans: data.totalScans || 0, uniqueAttendees: data.uniqueAttendees || 0 });
            } else { setRows([]); }
        } finally { setLoading(false); }
    }, [checkpointId]);

    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

    const [undoingId, setUndoingId] = useState(null);
    const undo = async (c) => {
        if (!(await confirmDialog({ title: "Undo check-in", message: `Remove the check-in for ${nameOf(c.registrations)} at ${c.checkpoints?.name || "this checkpoint"}? They can be scanned in again.`, danger: true, confirmLabel: "Undo" }))) return;
        setUndoingId(c.id);
        try {
            const res = await fetch("/api/admin/checkins", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { toast.error(data.error || "Could not undo."); return; }
            toast.success("Check-in undone.");
            load();
        } finally { setUndoingId(null); }
    };

    const term = q.trim().toLowerCase();
    const filtered = term
        ? rows.filter((c) => `${nameOf(c.registrations)} ${c.registrations?.phone || ""}`.toLowerCase().includes(term))
        : rows;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <QrCode className="w-5 h-5 text-neutral-500" />
                <h3 className="text-lg font-bold text-neutral-900">Scan Log</h3>
                <span className="text-xs text-neutral-400">Everyone scanned at the entry gates.</span>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-neutral-200 rounded-xl p-4"><p className="text-xs text-neutral-500">Total Scans</p><p className="text-2xl font-bold">{stats.totalScans}</p></div>
                <div className="bg-white border border-neutral-200 rounded-xl p-4"><p className="text-xs text-neutral-500">Unique Attendees</p><p className="text-2xl font-bold">{stats.uniqueAttendees}</p></div>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="text" placeholder="Search name or phone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                </div>
                <select value={checkpointId} onChange={(e) => { setCheckpointId(e.target.value); setPage(1); }} className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600">
                    <option value="all">All Checkpoints</option>
                    {checkpoints.map((cp) => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                </select>
                <button onClick={load} className="flex items-center justify-center gap-2 bg-neutral-900 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-neutral-100 text-neutral-600 font-medium border-b border-neutral-200">
                            <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Checkpoint</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Scanned At</th>{canUndo && <th className="px-5 py-3 text-right">Undo</th>}</tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {loading ? (
                                <tr><td colSpan={canUndo ? 6 : 5} className="px-5 py-8 text-center text-neutral-400">Loading scans…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={canUndo ? 6 : 5} className="px-5 py-8 text-center text-neutral-400">No scans yet.</td></tr>
                            ) : paged.map((c) => (
                                <tr key={c.id} className="hover:bg-neutral-50 transition">
                                    <td className="px-5 py-3 font-medium text-neutral-900">{nameOf(c.registrations)}<div className="text-xs font-normal text-neutral-400">{c.registrations?.phone}</div></td>
                                    <td className="px-5 py-3 text-neutral-600">{c.registrations?.categories?.title || "—"}</td>
                                    <td className="px-5 py-3 text-neutral-600">{c.checkpoints?.name || "—"}{c.manual && <span className="ml-2 inline-flex items-center py-0.5 px-1.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title="Checked in manually by staff (not a QR scan)">MANUAL</span>}</td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-bold border ${STATUS_CLASS[c.registrations?.payment_status] || "bg-neutral-100 text-neutral-500 border-neutral-200"}`}>
                                            {STATUS_LABEL[c.registrations?.payment_status] || c.registrations?.payment_status || "—"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-neutral-500">{new Date(c.scanned_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                                    {canUndo && (
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => undo(c)} disabled={undoingId === c.id} className="inline-flex items-center gap-1 px-2 py-1 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50" title="Undo this check-in"><Undo2 className="w-3.5 h-3.5" /> Undo</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-200 bg-neutral-50">
                        <span className="text-sm text-neutral-500">Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-1.5 text-sm font-medium border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition">← Prev</button>
                            <span className="text-sm text-neutral-500">Page {safePage} / {totalPages}</span>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-1.5 text-sm font-medium border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Next →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
