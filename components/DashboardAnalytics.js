// components/DashboardAnalytics.js
// Client-side analytics computed from the already-loaded registrations — daily
// registrations + revenue (14 days), payment conversion, enquiry pipeline, and
// per-tier fill. No chart dependency: simple on-brand CSS/SVG bars.
"use client";

import { useMemo } from "react";
import { TrendingUp, IndianRupee, Users, Percent } from "lucide-react";

const DAYS = 14;
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const shortDay = (key) => { const [, m, d] = key.split("-"); return `${d}/${m}`; };
const HELD = ["completed", "advance_paid"];

function Bars({ series, max, color, fmt }) {
    return (
        <div className="flex items-end gap-1 h-28">
            {series.map((d) => (
                <div key={d.k} className="flex-1 h-full flex flex-col items-center gap-1 group">
                    <div className="w-full flex-1 flex items-end justify-center">
                        <div className={`w-full rounded-t ${color} transition-all group-hover:opacity-80`} style={{ height: `${(d.v / max) * 100}%`, minHeight: d.v > 0 ? "4px" : "0" }} title={`${shortDay(d.k)}: ${fmt(d.v)}`} />
                    </div>
                    <span className="text-[9px] text-neutral-400">{shortDay(d.k).split("/")[0]}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * @param {{ registrations?: any[], categories?: any[] }} props
 */
export default function DashboardAnalytics({ registrations = [], categories = [] }) {
    const a = useMemo(() => {
        // ── daily buckets (last 14 days) ──
        const days = [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (let i = DAYS - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(dayKey(d)); }
        const regByDay = Object.fromEntries(days.map((k) => [k, 0]));
        const revByDay = Object.fromEntries(days.map((k) => [k, 0]));
        for (const r of registrations) {
            const k = dayKey(r.created_at);
            if (k in regByDay) regByDay[k] += 1;
            if (k in revByDay && r.payment_status === "completed") revByDay[k] += Number(r.total_amount || 0);
        }
        const regSeries = days.map((k) => ({ k, v: regByDay[k] }));
        const revSeries = days.map((k) => ({ k, v: revByDay[k] }));

        // ── payment conversion (excludes the enquiry world) ──
        const count = (s) => registrations.filter((r) => r.payment_status === s).length;
        const paid = count("completed");
        const attempts = paid + count("pending") + count("failed") + count("advance_paid") + count("amount_mismatch") + count("payment_review") + count("cheque_received") + count("payment_rejected");
        const conversion = attempts ? Math.round((paid / attempts) * 100) : 0;

        // ── enquiry pipeline ──
        const funnel = [
            { label: "Enquired", n: count("enquired"), cls: "bg-blue-500" },
            { label: "Contacted", n: count("contacted"), cls: "bg-purple-500" },
            { label: "Link sent", n: count("awaiting_payment"), cls: "bg-sky-500" },
            { label: "Closed", n: count("closed"), cls: "bg-neutral-400" },
        ];
        const enquiryTotal = funnel.reduce((s, f) => s + f.n, 0);

        // ── tier fill ──
        const tierFill = categories
            .filter((c) => Number(c.max_capacity) > 0)
            .map((c) => {
                const taken = registrations
                    .filter((r) => r.category_id === c.id && HELD.includes(r.payment_status))
                    .reduce((s, r) => s + (Number(r.attendees_count) || 1), 0);
                return { title: c.title, taken, cap: Number(c.max_capacity), pct: Math.min(100, Math.round((taken / Number(c.max_capacity)) * 100)) };
            })
            .sort((x, y) => y.pct - x.pct);

        return { regSeries, revSeries, conversion, paid, attempts, funnel, enquiryTotal, tierFill };
    }, [registrations, categories]);

    const maxReg = Math.max(1, ...a.regSeries.map((d) => d.v));
    const maxRev = Math.max(1, ...a.revSeries.map((d) => d.v));

    return (
        <div className="space-y-6">
            {/* Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-orange-600" /><h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Registrations · last {DAYS} days</h3></div>
                    <p className="text-xs text-neutral-400 mb-4">Sign-ups created each day (all statuses — paid, pending & partial). Hover a bar for the count.</p>
                    <Bars series={a.regSeries} max={maxReg} color="bg-orange-500" fmt={(v) => `${v} reg`} />
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-green-600" /><h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Revenue (Paid) · last {DAYS} days</h3></div>
                    <p className="text-xs text-neutral-400 mb-4">Money actually collected each day (only fully-paid registrations). Hover a bar for the amount.</p>
                    <Bars series={a.revSeries} max={maxRev} color="bg-green-500" fmt={(v) => `₹${v.toLocaleString("en-IN")}`} />
                </div>
            </div>

            {/* Conversion + enquiry pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1"><Percent className="w-4 h-4 text-neutral-500" /><h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Payment Conversion</h3></div>
                    <p className="text-xs text-neutral-400 mb-4">Share of payment attempts that ended in a full payment (paid ÷ all paid+pending+failed+partial).</p>
                    <div className="flex items-end gap-4">
                        <div className="text-4xl font-black text-neutral-900">{a.conversion}%</div>
                        <div className="text-sm text-neutral-500 pb-1">{a.paid} paid of {a.attempts} attempts</div>
                    </div>
                    <div className="mt-3 h-2.5 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${a.conversion}%` }} /></div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-neutral-500" /><h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Enquiry Pipeline</h3></div>
                    <p className="text-xs text-neutral-400 mb-4">Where enquiry leads sit in the funnel — from first enquiry to closed.</p>
                    {a.enquiryTotal === 0 ? <p className="text-sm text-neutral-400">No enquiries yet.</p> : (
                        <div className="space-y-2">
                            {a.funnel.map((f) => (
                                <div key={f.label} className="flex items-center gap-3">
                                    <span className="text-xs text-neutral-500 w-20 flex-shrink-0">{f.label}</span>
                                    <div className="flex-1 h-4 bg-neutral-100 rounded overflow-hidden"><div className={`h-full ${f.cls} rounded`} style={{ width: `${a.enquiryTotal ? (f.n / a.enquiryTotal) * 100 : 0}%` }} /></div>
                                    <span className="text-xs font-bold text-neutral-700 w-8 text-right">{f.n}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tier fill */}
            {a.tierFill.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-1">Tier Fill (capacity used)</h3>
                    <p className="text-xs text-neutral-400 mb-4">Seats taken vs. capacity per tier (counts paid + partial-paid holds). Red = nearly full.</p>
                    <div className="space-y-3">
                        {a.tierFill.map((t) => (
                            <div key={t.title}>
                                <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-neutral-700">{t.title}</span><span className="text-neutral-500">{t.taken} / {t.cap} ({t.pct}%)</span></div>
                                <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${t.pct >= 90 ? "bg-red-500" : t.pct >= 70 ? "bg-amber-500" : "bg-orange-500"}`} style={{ width: `${t.pct}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
