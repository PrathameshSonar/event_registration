// components/SevaCategoriesManager.js
// Settings → Seva Categories. The pickable Seva cards shown on the public /donate
// page (Annadaan, Deep Daan, Kunda sponsorship…), each with a suggested amount.
// Stored in app_settings.seva_categories. Empty list = donate page uses plain
// amount presets.
"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, GripVertical } from "lucide-react";

const blank = () => ({ icon: "🪔", title: "", desc: "", amount: 1100 });

export default function SevaCategoriesManager() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/app-settings");
                const d = await res.json().catch(() => ({}));
                if (res.ok && Array.isArray(d.seva_categories)) setRows(d.seva_categories);
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    const update = (i, k, v) => { setRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r)); setDirty(true); setSavedMsg(""); };
    const add = () => { setRows((p) => [...p, blank()]); setDirty(true); setSavedMsg(""); };
    const remove = (i) => { setRows((p) => p.filter((_, idx) => idx !== i)); setDirty(true); setSavedMsg(""); };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seva_categories: rows }),
        });
        setSaving(false);
        if (res.ok) { setDirty(false); setSavedMsg("Saved."); }
        else { const d = await res.json().catch(() => ({})); setSavedMsg(d.error || "Save failed."); }
    };

    const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition";

    if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

    return (
        <div className="max-w-3xl space-y-5">
            <div>
                <h3 className="text-lg font-bold text-neutral-900">Seva Categories</h3>
                <p className="text-sm text-neutral-500">Pickable Seva cards on the public <span className="font-semibold">/donate</span> page — each with a suggested amount. Leave empty to show only plain amount presets.</p>
            </div>

            <div className="space-y-3">
                {rows.length === 0 && <div className="border border-dashed border-neutral-300 rounded-xl p-8 text-center text-neutral-400 text-sm">No Seva categories yet — the donate page shows amount presets only.</div>}
                {rows.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white border border-neutral-200 rounded-xl p-3">
                        <GripVertical className="w-4 h-4 text-neutral-300 mt-2.5 shrink-0" />
                        <input value={r.icon || ""} onChange={(e) => update(i, "icon", e.target.value)} placeholder="🪔" className={`${inputCls} w-14 text-center text-lg`} maxLength={2} />
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1.2fr_2fr_1fr] gap-2">
                            <input value={r.title || ""} onChange={(e) => update(i, "title", e.target.value)} placeholder="Annadaan" className={inputCls} />
                            <input value={r.desc || ""} onChange={(e) => update(i, "desc", e.target.value)} placeholder="Sponsor a day of meals for devotees" className={inputCls} />
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                                <input value={r.amount ?? ""} onChange={(e) => update(i, "amount", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="1100" className={`${inputCls} pl-6`} />
                            </div>
                        </div>
                        <button onClick={() => remove(i)} className="p-2 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <button onClick={add} className="flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"><Plus className="w-4 h-4" /> Add Seva</button>
                <div className="flex-1" />
                <button onClick={save} disabled={!dirty || saving} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}>
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                </button>
                {savedMsg && <span className="text-xs text-neutral-500">{savedMsg}</span>}
            </div>
        </div>
    );
}
