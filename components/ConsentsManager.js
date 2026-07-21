// components/ConsentsManager.js
// Settings → Consent Records. Read-only log of every Samanti Patra acceptance
// (registration / donation / enquiry). Admins can search, export CSV, and print a
// per-person consent document (name + date/time + the exact declaration accepted).
"use client";

import { useState } from "react";
import { Download, Printer, RefreshCw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };
const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const KIND_LABEL = { registration: "Registration", donation: "Donation", enquiry: "Enquiry" };

export default function ConsentsManager() {
    const [q, setQ] = useState("");          // the search input
    const [search, setSearch] = useState(""); // the submitted query (what's fetched)

    const { data, isLoading: loading, isFetching, refetch } = useQuery({
        queryKey: ["admin", "consents", search],
        queryFn: async () => {
            const res = await fetch(`/api/admin/consents${search ? `?q=${encodeURIComponent(search)}` : ""}`);
            if (!res.ok) throw new Error("Failed to load consent records.");
            return res.json();
        },
    });
    const rows = data?.consents || [];

    const exportCsv = () => {
        const head = ["Name", "Phone", "Email", "Type", "Accepted at", "IP"];
        const body = rows.map((r) => [r.name || (r.kind === "donation" ? "Anonymous" : ""), r.phone || "", r.email || "", KIND_LABEL[r.kind] || r.kind, fmt(r.accepted_at), r.ip || ""]);
        const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, "'")}"`).join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `consents_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    };

    const printOne = (r) => {
        const w = window.open("", "_blank", "width=800,height=900");
        if (!w) return;
        w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Consent — ${esc(r.name || "Devotee")}</title>
        <style>
          body{font-family:Georgia,'Times New Roman',serif;color:#1f2937;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.7}
          h1{font-size:22px;margin:0 0 4px;color:#7c2d12}
          .meta{font-size:13px;color:#555;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:18px 0}
          .meta b{color:#111}
          .body{white-space:pre-wrap;font-size:15px;margin-top:18px;border-top:1px solid #e5e7eb;padding-top:18px}
          .sig{margin-top:36px;font-size:13px;color:#374151}
          @media print{body{margin:0}}
        </style></head><body>
          <h1>${esc(r.declaration_title || "Declaration / Samanti Patra")}</h1>
          <div class="meta">
            <div><b>Name:</b> ${esc(r.name || (r.kind === "donation" ? "Anonymous" : "—"))}</div>
            <div><b>Date of birth:</b> ${esc(r.dob || "—")}</div>
            <div><b>Phone:</b> ${esc(r.phone || "—")} &nbsp; <b>Email:</b> ${esc(r.email || "—")}</div>
            <div><b>Type:</b> ${esc(KIND_LABEL[r.kind] || r.kind)}</div>
            <div><b>Accepted on:</b> ${esc(fmt(r.accepted_at))} &nbsp; <b>IP:</b> ${esc(r.ip || "—")}</div>
          </div>
          <div class="body">${esc(r.declaration_body || "")}</div>
          <div class="sig">Electronically accepted by the above person on the date and time shown. This document is a record of that acceptance.</div>
          <script>window.onload=function(){window.print()}</script>
        </body></html>`);
        w.document.close();
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Consent Records</h3>
                    <p className="text-sm text-neutral-500">Every Samanti Patra acceptance (registration / donation / enquiry), with who, when, and the exact text agreed to.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => (search === q ? refetch() : setSearch(q))} className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"><RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>
                    {rows.length > 0 && <button onClick={exportCsv} className="flex items-center gap-2 bg-neutral-900 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"><Download className="w-4 h-4" /> Export CSV</button>}
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setSearch(q)} placeholder="Search name / phone / email…" className="w-full h-10 pl-9 pr-3 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white" />
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                        <tr><th className="text-left px-4 py-3">Person</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Accepted</th><th className="text-right px-4 py-3">Document</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No consent records yet.</td></tr>
                        ) : rows.map((r) => (
                            <tr key={r.id} className="hover:bg-neutral-50">
                                <td className="px-4 py-2.5">
                                    <span className="font-semibold text-neutral-900">{r.name || (r.kind === "donation" ? "Anonymous" : "—")}</span>
                                    <span className="block text-xs text-neutral-400">{r.phone}{r.email ? ` · ${r.email}` : ""}</span>
                                </td>
                                <td className="px-4 py-2.5"><span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">{KIND_LABEL[r.kind] || r.kind}</span></td>
                                <td className="px-4 py-2.5 text-neutral-500 text-xs whitespace-nowrap">{fmt(r.accepted_at)}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <button onClick={() => printOne(r)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"><Printer className="w-4 h-4" /> Print</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
