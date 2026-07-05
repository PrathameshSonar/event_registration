// components/ImageUpload.js
// A small "Upload" button placed next to an image-URL input. Picks a file from
// the admin's computer, uploads it to the public event-media bucket via
// /api/admin/upload-image, and calls onUploaded(url) with the resulting public
// URL (which then fills the URL field). The URL field stays fully usable.
"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "@/lib/uiStore";

/**
 * @param {{ onUploaded: (url: string) => void, className?: string, label?: string }} props
 */
export default function ImageUpload({ onUploaded, className = "", label = "Upload" }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);

    const pick = () => { if (!busy) inputRef.current?.click(); };

    const onChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file later
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) { toast.error(data.error || "Upload failed."); return; }
            onUploaded(data.url);
            toast.success("Image uploaded.");
        } catch {
            toast.error("Upload failed. Try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={onChange} className="hidden" />
            <button type="button" onClick={pick} disabled={busy}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-100 disabled:opacity-50 transition whitespace-nowrap ${className}`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {busy ? "Uploading…" : label}
            </button>
        </>
    );
}
