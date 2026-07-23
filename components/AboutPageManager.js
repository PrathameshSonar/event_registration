// components/AboutPageManager.js
// Settings → About Us Page. Two rich sections on the public /about page: one about
// the Pitham / temple, one about Guruji. Each has a heading + body per language
// (en/hi/mr) and one image. Stored in app_settings.about_page. An empty section
// simply doesn't render on the site. (The "Official Website" nav button lives in
// Settings → Contact & Social.)
"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { DEFAULT_ABOUT_PAGE } from "@/lib/appSettings";
import MediaPicker from "@/components/MediaPicker";

const LANGS = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी (Hindi)" },
    { code: "mr", label: "मराठी (Marathi)" },
];

const SECTIONS = [
    { key: "pitham", label: "Pitham / Temple", titlePh: "About the Pitham" },
];

export default function AboutPageManager() {
    const [a, setA] = useState(DEFAULT_ABOUT_PAGE);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/app-settings");
                const j = await res.json().catch(() => ({}));
                if (res.ok && j.about_page) setA({ ...DEFAULT_ABOUT_PAGE, ...j.about_page });
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    const setLangField = (sec, key, code, value) => {
        setA((p) => ({ ...p, [sec]: { ...p[sec], [key]: { ...p[sec][key], [code]: value } } }));
        setDirty(true); setSavedMsg("");
    };
    const setImage = (sec, value) => {
        setA((p) => ({ ...p, [sec]: { ...p[sec], image_url: value } }));
        setDirty(true); setSavedMsg("");
    };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ about_page: a }),
        });
        setSaving(false);
        if (res.ok) { setDirty(false); setSavedMsg("Saved."); }
        else { const j = await res.json().catch(() => ({})); setSavedMsg(j.error || "Save failed."); }
    };

    if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

    const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition";

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h3 className="text-lg font-bold text-neutral-900">About Us Page</h3>
                <p className="text-sm text-neutral-500">A <span className="font-semibold">Pitham / temple</span> section shown on the public <span className="font-semibold">About Us</span> page. Leave it blank to hide it. (Guruji is covered by the featured guest in <span className="font-semibold">Home Page Content</span>.) The <span className="font-semibold">Official Website</span> button is set in <span className="font-semibold">Contact &amp; Social</span>.</p>
            </div>

            {SECTIONS.map((sec) => (
                <div key={sec.key} className="rounded-2xl border border-neutral-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">{sec.label}</h4>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Image</label>
                        <div className="flex items-center gap-3">
                            {a[sec.key]?.image_url
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={a[sec.key].image_url} alt="" className="h-16 w-24 rounded-lg object-cover border border-neutral-200" />
                                : <div className="h-16 w-24 rounded-lg bg-neutral-100 border border-dashed border-neutral-300" />}
                            <MediaPicker onSelected={(url) => setImage(sec.key, url)} label="Choose / upload" />
                            {a[sec.key]?.image_url && (
                                <button type="button" onClick={() => setImage(sec.key, "")} className="text-xs text-rose-600 hover:underline">Remove</button>
                            )}
                        </div>
                    </div>

                    {LANGS.map((l) => (
                        <div key={l.code} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-3 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{l.label}</p>
                            <input
                                value={a[sec.key]?.title?.[l.code] || ""}
                                onChange={(e) => setLangField(sec.key, "title", l.code, e.target.value)}
                                placeholder={l.code === "en" ? sec.titlePh : ""}
                                className={inputCls}
                            />
                            <textarea
                                rows={4}
                                value={a[sec.key]?.body?.[l.code] || ""}
                                onChange={(e) => setLangField(sec.key, "body", l.code, e.target.value)}
                                placeholder={l.code === "en" ? "Write about this section… (line breaks are preserved)" : ""}
                                className={`${inputCls} leading-relaxed`}
                            />
                        </div>
                    ))}
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
