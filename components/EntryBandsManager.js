// components/EntryBandsManager.js
// Settings → Entry Checkpoints → "Wristband colours".
// Maps each Seva (category) to a coloured wristband so a gate volunteer hands out
// the right band. The mapping is stored in app_settings.entry_bands and shown large
// on the /entry/<id> scan screen. Deliberately lives ONLY under Checkpoints — it's
// gate operations, not tier configuration, so the Sevas & Tiers editor stays clean.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, BadgeCheck } from "lucide-react";
import { toast } from "@/lib/uiStore";
import { BAND_COLORS, BAND_KEYS } from "@/lib/appSettings";

// `categories` is intentionally not defaulted to [] — a `= []` default makes TS
// infer the prop as never[] and reject the real Category[] from the admin page.
export default function EntryBandsManager({ categories }) {
    const cats = Array.isArray(categories) ? categories : [];
    const [bands, setBands] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/app-settings");
            const d = await res.json().catch(() => ({}));
            if (res.ok) setBands(d.entry_bands || {});
        } catch { /* keep empty */ }
        setLoading(false);
    }, []);

    useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

    const setBand = (categoryId, band) => {
        setBands((p) => {
            const next = { ...p };
            if (band) next[categoryId] = band; else delete next[categoryId];
            return next;
        });
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entry_bands: bands }),
        });
        const d = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { toast.error(d.error || "Could not save."); return; }
        setDirty(false);
        toast.success("Wristband colours saved.");
    };

    if (loading) return <p className="text-neutral-400 text-sm py-6">Loading wristbands…</p>;

    return (
        <div className="mt-10 pt-8 border-t border-neutral-200">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-orange-600" /> Wristband colours
            </h3>
            <p className="text-sm text-neutral-500 mt-1 mb-5">
                Give each Seva a band colour. When a volunteer scans an entry pass, the Seva name and this
                colour show large on screen, so they hand over the right band without guessing.
            </p>

            {cats.length === 0 ? (
                <p className="text-neutral-400 text-sm text-center py-6">No Sevas yet — add tiers first.</p>
            ) : (
                <div className="space-y-2.5">
                    {cats.map((c) => {
                        const band = bands[c.id];
                        const def = band ? BAND_COLORS[band] : null;
                        return (
                            <div key={c.id} className="flex items-center justify-between gap-3 p-3 border border-neutral-200 rounded-xl bg-white flex-wrap">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span
                                        className="w-7 h-7 rounded-full border-2 border-neutral-200 flex-shrink-0"
                                        style={{ backgroundColor: def ? def.hex : "transparent" }}
                                        title={def ? def.label : "No band"}
                                    />
                                    <span className="font-semibold text-neutral-900 truncate">{c.title}</span>
                                </div>
                                <select
                                    value={band || ""}
                                    onChange={(e) => setBand(c.id, e.target.value)}
                                    className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white cursor-pointer focus:outline-none focus:border-orange-600"
                                >
                                    <option value="">— No band —</option>
                                    {BAND_KEYS.map((k) => (
                                        <option key={k} value={k}>{BAND_COLORS[k].label}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center gap-3 mt-5">
                <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}
                >
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save wristbands" : "Saved"}
                </button>
                {dirty && <span className="text-xs text-neutral-400">Unsaved changes</span>}
            </div>
        </div>
    );
}
