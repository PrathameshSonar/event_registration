// components/SponsorsManager.js
// Settings → Sponsors. Admin-recorded sponsorship deals.
//
// Sponsorships are negotiated offline, so this is a record-keeping panel, not a
// payment flow: an admin enters who sponsored, at what level, for how much, and
// who to call. Sponsors are not shown on the public site.
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus, Trash2, Pencil, Handshake, X } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";
import MediaPicker from "@/components/MediaPicker";

const TIERS = ["Title", "Platinum", "Gold", "Silver", "Bronze", "Partner", "In-kind"];

const TIER_CLASS = {
    Title: "bg-purple-100 text-purple-700 border-purple-200",
    Platinum: "bg-slate-200 text-slate-700 border-slate-300",
    Gold: "bg-amber-100 text-amber-800 border-amber-300",
    Silver: "bg-neutral-100 text-neutral-600 border-neutral-300",
    Bronze: "bg-orange-100 text-orange-800 border-orange-200",
    Partner: "bg-blue-100 text-blue-700 border-blue-200",
    "In-kind": "bg-teal-100 text-teal-700 border-teal-200",
};

const EMPTY = {
    name: "", tier: "Gold", amount: "", logo_url: "",
    contact_name: "", contact_phone: "", contact_email: "", notes: "", event_id: "",
};

/** @param {{ events?: any[] }} props */
export default function SponsorsManager({ events = [] }) {
    const qc = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const { data, isLoading: loading } = useQuery({
        queryKey: ["admin", "sponsors"],
        queryFn: async () => {
            const res = await fetch("/api/admin/sponsors");
            if (!res.ok) throw new Error("Failed to load sponsors.");
            return res.json();
        },
    });
    const sponsors = data?.sponsors || [];
    const total = data?.total || 0;
    // Refetch the list after any create/update/delete.
    const reload = () => qc.invalidateQueries({ queryKey: ["admin", "sponsors"] });

    const openNew = () => {
        const activeEvent = events.find((e) => e.is_active);
        setForm({ ...EMPTY, event_id: activeEvent?.id || "" });
        setEditingId(null);
        setShowForm(true);
    };

    const openEdit = (s) => {
        setForm({
            name: s.name || "", tier: s.tier || "", amount: s.amount ?? "", logo_url: s.logo_url || "",
            contact_name: s.contact_name || "", contact_phone: s.contact_phone || "",
            contact_email: s.contact_email || "", notes: s.notes || "", event_id: s.event_id || "",
        });
        setEditingId(s.id);
        setShowForm(true);
    };

    const save = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error("Sponsor name is required."); return; }
        setSaving(true);
        const payload = { ...form, amount: Number(form.amount) || 0, event_id: form.event_id || null };
        const res = await fetch("/api/admin/sponsors", {
            method: editingId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
        });
        const d = await res.json().catch(() => ({}));
        setSaving(false);
        if (!res.ok) { toast.error(d.error || "Could not save the sponsor."); return; }
        toast.success(editingId ? "Sponsor updated." : "Sponsor added.");
        setShowForm(false);
        setForm(EMPTY);
        setEditingId(null);
        reload();
    };

    const remove = async (s) => {
        if (!(await confirmDialog({ title: "Remove sponsor", message: `Remove "${s.name}" from the sponsor list?`, danger: true, confirmLabel: "Remove" }))) return;
        const res = await fetch("/api/admin/sponsors", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id }),
        });
        if (!res.ok) { toast.error("Could not remove the sponsor."); return; }
        toast.success("Sponsor removed.");
        reload();
    };

    const input = "w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600";

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Sponsors</h3>
                    <p className="text-sm text-neutral-500">Sponsorship deals you&rsquo;ve closed offline. Not shown on the public site.</p>
                </div>
                <button onClick={openNew} className="flex items-center gap-2 bg-neutral-900 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
                    <Plus className="w-4 h-4" /> Add Sponsor
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-5 h-5" /></div>
                    <div><p className="text-xs text-neutral-500">Total Committed</p><p className="text-2xl font-bold">₹{Number(total).toLocaleString("en-IN")}</p></div>
                </div>
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Handshake className="w-5 h-5" /></div>
                    <div><p className="text-xs text-neutral-500">Sponsors</p><p className="text-2xl font-bold">{sponsors.length}</p></div>
                </div>
            </div>

            {showForm && (
                <form onSubmit={save} className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-neutral-700">{editingId ? "Edit sponsor" : "New sponsor"}</h4>
                        <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1 text-neutral-400 hover:text-neutral-700"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Sponsor name *</label>
                            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Industries Pvt Ltd" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Amount (₹)</label>
                            <input className={input} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="100000" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Tier</label>
                            <select className={`${input} bg-white cursor-pointer`} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                                <option value="">— None —</option>
                                {TIERS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Event</label>
                            <select className={`${input} bg-white cursor-pointer`} value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}>
                                <option value="">— Not linked —</option>
                                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}{ev.is_active ? " ✓" : ""}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Logo</label>
                        <div className="flex gap-2">
                            <input className={input} value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://… or upload →" />
                            <MediaPicker onSelected={(url) => setForm((f) => ({ ...f, logo_url: url }))} label="Upload" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-neutral-200">
                        <div>
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Contact name</label>
                            <input className={input} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Contact phone</label>
                            <input className={input} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} inputMode="numeric" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Contact email</label>
                            <input className={input} type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Notes</label>
                        <textarea className={input} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Deliverables promised, payment schedule, etc." />
                    </div>

                    <button type="submit" disabled={saving} className="bg-neutral-900 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition disabled:opacity-50">
                        {saving ? "Saving…" : editingId ? "Save changes" : "Add sponsor"}
                    </button>
                </form>
            )}

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-4 py-3">Sponsor</th>
                            <th className="text-left px-4 py-3">Tier</th>
                            <th className="text-right px-4 py-3">Amount</th>
                            <th className="text-left px-4 py-3">Contact</th>
                            <th className="text-right px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
                        ) : sponsors.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No sponsors recorded yet.</td></tr>
                        ) : sponsors.map((s) => (
                            <tr key={s.id} className="hover:bg-neutral-50">
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-3">
                                        {s.logo_url
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={s.logo_url} alt="" className="w-10 h-10 rounded object-contain bg-white border border-neutral-200 flex-shrink-0" />
                                            : <div className="w-10 h-10 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0"><Handshake className="w-4 h-4 text-neutral-400" /></div>}
                                        <div className="min-w-0">
                                            <span className="font-semibold text-neutral-900 block truncate">{s.name}</span>
                                            {s.events?.title && <span className="text-xs text-neutral-400">{s.events.title}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    {s.tier
                                        ? <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${TIER_CLASS[s.tier] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>{s.tier}</span>
                                        : <span className="text-neutral-300">—</span>}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-green-700 whitespace-nowrap">₹{Number(s.amount || 0).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-xs text-neutral-500">
                                    {s.contact_name || s.contact_phone || s.contact_email ? (
                                        <>
                                            {s.contact_name && <span className="block text-neutral-700 font-medium">{s.contact_name}</span>}
                                            <span className="block">{s.contact_phone}{s.contact_email ? ` · ${s.contact_email}` : ""}</span>
                                        </>
                                    ) : <span className="text-neutral-300">—</span>}
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <button onClick={() => openEdit(s)} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => remove(s)} className="p-2 border border-neutral-200 rounded-lg bg-white text-neutral-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {sponsors.some((s) => s.notes) && (
                <div className="text-xs text-neutral-400">Tip: open a sponsor to read the notes recorded against the deal.</div>
            )}
        </div>
    );
}
