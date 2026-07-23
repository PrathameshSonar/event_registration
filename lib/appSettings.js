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

// ── Contact & Social ─────────────────────────────────────────────────────────
// How devotees reach the organisation. Deliberately NOT stored on the event
// record — contact details belong to the organisation, not a single event, and
// are edited in their own admin section (Settings → Contact & Social). Powers the
// Contact page, the footer, and the floating WhatsApp button.
export const DEFAULT_CONTACT = {
    phone: '',            // used for tel: and the wa.me WhatsApp link
    email: '',
    address: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: '',
    website_url: '',      // the Pitham / temple official website (external nav button)
};

// ── About Us page (Pitham section) ───────────────────────────────────────────
// An admin-editable section on /about about the Pitham/temple: a per-language
// heading + body and one image. Empty = it doesn't render. (Guruji is covered by
// the featured-guest "Guiding Light / Leadership" block, so it has no section here.)
export const DEFAULT_ABOUT_PAGE = {
    pitham: { title: { en: '', hi: '', mr: '' }, body: { en: '', hi: '', mr: '' }, image_url: '' },
};

// ── Declaration / Samanti Patra ──────────────────────────────────────────────
// A consent declaration every registrant + donor must read and accept (shown as a
// blocking modal before the form). Title + body are per-language plain text.
export const DEFAULT_DECLARATION = {
    enabled: false,
    title: { en: '', hi: '', mr: '' },
    body: { en: '', hi: '', mr: '' },
};

// ── General enquiry (homepage) ───────────────────────────────────────────────
// A single always-available "Enquire Now" on the homepage — independent of the
// Sevas/tiers, so leads can be collected BEFORE any Seva exists or is live. A
// submission becomes a category-less `enquired` registration in the Enquiries
// pipeline. Enabled by default so a fresh install collects interest out of the box.
export const DEFAULT_GENERAL_ENQUIRY = {
    enabled: true,
    title: { en: 'Have a question?', hi: '', mr: '' },
    subtitle: { en: "Leave your details and we'll get back to you.", hi: '', mr: '' },
};

// ── Seva categories (donate page) ────────────────────────────────────────────
// Pickable Seva cards on /donate (Annadaan, Deep Daan, Kunda sponsorship…), each
// with a suggested amount. Empty = the donate page falls back to plain amount
// presets. Admin-edited in Settings → Seva Categories.
export const DEFAULT_SEVA_CATEGORIES = [];

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
    // Media-header templates — approve these with a header FORMAT of IMAGE and
    // DOCUMENT respectively. They carry a file to someone outside the 24h window,
    // which a plain image/document message cannot do. See lib/whatsapp.js.
    entryPass: '',
    documentAnnouncement: '',
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

// ── Entry wristbands (checkpoint operations) ─────────────────────────────────
// A gate volunteer hands each arrival a coloured wristband matching their Seva.
// The mapping is Seva(category) → band colour, set in Settings → Entry Checkpoints,
// and shown large on the /entry/<id> scan screen so the volunteer can't mis-pick.
// Named, high-contrast colours only — a volunteer matches these by eye under a
// tent, so this is deliberately a fixed palette, not a free hex picker.
export const BAND_COLORS = {
    red: { label: 'Red', hex: '#dc2626', text: '#ffffff' },
    blue: { label: 'Blue', hex: '#2563eb', text: '#ffffff' },
    green: { label: 'Green', hex: '#16a34a', text: '#ffffff' },
    yellow: { label: 'Yellow', hex: '#facc15', text: '#1c1917' },
    orange: { label: 'Orange', hex: '#ea580c', text: '#ffffff' },
    purple: { label: 'Purple', hex: '#7c3aed', text: '#ffffff' },
    pink: { label: 'Pink', hex: '#db2777', text: '#ffffff' },
    gold: { label: 'Gold', hex: '#c9911f', text: '#ffffff' },
    white: { label: 'White', hex: '#ffffff', text: '#1c1917' },
    black: { label: 'Black', hex: '#171717', text: '#ffffff' },
};
export const BAND_KEYS = Object.keys(BAND_COLORS);

export const SETTINGS = {
    // { [categoryId]: bandKey } — unmapped Sevas simply show no band.
    entry_bands: {
        defaults: {},
        sanitize(v = {}) {
            const out = {};
            for (const [catId, band] of Object.entries(v || {})) {
                if (BAND_KEYS.includes(band)) out[String(catId).slice(0, 64)] = band;
            }
            return out;
        },
    },
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
    declaration: {
        defaults: DEFAULT_DECLARATION,
        sanitize(v = {}) {
            const perLang = (o, max) => {
                const out = {};
                for (const l of ['en', 'hi', 'mr']) out[l] = str(o?.[l], max);
                return out;
            };
            return {
                enabled: !!v.enabled,
                title: perLang(v.title, 160),
                body: perLang(v.body, 20000),
            };
        },
    },
    general_enquiry: {
        defaults: DEFAULT_GENERAL_ENQUIRY,
        sanitize(v = {}) {
            const perLang = (o, max) => {
                const out = {};
                for (const l of ['en', 'hi', 'mr']) out[l] = str(o?.[l], max);
                return out;
            };
            return {
                enabled: !!v.enabled,
                title: perLang(v.title, 160),
                subtitle: perLang(v.subtitle, 400),
            };
        },
    },
    seva_categories: {
        defaults: DEFAULT_SEVA_CATEGORIES,
        sanitize(v) {
            const arr = Array.isArray(v) ? v : [];
            return arr
                .map((s) => ({
                    icon: str(s?.icon, 8),
                    title: str(s?.title, 80),
                    desc: str(s?.desc, 200),
                    amount: Math.max(0, Math.floor(Number(s?.amount) || 0)),
                }))
                .filter((s) => s.title)   // a card needs at least a title
                .slice(0, 12);
        },
    },
    contact: {
        defaults: DEFAULT_CONTACT,
        sanitize(v = {}) {
            const out = { ...DEFAULT_CONTACT, ...v };
            out.phone = str(out.phone, 40);
            out.email = str(out.email, 120);
            out.address = str(out.address, 300);
            out.instagram_url = url(out.instagram_url);
            out.facebook_url = url(out.facebook_url);
            out.youtube_url = url(out.youtube_url);
            out.website_url = url(out.website_url);
            return out;
        },
    },
    about_page: {
        defaults: DEFAULT_ABOUT_PAGE,
        sanitize(v = {}) {
            const perLang = (o, max) => {
                const out = {};
                for (const l of ['en', 'hi', 'mr']) out[l] = str(o?.[l], max);
                return out;
            };
            const section = (s = {}) => ({
                title: perLang(s.title, 160),
                body: perLang(s.body, 8000),
                image_url: url(s.image_url),
            });
            return { pitham: section(v.pitham) };
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
    // Array-typed settings (e.g. seva_categories) must NOT be object-spread —
    // `{ ...[] }` turns an array into an index-keyed object. Return the stored
    // array as-is, or the default array when nothing is stored.
    if (Array.isArray(spec.defaults)) return Array.isArray(value) ? value : spec.defaults;
    return { ...spec.defaults, ...(value || {}) };
}
