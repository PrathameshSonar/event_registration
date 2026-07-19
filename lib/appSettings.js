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
    // Two-line wordmark + italic subtitle in the nav/footer (blank → falls back to
    // site_name). A logo_url image still overrides the wordmark entirely.
    brand_line1: '',
    brand_line2: '',
    brand_subtitle: '',
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

// ── Email templates ──────────────────────────────────────────────────────────
// Only OVERRIDES are stored: `{ ticket: { subject, html }, … }`. A kind that isn't
// here uses the default from lib/emailTemplates.js, so the shipped emails are
// unchanged until someone deliberately edits one — and "reset" is just a delete.
export const DEFAULT_EMAIL_TEMPLATES = {};

// ── WhatsApp template names ──────────────────────────────────────────────────
// Meta requires a PRE-APPROVED template for business-initiated messages. The NAMES
// live in Meta; this maps our internal keys to whatever they were approved as, so a
// rename doesn't need a redeploy. Empty = fall back to the env var / built-in name.
export const DEFAULT_WHATSAPP_TEMPLATES = {
    ticketConfirmation: '',
    announcement: '',
    paymentLink: '',
    waitlistOpen: '',
    lang: '',
};

// ── QR entry pass ────────────────────────────────────────────────────────────
// Defaults are exactly what the code used before this was configurable.
export const DEFAULT_QR = {
    size: 280,              // px, the QR emailed / stored
    download_size: 400,     // px, the single-QR PNG download
    margin: 2,              // quiet zone, in modules
    dark: '#171717',
    light: '#ffffff',
    link_expiry_days: 30,   // signed-URL lifetime for the WhatsApp QR image
};

// ── Page headers (per-page hero image + copy) ────────────────────────────────
// The luxury theme gives every page a full-bleed hero image + kicker/title/subtitle.
// Admin sets them here; a page falls back to its i18n default when a field is blank.
export const PAGE_HERO_KEYS = ['about', 'event', 'registration', 'gallery', 'live', 'news', 'faq', 'contact'];
const EMPTY_HERO = { image: '', kicker: '', title: '', subtitle: '' };
export const DEFAULT_PAGE_HEROES = Object.fromEntries(PAGE_HERO_KEYS.map((k) => [k, { ...EMPTY_HERO }]));

export const SETTINGS = {
    page_heroes: {
        defaults: DEFAULT_PAGE_HEROES,
        sanitize(v = {}) {
            const out = {};
            for (const page of PAGE_HERO_KEYS) {
                const h = (v && v[page]) || {};
                out[page] = {
                    image: url(h.image),
                    kicker: str(h.kicker, 80),
                    title: str(h.title, 160),
                    subtitle: str(h.subtitle, 400),
                };
            }
            return out;
        },
    },
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
            out.brand_line1 = str(out.brand_line1, 40);
            out.brand_line2 = str(out.brand_line2, 40);
            out.brand_subtitle = str(out.brand_subtitle, 80);
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
    email_templates: {
        defaults: DEFAULT_EMAIL_TEMPLATES,
        sanitize(v = {}) {
            const out = {};
            for (const [kind, tpl] of Object.entries(v || {})) {
                if (!tpl || typeof tpl !== 'object') continue;
                const subject = str(tpl.subject, 200);
                const html = String(tpl.html ?? '').slice(0, 20000);
                // An empty override is the same as no override — this is how
                // "Reset to default" works: it just deletes the entry.
                if (!subject && !html.trim()) continue;
                out[kind] = { subject, html };
            }
            return out;
        },
    },
    whatsapp_templates: {
        defaults: DEFAULT_WHATSAPP_TEMPLATES,
        sanitize(v = {}) {
            const out = { ...DEFAULT_WHATSAPP_TEMPLATES };
            for (const k of Object.keys(DEFAULT_WHATSAPP_TEMPLATES)) out[k] = str(v?.[k], 80);
            return out;
        },
    },
    qr: {
        defaults: DEFAULT_QR,
        sanitize(v = {}) {
            const out = { ...DEFAULT_QR, ...v };
            const num = (x, lo, hi, dflt) => {
                const n = Math.round(Number(x));
                return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
            };
            out.size = num(out.size, 120, 1000, DEFAULT_QR.size);
            out.download_size = num(out.download_size, 120, 2000, DEFAULT_QR.download_size);
            out.margin = num(out.margin, 0, 10, DEFAULT_QR.margin);
            out.dark = hex(out.dark, DEFAULT_QR.dark);
            out.light = hex(out.light, DEFAULT_QR.light);
            // Supabase caps signed URLs well above this; a year is plenty and
            // keeps a stale WhatsApp image from living forever.
            out.link_expiry_days = num(out.link_expiry_days, 1, 365, DEFAULT_QR.link_expiry_days);
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
