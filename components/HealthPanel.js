// components/HealthPanel.js
// "0 errors" audit card on the admin dashboard (admin only). Runs the data
// health check + pre-event launch check via /api/admin/health and lists every
// anomaly with severity, plus a readiness checklist with green/red ticks.
"use client";

import { useState } from "react";
import { ShieldCheck, AlertTriangle, XCircle, Info, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const SEV = {
    error: { icon: XCircle, cls: "text-rose-600 bg-rose-50 border-rose-200" },
    warn: { icon: AlertTriangle, cls: "text-amber-600 bg-amber-50 border-amber-200" },
    info: { icon: Info, cls: "text-blue-600 bg-blue-50 border-blue-200" },
};

export default function HealthPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(null); // index of expanded issue
    const [showLaunch, setShowLaunch] = useState(false);

    const run = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/health");
            const d = await res.json().catch(() => null);
            if (res.ok && d) setData(d);
        } catch { /* keep last result */ }
        setLoading(false);
    };

    const errors = data?.issues?.filter((i) => i.severity === "error") || [];
    const warns = data?.issues?.filter((i) => i.severity === "warn") || [];
    const infos = data?.issues?.filter((i) => i.severity === "info") || [];
    const launchFails = data?.launch?.filter((l) => !l.ok) || [];

    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Data Health &amp; Launch Check</h3>
                </div>
                <button onClick={run} disabled={loading} className="flex items-center gap-2 bg-neutral-900 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Checking…" : data ? "Re-run check" : "Run check"}
                </button>
            </div>
            <p className="text-xs text-neutral-400 mb-4">Scans every registration for inconsistencies (wrong amounts, failed deliveries, unsent QRs, oversold tiers) and verifies event readiness (keys, buckets, active event).</p>

            {!data ? (
                <p className="text-sm text-neutral-400">Click “Run check” for a full audit.</p>
            ) : (
                <div className="space-y-4">
                    {/* Summary strip */}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {data.issues.length === 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 font-semibold"><CheckCircle2 className="w-4 h-4" /> No data issues found</span>
                        ) : (
                            <>
                                {errors.length > 0 && <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1 font-semibold"><XCircle className="w-4 h-4" /> {errors.length} error(s)</span>}
                                {warns.length > 0 && <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 font-semibold"><AlertTriangle className="w-4 h-4" /> {warns.length} warning(s)</span>}
                                {infos.length > 0 && <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 font-semibold"><Info className="w-4 h-4" /> {infos.length} to-do(s)</span>}
                            </>
                        )}
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold border ${launchFails.length === 0 ? "text-green-700 bg-green-50 border-green-200" : "text-rose-700 bg-rose-50 border-rose-200"}`}>
                            {launchFails.length === 0 ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} Launch: {data.launch.length - launchFails.length}/{data.launch.length} ready
                        </span>
                    </div>

                    {/* Issues */}
                    {data.issues.map((issue, i) => {
                        const S = SEV[issue.severity] || SEV.info;
                        const Icon = S.icon;
                        const expanded = open === i;
                        return (
                            <div key={i} className={`border rounded-xl px-4 py-3 ${S.cls}`}>
                                <button onClick={() => setOpen(expanded ? null : i)} className="w-full flex items-center justify-between gap-3 text-left">
                                    <span className="flex items-center gap-2 font-semibold text-sm"><Icon className="w-4 h-4 flex-shrink-0" /> {issue.title} <span className="font-black">({issue.count})</span></span>
                                    {expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                                </button>
                                {expanded && (
                                    <div className="mt-2 text-sm">
                                        <p className="opacity-80 mb-1.5">{issue.detail}</p>
                                        <ul className="list-disc ml-5 space-y-0.5">
                                            {issue.examples.map((e, j) => <li key={j}>{e}</li>)}
                                            {issue.count > issue.examples.length && <li className="opacity-70">…and {issue.count - issue.examples.length} more</li>}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Launch checklist */}
                    <div className="border border-neutral-200 rounded-xl">
                        <button onClick={() => setShowLaunch((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-neutral-700">
                            <span>Pre-event readiness checklist</span>
                            {showLaunch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showLaunch && (
                            <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                                {data.launch.map((l, i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                                        {l.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />}
                                        <div><span className="font-semibold text-neutral-800">{l.name}</span><span className="text-neutral-500"> — {l.detail}</span></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-neutral-400">Checked {new Date(data.checkedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
            )}
        </div>
    );
}
