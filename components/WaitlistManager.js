// components/WaitlistManager.js
// Settings → Waitlist. Shows everyone who joined a full tier's waitlist, grouped
// by tier. When a seat frees, "Notify" sends them a registration link (email +
// WhatsApp) and marks them notified. "Remove" drops them from the list.
"use client";

import { Bell, Trash2, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast, confirmDialog } from "@/lib/uiStore";

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); } catch { return "—"; } };
const KEY = ["admin", "waitlist"];

export default function WaitlistManager() {
    const qc = useQueryClient();
    const { data, isLoading: loading } = useQuery({
        queryKey: KEY,
        queryFn: async () => {
            const res = await fetch("/api/admin/waitlist");
            if (!res.ok) throw new Error("Failed to load waitlist.");
            return res.json();
        },
    });
    const rows = Array.isArray(data?.waitlist) ? data.waitlist : [];

    const action = useMutation({
        mutationFn: async ({ id, action }) => {
            const res = await fetch("/api/admin/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || "Action failed.");
            return d;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
        onError: (e) => toast.error(e.message),
    });
    // Which row is mid-action (for the per-row spinner) — from the mutation itself.
    const busyId = action.isPending ? action.variables?.id : null;

    const act = async (row, act) => {
        if (act === "notify" && !(await confirmDialog({ title: "Notify from waitlist", message: `Send ${row.name} a registration link for "${row.categories?.title || "this tier"}"? Do this only when a seat has actually opened.`, confirmLabel: "Notify" }))) return;
        if (act === "remove" && !(await confirmDialog({ title: "Remove", message: `Remove ${row.name} from the waitlist?`, danger: true, confirmLabel: "Remove" }))) return;
        action.mutate({ id: row.id, action: act }, {
            onSuccess: () => toast.success(act === "notify" ? `Notified ${row.name}.` : `Removed ${row.name}.`),
        });
    };

    // group by tier
    const groups = {};
    for (const r of rows) {
        const key = r.categories?.title || "Unknown tier";
        (groups[key] ||= []).push(r);
    }

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-neutral-900">Waitlist</h3>
                <p className="text-sm text-neutral-500">People who joined a full tier’s waitlist. When a seat frees (refund/cancel), notify the next person — they get a registration link by email + WhatsApp.</p>
            </div>

            {loading ? (
                <p className="text-sm text-neutral-400">Loading…</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-6 text-center">No one is on the waitlist yet.</p>
            ) : Object.entries(groups).map(([tier, list]) => (
                <div key={tier} className="border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="bg-neutral-50 px-4 py-2.5 flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-800">{tier}</span>
                        <span className="text-xs text-neutral-500">{list.filter((r) => r.status === "waiting").length} waiting · {list.length} total</span>
                    </div>
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-neutral-100">
                            {list.map((r) => (
                                <tr key={r.id} className="hover:bg-neutral-50">
                                    <td className="px-4 py-2.5">
                                        <span className="font-semibold text-neutral-900">{r.name}</span>
                                        <span className="block text-xs text-neutral-400">{r.phone}{r.email ? ` · ${r.email}` : ""}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-neutral-500 whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{fmt(r.created_at)}</td>
                                    <td className="px-4 py-2.5">
                                        {r.status === "notified"
                                            ? <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Notified</span>
                                            : <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Waiting</span>}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => act(r, "notify")} disabled={busyId === r.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition disabled:opacity-50"><Bell className="w-3.5 h-3.5" /> {r.status === "notified" ? "Notify again" : "Notify"}</button>
                                            <button onClick={() => act(r, "remove")} disabled={busyId === r.id} className="p-1.5 border border-rose-200 rounded-lg text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
