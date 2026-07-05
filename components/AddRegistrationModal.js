// components/AddRegistrationModal.js
// Admin: manually create a registration for a walk-in who never used the public
// form. Price comes from the chosen tier (server-authoritative); the admin only
// fills identity + the payment outcome. Posts to /api/admin/create-registration.
"use client";

import { useState, useMemo } from "react";
import { X, UserPlus } from "lucide-react";
import { toast } from "@/lib/uiStore";
import { ageError, ageLimitLabel } from "@/lib/age";

const LETTERS_ONLY = /^[\p{L}\s.'-]+$/u;
const TODAY_STR = new Date().toISOString().split("T")[0];
const cleanPhone = (v) => String(v || "").replace(/\s+/g, "").replace(/^(\+91|0091|91|0)/, "");

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

    const [pinLoading, setPinLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const cat = payableCats.find((c) => c.id === categoryId);
    const total = cat ? Number(cat.price) + (parseFloat(donation) || 0) : 0;
    const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); if (fieldErrors[k]) setFieldErrors((prev) => ({ ...prev, [k]: undefined })); };
    const errFor = (k) => (fieldErrors[k] ? <p className="text-rose-600 text-xs mt-1">{fieldErrors[k]}</p> : null);

    // Pincode → taluka + state (India Post lookup, same as the public form).
    const handlePincode = async (e) => {
        const value = e.target.value.replace(/\D/g, "").slice(0, 6);
        setF((p) => ({ ...p, pincode: value }));
        if (value.length !== 6) return;
        setPinLoading(true);
        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
            const data = await res.json();
            if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
                const po = data[0].PostOffice[0];
                setF((p) => ({ ...p, taluka: po.Block || po.Name || "", state: po.State || "" }));
            } else {
                toast.error("Invalid pincode — please check it.");
            }
        } catch { /* leave fields for manual entry */ }
        setPinLoading(false);
    };

    // Client-side validation — mirrors the public registration form.
    const validate = () => {
        const e = {};
        if (!categoryId) e.category = "Choose a category.";
        if (!f.firstName.trim()) e.firstName = "First name is required.";
        else if (!LETTERS_ONLY.test(f.firstName.trim())) e.firstName = "Only letters are allowed.";
        if (!f.lastName.trim()) e.lastName = "Last name is required.";
        else if (!LETTERS_ONLY.test(f.lastName.trim())) e.lastName = "Only letters are allowed.";
        if (f.gotra && !LETTERS_ONLY.test(f.gotra.trim())) e.gotra = "Only letters are allowed.";
        if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email address.";
        if (!/^[6-9]\d{9}$/.test(cleanPhone(f.phone))) e.phone = "Enter a valid 10-digit Indian mobile number (starts with 6-9).";
        const pin = String(f.pincode || "").trim();
        if (!pin) e.pincode = "Pincode is required.";
        else if (!/^\d{6}$/.test(pin)) e.pincode = "Enter a valid 6-digit pincode.";
        if (donation !== "" && donation != null && !/^\d+(\.\d{1,2})?$/.test(String(donation))) e.donation = "Numbers only.";
        if (f.dob && f.dob > TODAY_STR) e.dob = "Date of birth cannot be a future date.";
        // Per-tier age restriction (DOB required when the tier limits age).
        if (cat && ageLimitLabel(cat)) {
            if (!f.dob) e.dob = "Date of birth is required for this tier.";
            else { const ae = ageError(cat, f.dob); if (ae) e.dob = ae; }
        }
        if (status === "advance_paid" && !(Number(amountPaid) > 0)) e.amountPaid = "Enter the advance amount received.";
        return e;
    };

    const submit = async () => {
        const errs = validate();
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) { toast.error("Please fix the highlighted fields."); return; }
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
                        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setFieldErrors((p) => ({ ...p, category: undefined })); }} className={input}>
                            <option value="">— Select a tier —</option>
                            {payableCats.map((c) => <option key={c.id} value={c.id}>{c.title} — ₹{Number(c.price).toLocaleString("en-IN")}</option>)}
                        </select>
                        {errFor("category")}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={lbl}>Salutation</label><input className={input} value={f.salutation} onChange={set("salutation")} placeholder="Shri/Smt" /></div>
                        <div><label className={lbl}>First name *</label><input className={input} value={f.firstName} onChange={set("firstName")} />{errFor("firstName")}</div>
                        <div><label className={lbl}>Last name *</label><input className={input} value={f.lastName} onChange={set("lastName")} />{errFor("lastName")}</div>
                        <div><label className={lbl}>Gotra</label><input className={input} value={f.gotra} onChange={set("gotra")} placeholder="Not sure? Use 'Kashyap'" />{errFor("gotra")}</div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={lbl}>Gender</label>
                            <select className={input} value={f.gender} onChange={set("gender")}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select>
                        </div>
                        <div><label className={lbl}>Date of birth{cat && ageLimitLabel(cat) ? " *" : ""}</label><input type="date" max={TODAY_STR} className={input} value={f.dob} onChange={set("dob")} />{cat && ageLimitLabel(cat) && <p className="text-[11px] text-blue-600 mt-1">🎂 {ageLimitLabel(cat)}</p>}{errFor("dob")}</div>
                        <div><label className={lbl}>Phone *</label><input className={input} value={f.phone} onChange={set("phone")} placeholder="10-digit" />{errFor("phone")}</div>
                        <div><label className={lbl}>Email *</label><input className={input} value={f.email} onChange={set("email")} />{errFor("email")}</div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={lbl}>Pincode *</label><input className={input} value={f.pincode} onChange={handlePincode} inputMode="numeric" placeholder="6-digit" />{pinLoading ? <p className="text-[11px] text-neutral-400 mt-1">Looking up…</p> : errFor("pincode")}</div>
                        <div><label className={lbl}>Taluka</label><input className={input} value={f.taluka} onChange={set("taluka")} placeholder="Auto from pincode" /></div>
                        <div><label className={lbl}>State</label><input className={input} value={f.state} onChange={set("state")} placeholder="Auto from pincode" /></div>
                        <div><label className={lbl}>Attendees</label><input type="number" min="1" className={input} value={seats} onChange={(e) => setSeats(e.target.value)} /></div>
                    </div>

                    <div><label className={lbl}>Problem / Samasya</label><input className={input} value={f.problem} onChange={set("problem")} /></div>

                    <div className="border-t border-neutral-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className={lbl}>Donation (₹)</label><input type="number" min="0" inputMode="decimal" className={input} value={donation} onChange={(e) => { setDonation(e.target.value); setFieldErrors((p) => ({ ...p, donation: undefined })); }} placeholder="0" />{errFor("donation")}</div>
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
                                <div><label className={lbl}>Advance received (₹) *</label><input type="number" min="1" className={input} value={amountPaid} onChange={(e) => { setAmountPaid(e.target.value); setFieldErrors((p) => ({ ...p, amountPaid: undefined })); }} />{errFor("amountPaid")}</div>
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
