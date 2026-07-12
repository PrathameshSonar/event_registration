// components/DonationsManager.js
// Settings → Donations. Read-only list of Seva contributions + total raised.
"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Download } from "lucide-react";

const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

export default function DonationsManager() {
    const [data, setData] = useState({ donations: [], total: 0, completedCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(async () => {
            try {
                const res = await fetch("/api/admin/donations");
                const d = await res.json().catch(() => ({}));
                if (res.ok) setData(d);
            } catch { /* ignore */ }
            setLoading(false);
        }, 0);
        return () => clearTimeout(t);
    }, []);

    const exportCsv = () => {
        const completed = data.donations.filter((d) => d.status === "completed");
        const head = ["Name", "Phone", "Email", "Amount", "Message", "Date"];
        // An anonymous donor's name was never stored, so there is nothing to export.
        const rows = completed.map((d) => [d.is_anonymous ? "Anonymous" : (d.name || ""), d.phone || "", d.email || "", d.amount, (d.message || "").replace(/"/g, "'"), fmt(d.created_at)]);
        const csv = [head, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `BaglaBhairav_Seva_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Seva / Donations</h3>
                    <p className="text-sm text-neutral-500">Standalone contributions (separate from ticket registrations).</p>
                </div>
                {data.completedCount > 0 && <button onClick={exportCsv} className="flex items-center gap-2 bg-neutral-900 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"><Download className="w-4 h-4" /> Export CSV</button>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm"><div className="p-3 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-5 h-5" /></div><div><p className="text-xs text-neutral-500">Total Raised</p><p className="text-2xl font-bold">₹{Number(data.total).toLocaleString("en-IN")}</p></div></div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm"><div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><IndianRupee className="w-5 h-5" /></div><div><p className="text-xs text-neutral-500">Contributions</p><p className="text-2xl font-bold">{data.completedCount}</p></div></div>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                        <tr><th className="text-left px-4 py-3">Donor</th><th className="text-left px-4 py-3">Amount</th><th className="text-left px-4 py-3">Message</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">When</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
                        ) : data.donations.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No donations yet.</td></tr>
                        ) : data.donations.map((d) => (
                            <tr key={d.id} className="hover:bg-neutral-50">
                                <td className="px-4 py-2.5">
                                    {d.is_anonymous
                                        ? <span className="font-semibold text-neutral-500 italic">🕶️ Anonymous</span>
                                        : <span className="font-semibold text-neutral-900">{d.name || "—"}</span>}
                                    <span className="block text-xs text-neutral-400">{d.phone}{d.email ? ` · ${d.email}` : ""}</span>
                                </td>
                                <td className="px-4 py-2.5 font-bold text-neutral-900">₹{Number(d.amount).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-neutral-500 text-xs max-w-[200px] truncate">{d.message || "—"}</td>
                                <td className="px-4 py-2.5">
                                    {d.status === "completed"
                                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">Paid</span>
                                        : <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200 capitalize">{d.status}</span>}
                                </td>
                                <td className="px-4 py-2.5 text-neutral-500 text-xs whitespace-nowrap">{fmt(d.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
