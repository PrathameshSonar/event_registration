// components/EnquiriesPanel.js
// Enquiry leads pipeline (separate from the paid registrations ledger).
// Stages: New (enquired) → Contacted → Payment Link Sent (awaiting_payment) → Paid,
// with a Closed/Lost exit. Admins log a running history of contact notes, request
// payment at the tier's fixed price, and sync/close leads. Receives the already-
// fetched registrations from the admin page and calls onChanged() to refresh.
"use client";

import { useState, useCallback } from "react";
import { RefreshCw, IndianRupee, MessageSquarePlus, X, Copy, Check, Ban, Undo2 } from "lucide-react";
import { toast, confirmDialog, promptDialog } from "@/lib/uiStore";

const SECTIONS = [
    { key: "enquired", label: "🆕 New" },
    { key: "contacted", label: "📞 Contacted" },
    { key: "awaiting_payment", label: "⌛ Payment Link Sent" },
    { key: "closed", label: "⊘ Closed/Lost" },
    { key: "all", label: "All Open" },
];

const STATUS_LABEL = {
    enquired: "🆕 New",
    contacted: "📞 Contacted",
    awaiting_payment: "⌛ Payment Link Sent",
    closed: "⊘ Closed/Lost",
};
const STATUS_CLASS = {
    enquired: "bg-blue-100 text-blue-700 border-blue-200",
    contacted: "bg-purple-100 text-purple-700 border-purple-200",
    awaiting_payment: "bg-sky-100 text-sky-700 border-sky-200",
    closed: "bg-neutral-200 text-neutral-500 border-neutral-300",
};
const OPEN = ["enquired", "contacted", "awaiting_payment"];

/**
 * @param {{ registrations?: any[], isAdmin?: boolean, onChanged?: () => void }} props
 */
