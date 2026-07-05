// components/EditRegistrationModal.js
// Admin form to correct a registrant's details (name, contact, address, custom
// fields). Money/status are NOT edited here. PATCHes /api/admin/registrations
// with { id, updates }. Works even on completed registrations.
"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { toast } from "@/lib/uiStore";

const cleanCustomKey = (k) => k.replace(/^custom_/, "").replace(/_[a-z0-9]{5}$/, "").replace(/_/g, " ");

/**
 * @param {{ reg: any, onClose: () => void, onSaved: () => void }} props
 */
export default function EditRegistrationModal({ reg, onClose, onSaved }) {
    const [f, setF] = useState({
        salutation: reg.salutation || "",
        first_name: reg.first_name || "",
        last_name: reg.last_name || "",
        gotra: reg.gotra || "",
        gender: reg.gender || "",
        date_of_birth: reg.date_of_birth || "",
        email: reg.email || "",
        phone: reg.phone || "",
        pincode: reg.pincode || "",
        taluka: reg.taluka || "",
        state: reg.state || "",
        problem_samasya: reg.problem_samasya || "",
        attendees_count: reg.attendees_count || 1,
    });
    const [custom, setCustom] = useState({ ...(reg.custom_fields || {}) });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
    const setC = (k, v) => setCustom((p) => ({ ...p, [k]: v }));

    const save = async () => {
        if (!f.first_name.trim() || !f.last_name.trim()) { toast.error("First and last name are required."); return; }
        if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { toast.error("Enter a valid email."); return; }
        setSaving(true);
        const res = await fetch("/api/admin/registrations", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: reg.id, updates: { ...f, custom_fields: custom } }),
        });
        setSaving(false);
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not save."); return; }
        toast.success("Registrant details updated.");
        onSaved?.();
        onClose?.();
    };

    const input = (label, k, type = "text") => (
        <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">{label}</label>
            <input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                    <h2 className="text-lg font-bold text-neutral-900">Edit Registrant Details</h2>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-600 rounded-full hover:bg-red-50"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {input("Title", "salutation")}
                        {input("First Name", "first_name")}
                        {input("Last Name", "last_name")}
                        {input("Gotra", "gotra")}
                        {input("Gender", "gender")}
                        {input("Date of Birth", "date_of_birth", "date")}
                        {input("Email", "email", "email")}
                        {input("Phone", "phone", "tel")}
                        {input("Pincode", "pincode")}
                        {input("Taluka", "taluka")}
                        {input("State", "state")}
                        {input("Attendees", "attendees_count", "number")}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">Issue / Samasya</label>
                        <textarea value={f.problem_samasya} onChange={(e) => set("problem_samasya", e.target.value)} rows={2} className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                    </div>
                    {Object.keys(custom).length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Additional Fields</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(custom).map(([k, v]) => (
                                    <div key={k}>
                                        <label className="block text-xs font-semibold text-neutral-600 mb-1 capitalize">{cleanCustomKey(k)}</label>
                                        <input value={v ?? ""} onChange={(e) => setC(k, e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 bg-neutral-50 border-t border-neutral-100">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-200 transition">Cancel</button>
                    <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-neutral-900 hover:bg-orange-600 transition disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}</button>
                </div>
            </div>
        </div>
    );
}
