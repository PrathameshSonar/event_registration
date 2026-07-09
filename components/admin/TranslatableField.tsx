// components/admin/TranslatableField.tsx
// One translatable field for the admin editors: the English (base) input, plus an
// input for each non-English language (driven by LANGUAGES in lib/i18n). English
// is stored in the row's base column; other languages in the `translations` JSONB.
// Add a language to LANGUAGES → it automatically appears here. No per-field rewrites.
"use client";

import { LANGUAGES, DEFAULT_LANG } from '@/lib/i18n';

type Tr = Record<string, Record<string, string>>;

export default function TranslatableField({
    label, field, value, onValue, tr, onTr, multiline = false, rows = 2, placeholder, readOnlyBase = false,
}: {
    label: string;
    field: string;
    value: string;
    onValue: (v: string) => void;
    tr: Tr;
    onTr: (lang: string, field: string, v: string) => void;
    multiline?: boolean;
    rows?: number;
    placeholder?: string;
    readOnlyBase?: boolean;
}) {
    const others = LANGUAGES.filter((l) => l.code !== DEFAULT_LANG);
    const enCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition";
    const roCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-500 cursor-not-allowed";
    const trCls = "w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition";

    return (
        <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">{label} <span className="font-normal text-neutral-400 normal-case">(EN)</span></label>
            {readOnlyBase
                ? <input type="text" value={value} readOnly className={roCls} />
                : multiline
                    ? <textarea value={value} onChange={(e) => onValue(e.target.value)} rows={rows} placeholder={placeholder} className={`${enCls} resize-none`} />
                    : <input type="text" value={value} onChange={(e) => onValue(e.target.value)} placeholder={placeholder} className={enCls} />}
            <div className="mt-1.5 space-y-1.5">
                {others.map((l) => {
                    const v = tr[l.code]?.[field] || '';
                    return multiline
                        ? <textarea key={l.code} value={v} onChange={(e) => onTr(l.code, field, e.target.value)} rows={rows} placeholder={`${label} — ${l.native}`} className={`${trCls} resize-none`} />
                        : <input key={l.code} type="text" value={v} onChange={(e) => onTr(l.code, field, e.target.value)} placeholder={`${label} — ${l.native}`} className={trCls} />;
                })}
            </div>
        </div>
    );
}
