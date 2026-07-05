// components/Toaster.js
// Renders the toast stack + the active modal dialog from lib/uiStore. Drop a
// single <Toaster/> into a page and use toast.* / confirmDialog / promptDialog.
"use client";

import { useSyncExternalStore, useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import {
    subscribeToasts, getToasts, dismissToast,
    subscribeDialog, getDialog, resolveDialog,
} from "@/lib/uiStore";

const TOAST_STYLE = {
    success: { cls: "border-green-200 bg-green-50 text-green-800", Icon: CheckCircle, ic: "text-green-600" },
    error: { cls: "border-red-200 bg-red-50 text-red-800", Icon: XCircle, ic: "text-red-600" },
    info: { cls: "border-neutral-200 bg-white text-neutral-800", Icon: Info, ic: "text-neutral-500" },
};

export default function Toaster() {
    const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
    const dialog = useSyncExternalStore(subscribeDialog, getDialog, getDialog);

    return (
        <>
            {/* Toasts */}
            <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
                {toasts.map((t) => {
                    const s = TOAST_STYLE[t.type] || TOAST_STYLE.info;
                    const Icon = s.Icon;
                    return (
                        <div key={t.id} className={`flex items-start gap-2.5 border rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${s.cls}`}>
                            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.ic}`} />
                            <span className="flex-1 whitespace-pre-line">{t.message}</span>
                            <button onClick={() => dismissToast(t.id)} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
                        </div>
                    );
                })}
            </div>

            {/* Dialog */}
            {dialog && <DialogView dialog={dialog} />}
        </>
    );
}

function DialogView({ dialog }) {
    const [value, setValue] = useState(dialog.defaultValue || "");
    const inputRef = useRef(null);
    const isPrompt = dialog.kind === "prompt";

    useEffect(() => { if (isPrompt && inputRef.current) inputRef.current.focus(); }, [isPrompt]);

    const cancel = () => resolveDialog(isPrompt ? null : false);
    const ok = () => {
        if (isPrompt) {
            if (dialog.required && !String(value).trim()) return;
            resolveDialog(value);
        } else {
            resolveDialog(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    {dialog.title && <h3 className="text-lg font-bold text-neutral-900 mb-1">{dialog.title}</h3>}
                    {dialog.message && <p className="text-sm text-neutral-600 whitespace-pre-line">{dialog.message}</p>}
                    {isPrompt && (
                        <input
                            ref={inputRef}
                            type={dialog.inputType || "text"}
                            value={value}
                            placeholder={dialog.placeholder}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") ok(); if (e.key === "Escape") cancel(); }}
                            className="mt-3 w-full px-3 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"
                        />
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 bg-neutral-50 border-t border-neutral-100">
                    <button onClick={cancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-200 transition">{dialog.cancelLabel || "Cancel"}</button>
                    <button onClick={ok} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-orange-600"}`}>{dialog.confirmLabel || "Confirm"}</button>
                </div>
            </div>
        </div>
    );
}
