// components/ContactSocialManager.js
// Settings → Contact & Social. The ONE place to manage how devotees reach the
// organisation: phone / WhatsApp, email, address, and the social links. Stored in
// app_settings under the `contact` key — deliberately DECOUPLED from the event
// record (contact details belong to the organisation, not a single event). Powers
// the Contact page, the footer, and the floating WhatsApp button.
"use client";

import { useEffect, useState } from "react";
import { Save, Phone, Mail, MapPin } from "lucide-react";
import { InstagramIcon, YoutubeIcon, FacebookIcon } from "@/components/site/BrandIcons";
import { DEFAULT_CONTACT } from "@/lib/appSettings";

const inputCls = "w-full h-11 pl-10 pr-3 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition";
const iconCls = "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400";

// Defined at module scope so it is a stable component type — a Field declared
// inside the manager would remount on every keystroke and drop input focus.
function Field({ label, Icon, value, onChange, type = "text", placeholder, hint }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">{label}</label>
            <div className="relative"><Icon className={iconCls} /><input type={type} placeholder={placeholder} value={value || ""} onChange={onChange} className={inputCls} /></div>
            {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
        </div>
    );
}

export default function ContactSocialManager() {
    const [c, setC] = useState(DEFAULT_CONTACT);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/app-settings");
                const d = await res.json().catch(() => ({}));
                if (res.ok && d.contact) setC({ ...DEFAULT_CONTACT, ...d.contact });
            } catch { /* ignore */ }
            setLoading(false);
        })();
    }, []);

    const set = (k) => (e) => { setC((p) => ({ ...p, [k]: e.target.value })); setDirty(true); setSavedMsg(""); };

    const save = async () => {
        setSaving(true);
        const res = await fetch("/api/admin/app-settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact: c }),
        });
        setSaving(false);
        if (res.ok) { setDirty(false); setSavedMsg("Saved."); }
        else { const d = await res.json().catch(() => ({})); setSavedMsg(d.error || "Save failed."); }
    };

    if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h3 className="text-lg font-bold text-neutral-900">Contact &amp; Social</h3>
                <p className="text-sm text-neutral-500">One place for every way devotees reach you. Powers the Contact page, the footer and the floating WhatsApp button. Kept separate from the event.</p>
            </div>

            <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Contact</p>
                <Field label="Phone / WhatsApp helpline" Icon={Phone} type="tel" placeholder="9876543210" value={c.phone} onChange={set("phone")} hint="Used for the tel: link and the WhatsApp button (wa.me)." />
                <Field label="Contact email" Icon={Mail} type="email" placeholder="info@example.org" value={c.email} onChange={set("email")} />
                <Field label="Address" Icon={MapPin} placeholder="Temple / venue address shown on the Contact page & footer" value={c.address} onChange={set("address")} />
            </div>

            <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Social links</p>
                <Field label="Instagram" Icon={InstagramIcon} type="url" placeholder="https://instagram.com/..." value={c.instagram_url} onChange={set("instagram_url")} />
                <Field label="Facebook" Icon={FacebookIcon} type="url" placeholder="https://facebook.com/..." value={c.facebook_url} onChange={set("facebook_url")} />
                <Field label="YouTube" Icon={YoutubeIcon} type="url" placeholder="https://youtube.com/@..." value={c.youtube_url} onChange={set("youtube_url")} />
            </div>

            <div className="flex items-center gap-3">
                <button onClick={save} disabled={!dirty || saving} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${dirty ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"}`}>
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                </button>
                {savedMsg && <span className="text-xs text-neutral-500">{savedMsg}</span>}
            </div>
        </div>
    );
}
