// components/PaymentSettingsManager.js
// Admin editor for the global offline-payment details (bank / UPI / cheque payee
// + which offline methods are enabled). Shown to users on the register page when
// they pick an offline payment method.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Banknote } from "lucide-react";
import { toast } from "@/lib/uiStore";

const METHODS = [
    { key: "bank_transfer", label: "Bank Transfer (NEFT/RTGS/UPI)" },
    { key: "cheque", label: "Cheque" },
    { key: "cash", label: "Cash" },
    { key: "dd", label: "Demand Draft" },
];

export default function PaymentSettingsManager() {
    const [s, setS] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/admin/app-settings");
        const data = await res.json().catch(() => ({}));
        setS(res.ok ? data.bank_details : null);
        setLoading(false);
    }, []);
    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

    const set = (k, v) => setS((prev) => ({ ...prev, [k]: v }));
    const toggleMethod = (m) => setS((prev) => {
        const cur = Array.isArray(prev.methods) ? prev.methods : [];
        return { ...prev, methods: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] };
    });

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bank_details: s }),
        });
        setSaving(false);
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Save failed."); return; }
        toast.success("Payment details saved.");
        setSavedMsg("Saved!"); setTimeout(() => setSavedMsg(""), 2000);
    };

    if (loading || !s) return <p className="text-sm text-neutral-400 p-2">Loading…</p>;

    const field = (k, label, placeholder = "") => (
        <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">{label}</label>
            <input value={s[k] || ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
        </div>
    );

    return (
        <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-neutral-500" />
                <h3 className="text-lg font-bold text-neutral-900">Offline Payment Details</h3>
            </div>

            <label className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={!!s.offline_enabled} onChange={(e) => set("offline_enabled", e.target.checked)} className="w-5 h-5 text-orange-600 rounded border-neutral-300" />
                <span className="text-sm font-semibold text-neutral-800">Enable offline payments (Bank / Cheque / Cash) on the registration form</span>
            </label>

            <div>
                <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Enabled methods</p>
                <div className="flex flex-wrap gap-2">
                    {METHODS.map((m) => {
                        const on = Array.isArray(s.methods) && s.methods.includes(m.key);
                        return (
                            <button key={m.key} type="button" onClick={() => toggleMethod(m.key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${on ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-600 border-neutral-200"}`}>
                                {m.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("account_name", "Account Name", "BaglaBhairav Trust")}
                {field("account_number", "Account Number")}
                {field("ifsc", "IFSC Code")}
                {field("bank", "Bank Name")}
                {field("upi_id", "UPI ID", "name@bank")}
                {field("cheque_payee", "Cheque Payee Name")}
            </div>
            <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Instructions (shown to users)</label>
                <textarea value={s.instructions || ""} onChange={(e) => set("instructions", e.target.value)} rows={3}
                    placeholder="e.g. After transferring, upload the screenshot and enter the UTR. For cash, visit our office at…"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
            </div>

            <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
                </button>
                {savedMsg && <span className="text-sm font-semibold text-green-600">{savedMsg}</span>}
            </div>
        </div>
    );
}
