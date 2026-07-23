// components/ContactMessagesManager.js
// Settings → Contact Messages. Inbox of /contact form submissions.
//
// ── TanStack Query PILOT ──────────────────────────────────────────────────────
// Reference pattern for migrating the admin off hand-rolled fetch + useState +
// useEffect. Server state (the message list) is a `useQuery`; each action is a
// `useMutation` with an optimistic update + automatic invalidation. Compare with
// the old version: no `useState` for data/loading, no `useEffect` loader, no manual
// "update local array then hope it matches the server" — the cache is the source
// of truth and refetches itself. This is the shape to roll out across the admin.
"use client";

import { Mail, Trash2, MailOpen, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const KEY = ["admin", "contact-messages"];
const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

async function fetchMessages() {
    const res = await fetch("/api/admin/contact-messages");
    if (!res.ok) throw new Error("Failed to load messages.");
    return res.json(); // { messages, count, unread }
}

export default function ContactMessagesManager() {
    const qc = useQueryClient();

    // ── READ: one line replaces the old data/loading state + useEffect loader.
    const { data, isLoading, isError, isFetching, refetch } = useQuery({
        queryKey: KEY,
        queryFn: fetchMessages,
    });
    const messages = data?.messages || [];
    const unread = data?.unread || 0;

    // ── MUTATION: mark read / unread (optimistic, then invalidate to re-sync).
    const toggleRead = useMutation({
        mutationFn: ({ id, is_read }) =>
            fetch("/api/admin/contact-messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_read }) }),
        onMutate: async ({ id, is_read }) => {
            await qc.cancelQueries({ queryKey: KEY });
            const prev = qc.getQueryData(KEY);
            qc.setQueryData(KEY, (old) => old && ({
                ...old,
                messages: old.messages.map((m) => (m.id === id ? { ...m, is_read } : m)),
                unread: old.unread + (is_read ? -1 : 1),
            }));
            return { prev };
        },
        onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(KEY, ctx.prev),
        onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
    });

    // ── MUTATION: delete (optimistic remove, then invalidate).
    const del = useMutation({
        mutationFn: (id) =>
            fetch("/api/admin/contact-messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: KEY });
            const prev = qc.getQueryData(KEY);
            qc.setQueryData(KEY, (old) => {
                if (!old) return old;
                const target = old.messages.find((m) => m.id === id);
                return {
                    ...old,
                    messages: old.messages.filter((m) => m.id !== id),
                    count: old.count - 1,
                    unread: old.unread - (target && !target.is_read ? 1 : 0),
                };
            });
            return { prev };
        },
        onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(KEY, ctx.prev),
        onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
    });

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Contact Messages</h3>
                    <p className="text-sm text-neutral-500">Submissions from the public <span className="font-semibold">/contact</span> form.{unread > 0 ? ` · ${unread} unread` : ""}</p>
                </div>
                <button onClick={() => refetch()} className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"><RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>
            </div>

            {isLoading ? (
                <p className="text-sm text-neutral-400">Loading…</p>
            ) : isError ? (
                <div className="border border-red-200 bg-red-50 rounded-xl p-6 text-center text-red-600 text-sm">Couldn’t load messages. <button onClick={() => refetch()} className="underline font-semibold">Retry</button></div>
            ) : messages.length === 0 ? (
                <div className="border border-dashed border-neutral-300 rounded-xl p-10 text-center text-neutral-400">No messages yet.</div>
            ) : (
                <div className="space-y-3">
                    {messages.map((m) => (
                        <div key={m.id} className={`border rounded-xl p-5 transition ${m.is_read ? "bg-white border-neutral-200" : "bg-orange-50/60 border-orange-200"}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {!m.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                                        <span className="font-bold text-neutral-900">{m.name || "—"}</span>
                                        {m.email && <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Your enquiry")}`} className="text-sm text-orange-600 hover:underline">{m.email}</a>}
                                        {m.phone && <a href={`tel:${m.phone}`} className="text-sm text-neutral-500 hover:text-orange-600 hover:underline">📞 {m.phone}</a>}
                                    </div>
                                    {m.subject && <p className="mt-1 text-sm font-semibold text-neutral-700">{m.subject}</p>}
                                    <p className="mt-1.5 text-sm text-neutral-600 whitespace-pre-wrap break-words">{m.message}</p>
                                    <p className="mt-2 text-xs text-neutral-400">{fmt(m.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => toggleRead.mutate({ id: m.id, is_read: !m.is_read })} title={m.is_read ? "Mark unread" : "Mark read"} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100">
                                        {m.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => { if (confirm("Delete this message?")) del.mutate(m.id); }} title="Delete" className="p-2 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
