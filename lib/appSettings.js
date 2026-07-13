// lib/appSettings.js
// CLIENT + SERVER SAFE. The registry of global app_settings keys.
//
// `app_settings` is a key/value JSONB table. Rather than hand-rolling a route per
// setting, every key is declared here once with its defaults and a sanitiser, and
// /api/admin/app-settings serves them all generically. Adding a new global setting
// = one entry here + a UI panel.
//
// No Supabase import — this file is imported by client components (for the defaults
// and the shape), so it must never pull in the service-role client.

const hex = (v, fallback) => {
    const s = String(v || '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : fallback;
};
const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const url = (v) => {
    const s = str(v, 500);
    return /^https?:\/\//i.test(s) ? s : '';
};

// ── Offline payment details (the original setting) ───────────────────────────
export const DEFAULT_BANK = {
    offline_enabled: false,
    methods: ['bank_transfer', 'cheque', 'cash'],
    account_name: '', account_number: '', ifsc: '', bank: '',
    upi_id: '', cheque_payee: '', instructions: '',
};

// ── Branding ─────────────────────────────────────────────────────────────────
// The colour DEFAULTS are the exact values the site already uses (Tailwind
// orange-600 / orange-700, gold-400). That matters: globals.css maps the whole
// orange + gold scales onto these variables, so an unconfigured site renders
// byte-identically to before. Only an admin explicitly picking a colour changes
// anything.
// NOTE: there is deliberately no "dark colour" here. The dark headers/footers use
// Tailwind `neutral-900`, which is ALSO the body-text colour — theming it would
// recolour every paragraph on the site. Brand colour + accent are the two knobs
// that actually mean something.
export const DEFAULT_BRANDING = {
    site_name: 'BaglaBhairav',
    logo_url: '',
    primary_color: '#ea580c',   // Tailwind orange-600 — buttons, links, CTAs
    accent_color: '#d4a017',    // gold-400 — dividers, ornament
};

// ── SEO ──────────────────────────────────────────────────────────────────────
// The homepage still prefers the ACTIVE EVENT's own title/description/hero image;
// these are the fallbacks, and what every other page uses. `og_image` finally gives
// the link preview a real image — `/og-image.jpg` was referenced but never existed.
export const DEFAULT_SEO = {
    site_title: 'BaglaBhairav | Annual Mahotsav',
    description: 'Join the BaglaBhairav Mahotsav. Reserve your pass, explore our Pitham principles, and connect with the community.',
    og_image: '',
    keywords: '',
};

export const SETTINGS = {
    bank_details: {
        defaults: DEFAULT_BANK,
        sanitize(v = {}) {
            const out = { ...DEFAULT_BANK, ...v };
            out.offline_enabled = !!out.offline_enabled;
            out.methods = Array.isArray(out.methods)
                ? out.methods.filter((m) => ['bank_transfer', 'cheque', 'cash', 'dd'].includes(m))
                : DEFAULT_BANK.methods;
            for (const k of ['account_name', 'account_number', 'ifsc', 'bank', 'upi_id', 'cheque_payee']) out[k] = str(out[k], 120);
            out.instructions = str(out.instructions, 1000);
            return out;
        },
    },
    branding: {
        defaults: DEFAULT_BRANDING,
        sanitize(v = {}) {
            const out = { ...DEFAULT_BRANDING, ...v };
            out.site_name = str(out.site_name, 60) || DEFAULT_BRANDING.site_name;
            out.logo_url = url(out.logo_url);
            out.primary_color = hex(out.primary_color, DEFAULT_BRANDING.primary_color);
            out.accent_color = hex(out.accent_color, DEFAULT_BRANDING.accent_color);
            delete out.dark_color; // retired — see the note on DEFAULT_BRANDING
            return out;
        },
    },
    seo: {
        defaults: DEFAULT_SEO,
        sanitize(v = {}) {
            const out = { ...DEFAULT_SEO, ...v };
            out.site_title = str(out.site_title, 120) || DEFAULT_SEO.site_title;
            out.description = str(out.description, 300) || DEFAULT_SEO.description;
            out.og_image = url(out.og_image);
            out.keywords = str(out.keywords, 300);
            return out;
        },
    },
};

export const SETTING_KEYS = Object.keys(SETTINGS);

// Merge a stored value over its defaults. Used on both read paths.
export function withDefaults(key, value) {
    const spec = SETTINGS[key];
    if (!spec) return value || {};
    return { ...spec.defaults, ...(value || {}) };
}
