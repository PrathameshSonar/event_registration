// components/DeclarationManager.js
// Settings → Declaration (Samanti Patra). The consent text shown as a blocking
// modal before the register + donate forms. Stored in app_settings.declaration:
// an on/off toggle + title/body per language (en/hi/mr).
"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { DEFAULT_DECLARATION } from "@/lib/appSettings";

const LANGS = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी (Hindi)" },
    { code: "mr", label: "मराठी (Marathi)" },
];

export default function DeclarationManager() {
    const [d, setD] = useState(DEFAULT_DECLARATION);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/app-settings");
                const j = await res.json().catch(() => ({}));
                if (res.ok && j.declaration) setD({ ...DEFAULT_DECLARATION, ...j.declaration });
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    const setField = (key, code, value) => {
        setD((p) => ({ ...p, [key]: { ...p[key], [code]: value } }));
        setDirty(true); setSavedMsg("");
    };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ declaration: d }),
        });
        setSaving(false);
        if (res.ok) { setDirty(false); setSavedMsg("Saved."); }
        else { const j = await res.json().catch(() => ({})); setSavedMsg(j.error || "Save failed."); }
    };

    if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

    const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition";

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h3 className="text-lg font-bold text-neutral-900">Declaration (Samanti Patra)</h3>
                <p className="text-sm text-neutral-500">Shown as a required pop-up before the <span className="font-semibold">registration</span> and <span className="font-semibold">donation</span> forms. The user must scroll to the bottom and accept before they can continue.</p>
            </div>

            <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${d.enabled ? "bg-white border-neutral-200" : "bg-amber-50 border-amber-300"}`}>
                <div>
                    <p className="text-sm font-bold text-neutral-800">Declaration {d.enabled ? "enabled" : "disabled"}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">When off, no declaration is shown and registration/donation proceed directly.</p>
                </div>
                <button
                    type="button" role="switch" aria-checked={d.enabled}
                    onClick={() => { setD((p) => ({ ...p, enabled: !p.enabled })); setDirty(true); setSavedMsg(""); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${d.enabled ? "bg-green-600" : "bg-neutral-300"}`}
                >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${d.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
            </div>

            {LANGS.map((l) => (
                <div key={l.code} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{l.label}</p>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Title</label>
                        <input value={d.title?.[l.code] || ""} onChange={(e) => setField("title", l.code, e.target.value)} placeholder={l.code === "en" ? "Declaration / Samanti Patra" : ""} className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Body</label>
                        <textarea rows={7} value={d.body?.[l.code] || ""} onChange={(e) => setField("body", l.code, e.target.value)} placeholder="Full declaration text — line breaks are preserved." className={`${inputCls} leading-relaxed`} />
                    </div>
                </div>
            ))}

            <div className="flex items-center gap-3">
                <button onClick={save} disabled={!dirty || saving} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}>
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                </button>
                {savedMsg && <span className="text-xs text-neutral-500">{savedMsg}</span>}
            </div>
        </div>
    );
}