export default function EnquiriesPanel({ registrations = [], isAdmin = false, onChanged }) {
    const [section, setSection] = useState("enquired");
    const [openReg, setOpenReg] = useState(null); // lead whose notes drawer is open
    const [notes, setNotes] = useState([]);
    const [noteText, setNoteText] = useState("");
    const [notesLoading, setNotesLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const enquiries = registrations.filter((r) => ["enquired", "contacted", "awaiting_payment", "closed"].includes(r.payment_status));
    const counts = enquiries.reduce((acc, r) => { acc[r.payment_status] = (acc[r.payment_status] || 0) + 1; return acc; }, {});
    const openCount = enquiries.filter((r) => OPEN.includes(r.payment_status)).length;

    const list = section === "all"
        ? enquiries.filter((r) => OPEN.includes(r.payment_status))
        : enquiries.filter((r) => r.payment_status === section);

    const loadNotes = useCallback(async (regId) => {
        setNotesLoading(true);
        try {
            const res = await fetch(`/api/admin/registration-notes?registrationId=${regId}`);
            const data = await res.json().catch(() => ({}));
            setNotes(res.ok ? data.notes || [] : []);
        } finally {
            setNotesLoading(false);
        }
    }, []);

    const openDrawer = (reg) => { setOpenReg(reg); setNoteText(""); loadNotes(reg.id); };

    const addNote = async () => {
        if (!openReg || !noteText.trim()) return;
        setBusyId(openReg.id);
        const res = await fetch("/api/admin/registration-notes", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId: openReg.id, note: noteText.trim() }),
        });
        setBusyId(null);
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not save note."); return; }
        setNoteText("");
        await loadNotes(openReg.id);
        // First note on a brand-new enquiry advances it to Contacted.
        if (openReg.payment_status === "enquired") {
            await fetch("/api/admin/registrations", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: openReg.id, status: "contacted" }),
            });
            setOpenReg({ ...openReg, payment_status: "contacted" });
            onChanged?.();
        }
    };

    const requestPayment = async (reg) => {
        if (!(await confirmDialog({ title: "Request payment", message: `Send a payment link for “${reg.categories?.title || "this tier"}” to ${reg.first_name} ${reg.last_name}?`, confirmLabel: "Send" }))) return;
        setBusyId(reg.id);
        const res = await fetch("/api/admin/request-enquiry-payment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: reg.id }),
        });
        const data = await res.json().catch(() => ({}));
        setBusyId(null);
        if (!res.ok) { toast.error(data.error || "Could not request payment."); return; }
        toast.success("✅ Payment link sent by email & WhatsApp.");
        onChanged?.();
    };

    const syncPayment = async (reg) => {
        setBusyId(reg.id);
        const res = await fetch("/api/admin/reconcile-balance", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: reg.id }),
        });
        const data = await res.json().catch(() => ({}));
        setBusyId(null);
        if (!res.ok) { toast.error(data.error || "Sync failed."); return; }
        if (data.completed) toast.success("✅ Verified on Razorpay — marked Paid.");
        else toast.info(data.message || "Not paid yet.");
        onChanged?.();
    };

    const closeLead = async (reg) => {
        const reason = await promptDialog({ title: "Close lead", message: "Reason for closing this lead (saved as a note):", defaultValue: "Not interested", confirmLabel: "Close" });
        if (reason === null) return;
        setBusyId(reg.id);
        if (reason.trim()) {
            await fetch("/api/admin/registration-notes", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ registrationId: reg.id, note: `Closed: ${reason.trim()}` }),
            });
        }
        const res = await fetch("/api/admin/registrations", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: reg.id, status: "closed" }),
        });
        setBusyId(null);
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not close."); return; }
        toast.success("Lead closed.");
        onChanged?.();
    };

    const reopen = async (reg) => {
        setBusyId(reg.id);
        const res = await fetch("/api/admin/registrations", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: reg.id, status: "contacted" }),
        });
        setBusyId(null);
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not reopen."); return; }
        toast.success("Lead reopened.");
        onChanged?.();
    };

    const copyLink = async (reg) => {
        if (!reg.balance_link_url) return;
        try { await navigator.clipboard.writeText(reg.balance_link_url); } catch { /* ignore */ }
        setCopiedId(reg.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Section tabs */}
            <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-sm flex flex-wrap gap-2">
                {SECTIONS.map((s) => {
                    const active = section === s.key;
                    const count = s.key === "all" ? openCount : (counts[s.key] || 0);
                    return (
                        <button key={s.key} onClick={() => setSection(s.key)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition border ${active ? "bg-neutral-900 text-white border-neutral-900" : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"}`}>
                            {s.label}
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-600"}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm divide-y divide-neutral-100">
                {list.length === 0 ? (
                    <div className="px-6 py-12 text-center text-neutral-400 text-sm">No enquiries here.</div>
                ) : list.map((reg) => (
                    <div key={reg.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-neutral-900 truncate">{reg.first_name} {reg.last_name}</span>
                                <span className={`inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-bold border ${STATUS_CLASS[reg.payment_status] || ""}`}>{STATUS_LABEL[reg.payment_status]}</span>
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                                {reg.phone} · {reg.categories?.title || "—"}{reg.gotra ? ` · Gotra: ${reg.gotra}` : ""}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => openDrawer(reg)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition" title="Notes / contact history">
                                <MessageSquarePlus className="w-3.5 h-3.5" /> Notes
                            </button>
                            {isAdmin && (reg.payment_status === "enquired" || reg.payment_status === "contacted") && (
                                <button onClick={() => requestPayment(reg)} disabled={busyId === reg.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 transition disabled:opacity-50" title="Send a payment link at the tier price">
                                    <IndianRupee className="w-3.5 h-3.5" /> Request Payment
                                </button>
                            )}
                            {isAdmin && reg.payment_status === "awaiting_payment" && (
                                <>
                                    {reg.balance_link_url && (
                                        <button onClick={() => copyLink(reg)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition" title="Copy payment link">
                                            {copiedId === reg.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copiedId === reg.id ? "Copied" : "Copy link"}
                                        </button>
                                    )}
                                    <button onClick={() => syncPayment(reg)} disabled={busyId === reg.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-green-200 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition disabled:opacity-50" title="Check Razorpay & mark paid">
                                        <RefreshCw className={`w-3.5 h-3.5 ${busyId === reg.id ? "animate-spin" : ""}`} /> Sync
                                    </button>
                                </>
                            )}
                            {isAdmin && reg.payment_status !== "closed" && (
                                <button onClick={() => closeLead(reg)} disabled={busyId === reg.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-500 hover:bg-neutral-100 transition disabled:opacity-50" title="Mark Closed/Lost">
                                    <Ban className="w-3.5 h-3.5" /> Close
                                </button>
                            )}
                            {isAdmin && reg.payment_status === "closed" && (
                                <button onClick={() => reopen(reg)} disabled={busyId === reg.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition disabled:opacity-50" title="Reopen (→ Contacted)">
                                    <Undo2 className="w-3.5 h-3.5" /> Reopen
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Notes drawer */}
            {openReg && (
                <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                            <div>
                                <h2 className="font-bold text-neutral-900">{openReg.first_name} {openReg.last_name}</h2>
                                <p className="text-xs text-neutral-500">{openReg.phone} · {openReg.email || "no email"}</p>
                            </div>
                            <button onClick={() => setOpenReg(null)} className="p-2 text-neutral-400 hover:text-red-600 rounded-full hover:bg-red-50"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-4">
                            {openReg.problem_samasya && (
                                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-neutral-800">
                                    <span className="text-[11px] uppercase font-bold text-orange-800 block mb-1">Issue / Samasya</span>
                                    {openReg.problem_samasya}
                                </div>
                            )}
                            {isAdmin && (
                                <div className="flex gap-2">
                                    <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a contact note…" onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                                        className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                                    <button onClick={addNote} disabled={busyId === openReg.id || !noteText.trim()} className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Add</button>
                                </div>
                            )}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Contact history</h3>
                                {notesLoading ? (
                                    <p className="text-sm text-neutral-400">Loading…</p>
                                ) : notes.length === 0 ? (
                                    <p className="text-sm text-neutral-400">No notes yet.</p>
                                ) : notes.map((n) => (
                                    <div key={n.id} className="border border-neutral-100 rounded-lg p-3 bg-neutral-50">
                                        <p className="text-sm text-neutral-800 whitespace-pre-wrap">{n.note}</p>
                                        <p className="text-[11px] text-neutral-400 mt-1">{n.actor_role || "admin"} · {new Date(n.created_at).toLocaleString("en-IN")}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
