// components/MediaLibraryManager.js
// Settings → Media Library. Everything ever uploaded, in one place.
//
// Three things this makes possible that weren't before:
//   1. SEE what's been uploaded (previously an upload vanished into the bucket and
//      only its URL survived, on whatever row you were editing).
//   2. REUSE a file across fields instead of re-uploading it.
//   3. DELETE a file — including the ones orphaned by every replaced image.
//
// Documents can be public (downloadable from the site) or PRIVATE (contracts,
// invoices — stored in a separate private bucket, opened only via a signed URL).
"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, Loader2, Trash2, Search, FileText, Image as ImageIcon, Lock, Globe, Download, Mail, ExternalLink, Copy, Check } from "lucide-react";
import { toast, confirmDialog } from "@/lib/uiStore";

const fmtSize = (b) => {
    const n = Number(b || 0);
    if (!n) return "—";
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "—"; } };

export default function MediaLibraryManager() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [q, setQ] = useState("");
    const [kind, setKind] = useState("");
    const [copiedId, setCopiedId] = useState(null);

    // Documents can be uploaded privately; images are always public (they have to be
    // fetchable by <img src> to render at all).
    const [uploadPrivate, setUploadPrivate] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (kind) params.set("kind", kind);
        if (q.trim()) params.set("q", q.trim());
        try {
            const res = await fetch(`/api/admin/media-library?${params}`);
            const d = await res.json().catch(() => ({}));
            if (res.ok) setItems(d.items || []);
            else toast.error(d.error || "Could not load the media library.");
        } catch { /* keep the last good list */ }
        setLoading(false);
    }, [kind, q]);

    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
    }, [load]);

    const upload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            if (uploadPrivate) fd.append("visibility", "private");
            const res = await fetch("/api/admin/media-library", { method: "POST", body: fd });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) { toast.error(d.error || "Upload failed."); return; }
            toast.success(`Uploaded${d.item?.visibility === "private" ? " (private)" : ""}.`);
            await load();
        } catch {
            toast.error("Upload failed. Try again.");
        } finally {
            setBusy(false);
        }
    };

    const patch = async (id, updates) => {
        const res = await fetch("/api/admin/media-library", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(d.error || "Update failed."); return; }
        await load();
    };

    const remove = async (item) => {
        if (!(await confirmDialog({
            title: "Delete file",
            message: `Delete "${item.title || item.filename}"? This removes it from storage permanently.`,
            danger: true, confirmLabel: "Delete",
        }))) return;

        setBusy(true);
        const res = await fetch("/api/admin/media-library", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id }),
        });
        const d = await res.json().catch(() => ({}));
        setBusy(false);

        // 409 = still referenced somewhere on the site. Deleting anyway would leave a
        // broken image, so make the admin see exactly where before forcing it.
        if (res.status === 409 && d.inUse?.length) {
            const where = d.inUse.map((u) => `• ${u.where}${u.count > 1 ? ` (${u.count}×)` : ""}`).join("\n");
            const forced = await confirmDialog({
                title: "This file is still in use",
                message: `"${item.title || item.filename}" is currently used as:\n\n${where}\n\nDeleting it will leave a broken image/link there.\n\nDelete anyway?`,
                danger: true, confirmLabel: "Delete anyway",
            });
            if (!forced) return;
            setBusy(true);
            const f = await fetch("/api/admin/media-library", {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: item.id, force: true }),
            });
            setBusy(false);
            if (!f.ok) { toast.error("Delete failed."); return; }
            toast.success("File deleted.");
            await load();
            return;
        }

        if (!res.ok) { toast.error(d.error || "Delete failed."); return; }
        toast.success("File deleted.");
        await load();
    };

    // Private files have no public URL — open them through a short-lived signed URL.
    const open = async (item) => {
        if (item.url) { window.open(item.url, "_blank", "noopener"); return; }
        const res = await fetch(`/api/admin/media-file/${item.id}`);
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.url) { toast.error(d.error || "Could not open the file."); return; }
        window.open(d.url, "_blank", "noopener");
    };

    const copy = async (item) => {
        if (!item.url) { toast.error("Private files have no public link — that's the point."); return; }
        try { await navigator.clipboard.writeText(item.url); } catch { /* ignore */ }
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const select = "px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600";
    const images = items.filter((i) => i.kind === "image");
    const docs = items.filter((i) => i.kind === "document");

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Media Library</h3>
                    <p className="text-sm text-neutral-500">Every image and document you&rsquo;ve uploaded. Reuse them anywhere instead of uploading again.</p>
                </div>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition ${busy ? "bg-neutral-200 text-neutral-400" : "bg-neutral-900 text-white hover:bg-orange-600"}`}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {busy ? "Uploading…" : "Upload file"}
                    <input type="file" onChange={upload} disabled={busy} className="hidden" />
                </label>
            </div>

            <label className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl p-3 cursor-pointer select-none">
                <input type="checkbox" checked={uploadPrivate} onChange={(e) => setUploadPrivate(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" />
                <span>
                    <span className="text-sm font-medium text-neutral-700 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Upload the next document as private</span>
                    <span className="text-xs text-neutral-400 block">For contracts, sponsor decks, invoices. Stored in a private bucket with no public link — admins open it via a temporary signed URL. (Images are always public; they can&rsquo;t render otherwise.)</span>
                </span>
            </label>

            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className={`${select} w-full pl-9`} />
                </div>
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${select} bg-white cursor-pointer`}>
                    <option value="">All files</option>
                    <option value="image">🖼️ Images</option>
                    <option value="document">📄 Documents</option>
                </select>
            </div>

            {loading ? (
                <p className="text-center text-neutral-400 text-sm py-10">Loading…</p>
            ) : items.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
                    <p className="text-neutral-400 text-sm">Nothing uploaded yet.</p>
                </div>
            ) : (
                <>
                    {/* Documents — the row layout carries the flags, so it goes first. */}
                    {docs.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Documents ({docs.length})</h4>
                            <div className="space-y-2">
                                {docs.map((it) => (
                                    <div key={it.id} className="bg-white border border-neutral-200 rounded-xl p-3.5">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-neutral-900 truncate flex items-center gap-2">
                                                    {it.title || it.filename}
                                                    {it.visibility === "private"
                                                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-neutral-800 text-white px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> PRIVATE</span>
                                                        : <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded"><Globe className="w-2.5 h-2.5" /> PUBLIC</span>}
                                                </p>
                                                <p className="text-xs text-neutral-400 truncate">{it.filename} · {fmtSize(it.size_bytes)} · {fmtDate(it.created_at)}{it.uploaded_by ? ` · ${it.uploaded_by}` : ""}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button onClick={() => open(it)} title="Open" className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 transition"><ExternalLink className="w-3.5 h-3.5" /></button>
                                                {it.url && (
                                                    <button onClick={() => copy(it)} title="Copy public link" className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-100 transition">
                                                        {copiedId === it.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                                <button onClick={() => remove(it)} disabled={busy} title="Delete" className="p-2 border border-neutral-200 rounded-lg bg-white text-neutral-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>

                                        {/* Publishing flags — only meaningful for PUBLIC documents. */}
                                        {it.visibility === "public" && (
                                            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-neutral-100">
                                                <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer select-none">
                                                    <input type="checkbox" checked={!!it.is_download} onChange={(e) => patch(it.id, { is_download: e.target.checked })} className="w-3.5 h-3.5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" />
                                                    <Download className="w-3.5 h-3.5" /> Show in homepage Downloads
                                                </label>
                                                <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer select-none">
                                                    <input type="checkbox" checked={!!it.attach_to_ticket} onChange={(e) => patch(it.id, { attach_to_ticket: e.target.checked })} className="w-3.5 h-3.5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" />
                                                    <Mail className="w-3.5 h-3.5" /> Attach to every ticket email
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {images.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Images ({images.length})</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {images.map((it) => (
                                    <div key={it.id} className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                                        <div className="aspect-square">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={it.url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                            <p className="text-white text-[11px] truncate">{it.title || it.filename}</p>
                                            <p className="text-white/60 text-[10px]">{fmtSize(it.size_bytes)}</p>
                                        </div>
                                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => copy(it)} title="Copy link" className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition">
                                                {copiedId === it.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-700" />}
                                            </button>
                                            <button onClick={() => remove(it)} disabled={busy} title="Delete" className="p-1.5 bg-white/90 rounded-lg hover:bg-red-50 text-neutral-700 hover:text-red-600 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
