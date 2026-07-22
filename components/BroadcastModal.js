// components/BroadcastModal.js
// Compose and send an announcement (email + optional WhatsApp) to a segment.
// Email is free-form; WhatsApp uses a pre-approved template (see note in the UI).
"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Send, Megaphone, Paperclip } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";

const SEGMENTS = [
    { v: "paid", label: "All Paid attendees" },
    { v: "tier", label: "Paid — specific tier" },
    { v: "advance", label: "Advance-paid (owe balance)" },
    { v: "enquiries", label: "Open enquiries" },
    { v: "not_arrived", label: "Paid but not yet arrived" },
];

/**
 * @param {{ categories?: any[], onClose: () => void }} props
 */
export default function BroadcastModal({ categories = [], onClose }) {
    const payableCats = useMemo(() => categories.filter((c) => !c.is_enquiry_only), [categories]);
    const [segment, setSegment] = useState("paid");
    const [categoryId, setCategoryId] = useState("");
    const [email, setEmail] = useState(true);
    const [whatsapp, setWhatsapp] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);

    // Optional document attachment from the media library. Only PUBLIC documents
    // are offered: WhatsApp fetches the file from its URL, so a private file has
    // no URL it could ever reach — and attaching one would publish it to the whole
    // list. The server re-checks this; the filter here is just to avoid offering
    // a choice that would be rejected.
    const [docs, setDocs] = useState([]);
    const [attachmentId, setAttachmentId] = useState("");
    useEffect(() => {
        fetch("/api/admin/media-library?kind=document&visibility=public")
            .then((r) => (r.ok ? r.json() : { items: [] }))
            .then((d) => setDocs(d.items || []))
            .catch(() => setDocs([]));
    }, []);

    const send = async () => {
        if (!body.trim()) { toast.error("Write a message."); return; }
        if (!email && !whatsapp) { toast.error("Pick at least one channel."); return; }
        if (email && !subject.trim()) { toast.error("Email needs a subject."); return; }
        if (segment === "tier" && !categoryId) { toast.error("Choose a tier."); return; }
        const segLabel = SEGMENTS.find((s) => s.v === segment)?.label;
        if (!(await confirmDialog({ title: "Send broadcast", message: `Send this message to "${segLabel}" via ${[email && "email", whatsapp && "WhatsApp"].filter(Boolean).join(" + ")}? This cannot be undone.`, confirmLabel: "Send" }))) return;
        setSending(true);
        try {
            const res = await fetch("/api/admin/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ segment, categoryId: segment === "tier" ? categoryId : undefined, channels: { email, whatsapp }, subject, body, attachmentId: attachmentId || undefined }),
            });
            const data = await res.json().catch(() => ({}));
            setSending(false);
            if (!res.ok) { toast.error(data.error || "Broadcast failed."); return; }
            if (data.recipients === 0) { toast.info("No recipients matched that segment."); return; }
            toast.success(`Sent to ${data.recipients} — ${data.emailSent} email(s), ${data.waSent} WhatsApp${data.capped ? " (capped at 1000)" : ""}.`);
            onClose();
        } catch {
            setSending(false);
            toast.error("Broadcast failed. Try again.");
        }
    };

    const input = "w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none";
    const lbl = "text-xs font-semibold text-neutral-500 mb-1 block";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><Megaphone className="w-5 h-5 text-orange-600" /> Broadcast Announcement</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className={lbl}>Send to</label>
                        <select value={segment} onChange={(e) => setSegment(e.target.value)} className={input}>
                            {SEGMENTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                        </select>
                    </div>
                    {segment === "tier" && (
                        <div>
                            <label className={lbl}>Tier</label>
                            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={input}>
                                <option value="">— Select a tier —</option>
                                {payableCats.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className={lbl}>Channels</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" /> Email</label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" /> WhatsApp</label>
                        </div>
                    </div>

                    {email && (
                        <div>
                            <label className={lbl}>Email subject</label>
                            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} placeholder="e.g. Important: gate timings for tomorrow" />
                        </div>
                    )}

                    <div>
                        <label className={lbl}>Message</label>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className={input} placeholder="Type your announcement… (Namaste <name> is added automatically for email)" />
                    </div>

                    <div>
                        <label className={lbl}><Paperclip className="w-3 h-3 inline mr-1" />Attach a document (optional)</label>
                        <select value={attachmentId} onChange={(e) => setAttachmentId(e.target.value)} className={input}>
                            <option value="">No attachment</option>
                            {docs.map((d) => (
                                <option key={d.id} value={d.id}>{d.title || d.filename}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-neutral-400 mt-1">
                            Public documents from the Media Library only — WhatsApp downloads the file from its link, so a private file can’t be sent. Upload one in Settings → Media Library.
                        </p>
                    </div>

                    {whatsapp && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            WhatsApp policy requires a <b>pre-approved template</b> for broadcasts. This uses the{" "}
                            <b>{attachmentId ? "document_announcement" : "announcement"}</b> template
                            {attachmentId ? " (DOCUMENT header + one body variable)" : " (one body variable)"} — set the approved name in Settings → Templates &amp; Config. If it isn’t approved yet, WhatsApp sends are skipped and email still goes out.
                        </p>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-neutral-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Cancel</button>
                    <button onClick={send} disabled={sending} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"><Send className="w-4 h-4" /> {sending ? "Sending…" : "Send broadcast"}</button>
                </div>
            </div>
        </div>
    );
}
