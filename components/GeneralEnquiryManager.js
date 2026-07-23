// components/GeneralEnquiryManager.js
// Settings → General Enquiry. Controls the always-available "Enquire Now" section
// on the homepage — the one that works with no Sevas live, so interest can be
// collected pre-launch. On/off toggle + heading/subtext per language (en/hi/mr).
// Submissions land in the Enquiries pipeline as category-less leads.
"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { DEFAULT_GENERAL_ENQUIRY } from "@/lib/appSettings";

const LANGS = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी (Hindi)" },
    { code: "mr", label: "मराठी (Marathi)" },
];

export default function GeneralEnquiryManager() {
    const [g, setG] = useState(DEFAULT_GENERAL_ENQUIRY);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/app-settings");
                const j = await res.json().catch(() => ({}));
                if (res.ok && j.general_enquiry) setG({ ...DEFAULT_GENERAL_ENQUIRY, ...j.general_enquiry });
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    const setField = (key, code, value) => {
        setG((p) => ({ ...p, [key]: { ...p[key], [code]: value } }));
        setDirty(true); setSavedMsg("");
    };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ general_enquiry: g }),
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
                <h3 className="text-lg font-bold text-neutral-900">General Enquiry (homepage)</h3>
                <p className="text-sm text-neutral-500">A single always-available <span className="font-semibold">“Enquire Now”</span> on the homepage — independent of your Sevas, so you can <span className="font-semibold">collect leads before any Seva is live</span>. Each submission appears in the <span className="font-semibold">Enquiries</span> tab (as a “General enquiry”). Turn it off once your Sevas are live if you no longer need it.</p>
            </div>

            <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${g.enabled ? "bg-white border-neutral-200" : "bg-amber-50 border-amber-300"}`}>
                <div>
                    <p className="text-sm font-bold text-neutral-800">Homepage enquiry {g.enabled ? "shown" : "hidden"}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">When off, the section disappears from the homepage and the endpoint stops accepting submissions.</p>
                </div>
                <button
                    type="button" role="switch" aria-checked={g.enabled}
                    onClick={() => { setG((p) => ({ ...p, enabled: !p.enabled })); setDirty(true); setSavedMsg(""); }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${g.enabled ? "bg-green-600" : "bg-neutral-300"}`}
                >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${g.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
            </div>

            {LANGS.map((l) => (
                <div key={l.code} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{l.label}</p>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Heading</label>
                        <input value={g.title?.[l.code] || ""} onChange={(e) => setField("title", l.code, e.target.value)} placeholder={l.code === "en" ? "Have a question?" : ""} className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Subtext</label>
                        <textarea rows={2} value={g.subtitle?.[l.code] || ""} onChange={(e) => setField("subtitle", l.code, e.target.value)} placeholder={l.code === "en" ? "Leave your details and we'll get back to you." : ""} className={`${inputCls} leading-relaxed`} />
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
