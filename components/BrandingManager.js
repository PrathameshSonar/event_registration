// components/BrandingManager.js
// Settings → Branding & SEO.
//
// Branding: site name, logo, and two colours. The colours are not decorative — the
// whole orange/gold Tailwind scale is mapped onto CSS variables (see globals.css +
// lib/branding.js), so picking a brand colour re-themes every button, badge, link
// and tint on the site. The server derives a full 50→900 ramp from the one colour
// you choose, so the palette stays coherent rather than leaving pale orange tints
// around a blue button.
//
// SEO: the site-wide title / description / link-preview image. The HOMEPAGE still
// prefers the active event's own title, description and hero image — these are the
// fallbacks and what every other page uses.
"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Palette, Search, RotateCcw, Image as ImageIcon } from "lucide-react";
import { toast } from "@/lib/uiStore";
import MediaPicker from "@/components/MediaPicker";
import { DEFAULT_BRANDING, DEFAULT_SEO } from "@/lib/appSettings";

export default function BrandingManager() {
    const [branding, setBranding] = useState(DEFAULT_BRANDING);
    const [seo, setSeo] = useState(DEFAULT_SEO);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/app-settings");
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
                setBranding({ ...DEFAULT_BRANDING, ...(d.branding || {}) });
                setSeo({ ...DEFAULT_SEO, ...(d.seo || {}) });
            }
        } catch { /* keep defaults */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    const setB = (k, v) => { setBranding((p) => ({ ...p, [k]: v })); setDirty(true); };
    const setS = (k, v) => { setSeo((p) => ({ ...p, [k]: v })); setDirty(true); };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branding, seo }),
        });
        const d = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { toast.error(d.error || "Could not save."); return; }
        setDirty(false);
        // The route busts the cached branding/seo tags, so the public site picks
        // this up on its next render rather than waiting out the 1h cache.
        toast.success("Saved — the public site will show the new branding on its next load.");
    };

    const resetColors = () => {
        setB("primary_color", DEFAULT_BRANDING.primary_color);
        setBranding((p) => ({ ...p, accent_color: DEFAULT_BRANDING.accent_color }));
        setDirty(true);
    };

    const input = "w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600";

    if (loading) return <p className="text-neutral-400 text-sm py-8">Loading…</p>;

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-1 text-neutral-900">Branding &amp; SEO</h2>
                <p className="text-sm text-neutral-500">How the site looks, and how it appears when someone shares a link.</p>
            </div>

            {/* ── Branding ─────────────────────────────────────────────────── */}
            <section className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 flex items-center gap-2"><Palette className="w-4 h-4" /> Branding</h3>

                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">Site name</label>
                    <input className={input} value={branding.site_name} onChange={(e) => setB("site_name", e.target.value)} placeholder="BaglaBhairav" />
                    <p className="text-xs text-neutral-400 mt-1">Shown in the header (when there&rsquo;s no logo), the footer, and link previews.</p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Logo</label>
                    <div className="flex gap-2">
                        <input className={input} value={branding.logo_url} onChange={(e) => setB("logo_url", e.target.value)} placeholder="https://… or pick from the library →" />
                        <MediaPicker onSelected={(url) => setB("logo_url", url)} label="Library" />
                    </div>
                    {branding.logo_url ? (
                        <div className="mt-2 flex items-center gap-3">
                            <div className="bg-white border border-neutral-200 rounded-lg p-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={branding.logo_url} alt="logo preview" className="h-10 w-auto object-contain" />
                            </div>
                            <button onClick={() => setB("logo_url", "")} className="text-xs font-semibold text-neutral-500 hover:text-red-600 transition">Clear</button>
                        </div>
                    ) : (
                        <p className="text-xs text-neutral-400 mt-1">Optional. With no logo, the site name is shown as a wordmark. A transparent PNG works best.</p>
                    )}
                </div>

                <div className="pt-2 border-t border-neutral-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-neutral-600">Colours</span>
                        <button onClick={resetColors} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-orange-600 transition">
                            <RotateCcw className="w-3 h-3" /> Reset to default
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Brand colour</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={branding.primary_color} onChange={(e) => setB("primary_color", e.target.value)} className="w-11 h-10 rounded-lg border border-neutral-200 cursor-pointer bg-white p-1" />
                                <input className={input} value={branding.primary_color} onChange={(e) => setB("primary_color", e.target.value)} placeholder="#ea580c" />
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">Buttons, links, badges and every tint derived from them.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-600 mb-1">Accent colour</label>
                            <div className="flex gap-2 items-center">
                                <input type="color" value={branding.accent_color} onChange={(e) => setB("accent_color", e.target.value)} className="w-11 h-10 rounded-lg border border-neutral-200 cursor-pointer bg-white p-1" />
                                <input className={input} value={branding.accent_color} onChange={(e) => setB("accent_color", e.target.value)} placeholder="#d4a017" />
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">Dividers and ornamental details (the gold trim).</p>
                        </div>
                    </div>

                    <div className="mt-4 bg-white border border-neutral-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-neutral-500 mb-2">Preview</p>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: branding.primary_color }}>Register Now</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ color: branding.primary_color, borderColor: branding.primary_color, background: `${branding.primary_color}14` }}>Seats left</span>
                            <span className="h-1 w-16 rounded-full" style={{ background: branding.accent_color }} />
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-3">
                            The server builds a full light-to-dark shade range from your brand colour, so backgrounds, borders and hover states all stay in the same family.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── SEO ──────────────────────────────────────────────────────── */}
            <section className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 flex items-center gap-2"><Search className="w-4 h-4" /> SEO &amp; link previews</h3>
                <p className="text-xs text-neutral-500 -mt-2">
                    The homepage still prefers the <strong>active event&rsquo;s</strong> own title, description and hero image. These are the fallbacks, and what every other page uses.
                </p>

                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">Site title</label>
                    <input className={input} value={seo.site_title} onChange={(e) => setS("site_title", e.target.value)} />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">Description</label>
                    <textarea className={`${input} resize-none`} rows={3} value={seo.description} onChange={(e) => setS("description", e.target.value)} />
                    <p className="text-xs text-neutral-400 mt-1">{String(seo.description || "").length}/300 — this is the grey text under your link on Google and WhatsApp.</p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">Link preview image (Open Graph)</label>
                    <div className="flex gap-2">
                        <input className={input} value={seo.og_image} onChange={(e) => setS("og_image", e.target.value)} placeholder="https://… or pick from the library →" />
                        <MediaPicker onSelected={(url) => setS("og_image", url)} label="Library" />
                    </div>
                    {seo.og_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={seo.og_image} alt="preview" className="mt-2 w-full max-w-sm rounded-lg border border-neutral-200 object-cover" style={{ aspectRatio: "1200 / 630" }} />
                    ) : (
                        <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Not set. The code falls back to <code>/og-image.jpg</code>, which doesn&rsquo;t exist in this project — so a shared link currently shows no image unless the active event has a hero image. Upload a 1200×630 image here to fix it.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">Keywords (optional)</label>
                    <input className={input} value={seo.keywords} onChange={(e) => setS("keywords", e.target.value)} placeholder="mahotsav, festival, nashik" />
                    <p className="text-xs text-neutral-400 mt-1">Comma-separated. Google largely ignores these now — safe to leave empty.</p>
                </div>
            </section>

            <div className="flex items-center gap-3">
                <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}
                >
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                </button>
                {dirty && <span className="text-xs text-neutral-400">Unsaved changes</span>}
            </div>
        </div>
    );
}
