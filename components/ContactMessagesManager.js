// components/ContactMessagesManager.js
// Settings → Contact Messages. Read-only-ish inbox of /contact form submissions.
// Admins can mark read/unread, reply by email, and delete.
"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2, MailOpen, RefreshCw } from "lucide-react";

const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

export default function ContactMessagesManager() {
    const [data, setData] = useState({ messages: [], count: 0, unread: 0 });
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const res = await fetch("/api/admin/contact-messages");
            const d = await res.json().catch(() => ({}));
            if (res.ok) setData(d);
        } catch { /* ignore */ }
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const toggleRead = async (m) => {
        setData((p) => ({ ...p, messages: p.messages.map((x) => x.id === m.id ? { ...x, is_read: !m.is_read } : x), unread: p.unread + (m.is_read ? 1 : -1) }));
        await fetch("/api/admin/contact-messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, is_read: !m.is_read }) });
    };
    const del = async (m) => {
        if (!confirm("Delete this message?")) return;
        setData((p) => ({ ...p, messages: p.messages.filter((x) => x.id !== m.id), count: p.count - 1, unread: p.unread - (m.is_read ? 0 : 1) }));
        await fetch("/api/admin/contact-messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id }) });
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Contact Messages</h3>
                    <p className="text-sm text-neutral-500">Submissions from the public <span className="font-semibold">/contact</span> form.{data.unread > 0 ? ` · ${data.unread} unread` : ""}</p>
                </div>
                <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"><RefreshCw className="w-4 h-4" /> Refresh</button>
            </div>

            {loading ? (
                <p className="text-sm text-neutral-400">Loading…</p>
            ) : data.messages.length === 0 ? (
                <div className="border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-400">No messages yet.</div>
            ) : (
                <div className="space-y-3">
                    {data.messages.map((m) => (
                        <div key={m.id} className={`border rounded-xl p-5 transition ${m.is_read ? "bg-white border-neutral-200" : "bg-orange-50/60 border-orange-200"}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {!m.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                                        <span className="font-bold text-neutral-900">{m.name || "—"}</span>
                                        {m.email && <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Your enquiry")}`} className="text-sm text-orange-600 hover:underline">{m.email}</a>}
                                    </div>
                                    {m.subject && <p className="mt-1 text-sm font-semibold text-neutral-700">{m.subject}</p>}
                                    <p className="mt-1.5 text-sm text-neutral-600 whitespace-pre-wrap break-words">{m.message}</p>
                                    <p className="mt-2 text-xs text-neutral-400">{fmt(m.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => toggleRead(m)} title={m.is_read ? "Mark unread" : "Mark read"} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100">
                                        {m.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => del(m)} title="Delete" className="p-2 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
