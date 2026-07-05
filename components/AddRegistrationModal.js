// components/AddRegistrationModal.js
// Admin: manually create a registration for a walk-in who never used the public
// form. Price comes from the chosen tier (server-authoritative); the admin only
// fills identity + the payment outcome. Posts to /api/admin/create-registration.
"use client";

import { useState, useMemo } from "react";
import { X, UserPlus } from "lucide-react";
import { toast } from "@/lib/uiStore";

const METHODS = [
    { v: "cash", label: "Cash" },
    { v: "bank_transfer", label: "Bank transfer" },
    { v: "cheque", label: "Cheque" },
    { v: "dd", label: "Demand draft" },
];

/**
 * @param {{ categories?: any[], onClose: () => void, onCreated: () => void }} props
 */
export default function AddRegistrationModal({ categories = [], onClose, onCreated }) {
    const payableCats = useMemo(() => categories.filter((c) => !c.is_enquiry_only), [categories]);
    const [categoryId, setCategoryId] = useState("");
    const [f, setF] = useState({ salutation: "", firstName: "", lastName: "", gotra: "", gender: "", dob: "", email: "", phone: "", pincode: "", taluka: "", state: "", problem: "" });
    const [seats, setSeats] = useState("1");
    const [donation, setDonation] = useState("");
    const [status, setStatus] = useState("completed");
    const [method, setMethod] = useState("cash");
    const [reference, setReference] = useState("");
    const [amountPaid, setAmountPaid] = useState("");
    const [saving, setSaving] = useState(false);

    const cat = payableCats.find((c) => c.id === categoryId);
    const total = cat ? Number(cat.price) + (parseFloat(donation) || 0) : 0;
    const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

    const submit = async () => {
        if (!categoryId) { toast.error("Choose a category."); return; }
        if (!f.firstName.trim() || !f.lastName.trim()) { toast.error("First and last name are required."); return; }
        if (!/^\S+@\S+\.\S+$/.test(f.email)) { toast.error("Enter a valid email."); return; }
        setSaving(true);
        const res = await fetch("/api/admin/create-registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                categoryId, attendee: f, attendeesCount: Number(seats) || 1, donation: parseFloat(donation) || 0,
                status, method, reference, amountPaid: status === "advance_paid" ? Number(amountPaid) : undefined,
            }),
        });
        const data = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { toast.error(data.error || "Could not create the registration."); return; }
        toast.success(status === "completed" ? "Registration created & marked Paid — ticket sent." : status === "advance_paid" ? "Registration created as Advance-Paid." : "Registration created as Pending.");
        onCreated();
    };

    const input = "w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none";
    const lbl = "text-xs font-semibold text-neutral-500 mb-1 block";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-orange-600" /> Add Registration</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className={lbl}>Category *</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
                            <option value="">— Select a tier —</option>
                            {payableCats.map((c) => <option key={c.id} value={c.id}>{c.title} — ₹{Number(c.price).toLocaleString("en-IN")}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={lbl}>Salutation</label><input className={input} value={f.salutation} onChange={set("salutation")} placeholder="Shri/Smt" /></div>
                        <div><label className={lbl}>First name *</label><input className={input} value={f.firstName} onChange={set("firstName")} /></div>
                        <div><label className={lbl}>Last name *</label><input className={input} value={f.lastName} onChange={set("lastName")} /></div>
                        <div><label className={lbl}>Gotra</label><input className={input} value={f.gotra} onChange={set("gotra")} placeholder="Kashyap" /></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={lbl}>Gender</label>
                            <select className={input} value={f.gender} onChange={set("gender")}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select>
                        </div>
                        <div><label className={lbl}>Date of birth</label><input type="date" className={input} value={f.dob} onChange={set("dob")} /></div>
                        <div><label className={lbl}>Phone *</label><input className={input} value={f.phone} onChange={set("phone")} placeholder="10-digit" /></div>
                        <div><label className={lbl}>Email *</label><input className={input} value={f.email} onChange={set("email")} /></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={lbl}>Pincode</label><input className={input} value={f.pincode} onChange={set("pincode")} placeholder="6-digit" /></div>
                        <div><label className={lbl}>Taluka</label><input className={input} value={f.taluka} onChange={set("taluka")} /></div>
                        <div><label className={lbl}>State</label><input className={input} value={f.state} onChange={set("state")} /></div>
                        <div><label className={lbl}>Attendees</label><input type="number" min="1" className={input} value={seats} onChange={(e) => setSeats(e.target.value)} /></div>
                    </div>

                    <div><label className={lbl}>Problem / Samasya</label><input className={input} value={f.problem} onChange={set("problem")} /></div>

                    <div className="border-t border-neutral-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className={lbl}>Donation (₹)</label><input type="number" min="0" className={input} value={donation} onChange={(e) => setDonation(e.target.value)} placeholder="0" /></div>
                        <div><label className={lbl}>Payment outcome</label>
                            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="completed">Paid (full)</option>
                                <option value="advance_paid">Advance paid (partial)</option>
                                <option value="pending">Pending (record only)</option>
                            </select>
                        </div>
                        {status !== "pending" && (
                            <div><label className={lbl}>Method</label>
                                <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
                                    {METHODS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {status !== "pending" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label className={lbl}>Reference (UTR / cheque no / receipt)</label><input className={input} value={reference} onChange={(e) => setReference(e.target.value)} /></div>
                            {status === "advance_paid" && (
                                <div><label className={lbl}>Advance received (₹) *</label><input type="number" min="1" className={input} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} /></div>
                            )}
                        </div>
                    )}

                    {cat && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 text-sm text-neutral-700 flex items-center justify-between">
                            <span>Tier ₹{Number(cat.price).toLocaleString("en-IN")}{donation ? ` + donation ₹${(parseFloat(donation) || 0).toLocaleString("en-IN")}` : ""}</span>
                            <span className="font-bold">Total ₹{total.toLocaleString("en-IN")}{status === "advance_paid" && amountPaid ? ` · balance ₹${Math.max(0, total - (Number(amountPaid) || 0)).toLocaleString("en-IN")}` : ""}</span>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Cancel</button>
                    <button onClick={submit} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"><UserPlus className="w-4 h-4" /> {saving ? "Creating…" : "Create registration"}</button>
                </div>
            </div>
        </div>
    );
}
