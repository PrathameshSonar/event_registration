// components/PageHeadersManager.js
// Settings → Page Headers. Sets the hero image + kicker/title/subtitle for each
// public page (about, event, gallery, live, news, faq, contact, registration).
// Stored in the `page_heroes` app_settings key via /api/admin/app-settings.
"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import { toast } from "@/lib/uiStore";
import { PAGE_HERO_KEYS, DEFAULT_PAGE_HEROES } from "@/lib/appSettings";

const PAGE_LABELS = {
  about: "About", event: "Event Details", registration: "Registration",
  gallery: "Gallery", live: "Live Stream", news: "News", faq: "FAQ", contact: "Contact",
};

export default function PageHeadersManager() {
  const [heroes, setHeroes] = useState(DEFAULT_PAGE_HEROES);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/app-settings")
      .then((r) => r.json())
      .then((d) => { if (d.page_heroes) setHeroes({ ...DEFAULT_PAGE_HEROES, ...d.page_heroes }); })
      .catch(() => {});
  }, []);

  const setField = (page, field, v) => {
    setHeroes((p) => ({ ...p, [page]: { ...p[page], [field]: v } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/app-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_heroes: heroes }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Could not save page headers."); return; }
    setDirty(false);
    toast.success("Page headers saved.");
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition";

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-2 border-b border-neutral-200 pb-4 text-neutral-900">Page Headers</h2>
      <p className="text-sm text-neutral-500 mb-6">Each public page opens with a full-bleed hero. Set its background image and copy here. Leave a field blank to use the built-in default. Images should be wide (e.g. 1600×900).</p>

      <div className="space-y-5">
        {PAGE_HERO_KEYS.map((page) => {
          const h = heroes[page] || {};
          return (
            <div key={page} className="border border-neutral-200 rounded-xl p-5 bg-white shadow-sm">
              <h3 className="font-bold text-neutral-900 mb-3">{PAGE_LABELS[page] || page} <span className="text-xs font-normal text-neutral-400">/{page === "event" ? "event" : page}</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Hero image</label>
                  <div className="flex gap-2 items-start">
                    {h.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.image} alt="" className="w-24 h-14 object-cover rounded-lg border border-neutral-200 flex-shrink-0" />
                    )}
                    <input type="url" value={h.image || ""} onChange={(e) => setField(page, "image", e.target.value)} placeholder="https://… or pick →" className={`${inputCls} flex-1`} />
                    <MediaPicker onSelected={(url) => setField(page, "image", url)} />
                    {h.image && <button type="button" onClick={() => setField(page, "image", "")} className="px-3 py-2 text-sm font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition">Clear</button>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Kicker</label>
                  <input type="text" value={h.kicker || ""} onChange={(e) => setField(page, "kicker", e.target.value)} placeholder="e.g. Our Sanctum" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Title</label>
                  <input type="text" value={h.title || ""} onChange={(e) => setField(page, "title", e.target.value)} placeholder="Page title" className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Subtitle</label>
                  <input type="text" value={h.subtitle || ""} onChange={(e) => setField(page, "subtitle", e.target.value)} placeholder="One-line intro shown under the title" className={inputCls} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end sticky bottom-4">
        <button onClick={save} disabled={!dirty || saving} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}>
          <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save Page Headers" : "Saved"}
        </button>
      </div>
    </div>
  );
}
