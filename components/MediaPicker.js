// components/MediaPicker.js
// Replaces the old one-shot "Upload" button next to every media URL field.
//
// The old ImageUpload pushed a file straight to storage and returned a URL —
// nothing recorded that the upload happened, so files could never be browsed,
// reused, or deleted, and every replaced file was orphaned in the bucket forever.
// This picker uploads through /api/admin/media-library (which indexes the file)
// and also lets you REUSE anything already there, so the same photo isn't uploaded
// five times for five fields.
//
// Same props as the old button (onSelected(url), label, className) plus `kind`.
// The plain URL field next to it still works — this is additive.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Loader2, X, Search, FileText, ImageIcon, Check } from "lucide-react";
import { toast } from "@/lib/uiStore";

const fmtSize = (b) => {
    const n = Number(b || 0);
    if (!n) return "";
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const ACCEPT = {
    image: "image/png,image/jpeg,image/webp,image/gif,image/avif",
    document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv",
};

/**
 * @param {{
 *   onSelected: (url: string, item?: any) => void,
 *   kind?: 'image' | 'document',
 *   label?: string,
 *   className?: string,
 * }} props
 */
export default function MediaPicker({ onSelected, kind = "image", label = "Library", className = "" }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState("");
    const inputRef = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ kind });
        // Only public files can be attached to a page/field — a private doc has no
        // URL to put in an <img src> or a link.
        params.set("visibility", "public");
        if (q.trim()) params.set("q", q.trim());
        try {
            const res = await fetch(`/api/admin/media-library?${params}`);
            const d = await res.json().catch(() => ({}));
            if (res.ok) setItems(d.items || []);
        } catch { /* keep the last good list */ }
        setLoading(false);
    }, [kind, q]);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
    }, [open, load]);

    const upload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-picking the same file
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/admin/media-library", { method: "POST", body: fd });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.url) { toast.error(d.error || "Upload failed."); return; }
            onSelected(d.url, d.item);
            toast.success("Uploaded and added to the library.");
            setOpen(false);
        } catch {
            toast.error("Upload failed. Try again.");
        } finally {
            setBusy(false);
        }
    };

    const choose = (item) => {
        onSelected(item.url, item);
        setOpen(false);
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT[kind] || ACCEPT.image}
                onChange={upload}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-100 transition whitespace-nowrap ${className}`}
            >
                <Upload className="w-4 h-4" /> {label}
            </button>

            {open && (
                <div className="fixed inset-0 bg-neutral-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-3">
                            <h3 className="font-bold text-neutral-900">
                                {kind === "document" ? "Choose a document" : "Choose an image"}
                            </h3>
                            <button onClick={() => setOpen(false)} className="p-1.5 text-neutral-400 hover:text-red-600 rounded-full hover:bg-red-50 transition"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="px-5 py-3 border-b border-neutral-100 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search the library…"
                                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-neutral-900 text-white hover:bg-orange-600 disabled:opacity-50 transition whitespace-nowrap"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {busy ? "Uploading…" : "Upload new"}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {loading ? (
                                <p className="text-center text-neutral-400 text-sm py-10">Loading…</p>
                            ) : items.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-neutral-400 text-sm">Nothing in the library yet.</p>
                                    <p className="text-neutral-400 text-xs mt-1">Upload a file — it&rsquo;ll be saved here and reusable everywhere.</p>
                                </div>
                            ) : kind === "document" ? (
                                <div className="space-y-2">
                                    {items.map((it) => (
                                        <button
                                            key={it.id}
                                            onClick={() => choose(it)}
                                            className="w-full flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition text-left group"
                                        >
                                            <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-neutral-900 truncate">{it.title || it.filename}</p>
                                                <p className="text-xs text-neutral-400 truncate">{it.filename} · {fmtSize(it.size_bytes)}</p>
                                            </div>
                                            <Check className="w-4 h-4 text-orange-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {items.map((it) => (
                                        <button
                                            key={it.id}
                                            onClick={() => choose(it)}
                                            className="group relative rounded-xl overflow-hidden border-2 border-neutral-200 hover:border-orange-500 transition aspect-square bg-neutral-50"
                                            title={it.title || it.filename}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={it.url} alt="" className="w-full h-full object-cover" />
                                            <span className="absolute inset-0 bg-orange-600/0 group-hover:bg-orange-600/20 transition" />
                                            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-2 py-1 truncate text-left">
                                                {it.title || it.filename}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-neutral-100 text-xs text-neutral-400 flex items-center gap-1.5">
                            {kind === "document" ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                            Files you upload here are saved in the Media Library and can be reused anywhere.
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
