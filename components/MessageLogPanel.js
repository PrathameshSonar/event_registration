// components/MessageLogPanel.js
// Settings → Message Log. The delivery trail for every outbound email + WhatsApp.
//
// This exists to answer one question an operator asks constantly: "did they
// actually get it?" Rows are written centrally by lib/email.js + lib/whatsapp.js,
// so the log covers every send. A failed row can be re-sent from here — the stored
// payload is replayed verbatim, and the retry is logged as its own row.
"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, MessageCircle, RefreshCw, Send, Check, AlertTriangle } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";
// From messageKinds (client-safe), NOT messageLog — that one imports supabaseAdmin.
import { MESSAGE_KINDS } from "@/lib/messageKinds";

const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

export default function MessageLogPanel() {
    const [messages, setMessages] = useState([]);
    const [counts, setCounts] = useState({ total: 0, failed: 0 });
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState(null);

    const [channel, setChannel] = useState("");
    const [kind, setKind] = useState("");
    const [status, setStatus] = useState("");
    const [q, setQ] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (channel) params.set("channel", channel);
        if (kind) params.set("kind", kind);
        if (status) params.set("status", status);
        if (q.trim()) params.set("q", q.trim());
        try {
            const res = await fetch(`/api/admin/message-log?${params}`);
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
                setMessages(d.messages || []);
                setCounts({ total: d.total || 0, failed: d.failed || 0 });
            } else {
                toast.error(d.error || "Could not load the message log.");
            }
        } catch { /* keep the last good list */ }
        setLoading(false);
    }, [channel, kind, status, q]);

    // Debounced so typing in the search box doesn't fire a request per keystroke.
    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const resend = async (m) => {
        const label = MESSAGE_KINDS[m.kind] || m.kind || m.channel;
        if (!(await confirmDialog({
            title: "Re-send message",
            message: `Re-send this ${label} to ${m.recipient}?\n\nThe original message is sent again exactly as it was composed.`,
            confirmLabel: "Re-send",
        }))) return;

        setResendingId(m.id);
        const res = await fetch("/api/admin/message-log", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: m.id }),
        });
        const d = await res.json().catch(() => ({}));
        setResendingId(null);
        if (!res.ok) { toast.error(d.error || "Re-send failed."); await load(); return; }
        toast.success(`Re-sent to ${m.recipient}.`);
        await load();
    };

    const select = "px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600";

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Message Log</h3>
                    <p className="text-sm text-neutral-500">Every email &amp; WhatsApp the system has sent, and whether it landed.</p>
                </div>
                <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm font-semibold text-neutral-600 border border-neutral-200 px-3 py-2 rounded-lg hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3 shadow-sm">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg"><Check className="w-5 h-5" /></div>
                    <div><p className="text-xs text-neutral-500">Messages sent</p><p className="text-2xl font-bold">{(counts.total - counts.failed).toLocaleString("en-IN")}</p></div>
                </div>
                <button
                    onClick={() => setStatus(status === "failed" ? "" : "failed")}
                    className={`bg-white border rounded-xl p-5 flex items-center gap-3 shadow-sm text-left transition ${counts.failed > 0 ? "border-rose-300 hover:bg-rose-50" : "border-neutral-200"} ${status === "failed" ? "ring-2 ring-rose-300" : ""}`}
                >
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
                    <div><p className="text-xs text-neutral-500">Failed{status === "failed" ? " (filtering)" : ""}</p><p className="text-2xl font-bold">{counts.failed.toLocaleString("en-IN")}</p></div>
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient (email / phone)…" className={`${select} flex-1 min-w-[200px]`} />
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${select} bg-white cursor-pointer`}>
                    <option value="">All channels</option>
                    <option value="email">✉️ Email</option>
                    <option value="whatsapp">📱 WhatsApp</option>
                </select>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${select} bg-white cursor-pointer`}>
                    <option value="">All types</option>
                    {Object.entries(MESSAGE_KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${select} bg-white cursor-pointer`}>
                    <option value="">All statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-4 py-3">Type</th>
                                <th className="text-left px-4 py-3">Recipient</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">When</th>
                                <th className="text-right px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
                            ) : messages.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No messages match these filters.</td></tr>
                            ) : messages.map((m) => (
                                <tr key={m.id} className="hover:bg-neutral-50 align-top">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {m.channel === "email"
                                                ? <Mail className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                                : <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                            <span className="font-semibold text-neutral-800 whitespace-nowrap">{MESSAGE_KINDS[m.kind] || m.kind || "—"}</span>
                                        </div>
                                        {m.subject && <span className="block text-xs text-neutral-400 mt-0.5 max-w-[240px] truncate">{m.subject}</span>}
                                        {m.metadata?.resend_of && <span className="inline-block mt-1 text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200 rounded px-1.5 py-0.5">RESEND</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-neutral-600 break-all max-w-[220px]">{m.recipient}</td>
                                    <td className="px-4 py-2.5">
                                        {m.status === "sent"
                                            ? <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">Sent</span>
                                            : (
                                                <>
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Failed</span>
                                                    {m.error && <span className="block text-[11px] text-rose-500 mt-1 max-w-[220px] break-words">{m.error}</span>}
                                                </>
                                            )}
                                    </td>
                                    <td className="px-4 py-2.5 text-neutral-500 text-xs whitespace-nowrap">{fmt(m.created_at)}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            onClick={() => resend(m)}
                                            disabled={resendingId === m.id}
                                            title="Send this message again, exactly as it was composed"
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition disabled:opacity-50 whitespace-nowrap"
                                        >
                                            <Send className={`w-3.5 h-3.5 ${resendingId === m.id ? "animate-pulse" : ""}`} />
                                            {resendingId === m.id ? "Sending…" : "Re-send"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
