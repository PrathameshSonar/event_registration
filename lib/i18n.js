// lib/i18n.js
// Multilingual content helpers (for admin-entered DB content — NOT the UI-string
// dictionaries in lib/lang/*, which stay as per-language files).
//
// Scalable model: each content row carries a `translations` JSONB:
//     { "hi": { "title": "…" }, "mr": { "title": "…" } }
// English lives in the base column (the fallback). To add a language, add it to
// LANGUAGES below — no schema change, no code change beyond translating.

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", native: "हिन्दी", short: "हिं" },
  { code: "mr", label: "मराठी", native: "मराठी", short: "मरा" },
];

export const LANG_CODES = LANGUAGES.map((l) => l.code);
export const DEFAULT_LANG = "en";

// Resolve one translatable field for a row in the requested language.
// Fallback chain:
//   1. translations[lang][field]         — the JSONB model (the source of truth)
//   2. row[`${field}_${lang}`]           — legacy per-column model, now retired;
//                                           kept as a harmless no-op safety net
//   3. row[field]                        — English base column (final fallback)
export function pick(row, field, lang = DEFAULT_LANG) {
  if (!row) return "";
  if (lang && lang !== DEFAULT_LANG) {
    const t = row.translations && row.translations[lang];
    if (t && t[field] != null && t[field] !== "") return t[field];
    const legacy = row[`${field}_${lang}`];
    if (legacy != null && legacy !== "") return legacy;
  }
  const base = row[field];
  return base == null ? "" : base;
}

// Build the translations JSONB from an admin editor's per-language field map,
// dropping empty values. `byLang` = { hi: { title: '…' }, mr: { … } }.
export function buildTranslations(byLang) {
  const out = {};
  for (const code of LANG_CODES) {
    if (code === DEFAULT_LANG) continue;
    const fields = byLang?.[code];
    if (!fields) continue;
    const clean = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v != null && String(v).trim() !== "") clean[k] = v;
    }
    if (Object.keys(clean).length) out[code] = clean;
  }
  return out;
}
