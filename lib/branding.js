// lib/branding.js
// SERVER-ONLY. Turns the `branding` setting into the CSS custom properties the
// whole site is themed from.
//
// WHY IT WORKS THIS WAY
// The site uses hardcoded Tailwind classes (bg-orange-600, text-gold-400, …) in
// ~260 places. Rewriting those into custom tokens would be an enormous, risky diff.
// Instead app/globals.css maps Tailwind's orange + gold SCALES onto CSS variables
// (--brand-500, --accent-400, …) whose defaults are the EXACT current values — so
// an unconfigured site renders byte-identically to before. Setting a brand colour
// simply overrides those variables at the <html> level.
//
// A brand colour is one hex value, but the site needs a whole 50→900 scale (pale
// tints for backgrounds, dark shades for hover). `ramp()` derives that scale from
// the seed by holding hue/saturation and walking lightness, so one picked colour
// produces a coherent palette instead of a lone button colour floating in orange.
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_BRANDING, withDefaults } from '@/lib/appSettings';

// ── colour maths (no dependency) ─────────────────────────────────────────────
function hexToHsl(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let s = 0, hue = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) hue = (b - r) / d + 2;
        else hue = (r - g) / d + 4;
        hue *= 60;
    }
    return { h: hue, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return Math.round(255 * v).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Target lightness per Tailwind step. Chosen to match the feel of Tailwind's own
// scales: very pale tints at 50–200, the seed sitting around 600.
const LIGHTNESS = { 50: 96, 100: 91, 200: 82, 300: 70, 400: 60, 500: 52, 600: 45, 700: 37, 800: 30, 900: 24 };

// Build a 50→900 scale from one seed colour. The seed's own hue/saturation are
// kept, so the result reads as "shades of THIS colour", not a generic ramp.
//
// The 600 step is pinned to the seed VERBATIM. That step is the primary button /
// link colour, and an admin who picks #1d4ed8 must get #1d4ed8 — not the ramp's
// nearest approximation of it (which lands a few percent darker, because the seed's
// own lightness rarely equals the table's 600 target exactly).
export function ramp(seed) {
    const { h, s } = hexToHsl(seed);
    // Pale tints look muddy at full saturation, so ease it off at the light end.
    const out = {};
    for (const [step, l] of Object.entries(LIGHTNESS)) {
        const sat = Number(step) <= 200 ? Math.min(s, s * 0.75 + 10) : s;
        out[step] = hslToHex(h, sat, l);
    }
    out[600] = normalizeHex(seed);
    return out;
}

// #abc → #aabbcc, and lowercase — so the pinned 600 is a valid CSS colour whatever
// form the admin typed.
function normalizeHex(hex) {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return `#${h.toLowerCase()}`;
}

// The exact values the site ships with today. When branding is untouched we emit
// THESE verbatim rather than a computed ramp, so the default look cannot drift.
const DEFAULT_PRIMARY_SCALE = {
    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
    500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
};
const DEFAULT_ACCENT_SCALE = {
    50: '#fbf6e9', 100: '#f5e9c8', 200: '#ecd79a', 300: '#e0bf63', 400: '#d4a017',
    500: '#b8860b', 600: '#96690a', 700: '#7a5308', 800: '#7a5308', 900: '#7a5308',
};

/**
 * The <style> body that themes the site. Returns '' when branding is at its
 * defaults — no colours are emitted, so the stylesheet's own defaults win and the
 * rendered CSS is unchanged from before this feature existed.
 */
export function brandCss(branding) {
    const b = withDefaults('branding', branding);
    const custom =
        b.primary_color !== DEFAULT_BRANDING.primary_color ||
        b.accent_color !== DEFAULT_BRANDING.accent_color;
    if (!custom) return '';

    const primary = b.primary_color === DEFAULT_BRANDING.primary_color
        ? DEFAULT_PRIMARY_SCALE : ramp(b.primary_color);
    const accent = b.accent_color === DEFAULT_BRANDING.accent_color
        ? DEFAULT_ACCENT_SCALE : ramp(b.accent_color);

    const vars = [
        ...Object.entries(primary).map(([k, v]) => `--brand-${k}:${v}`),
        ...Object.entries(accent).map(([k, v]) => `--accent-${k}:${v}`),
    ];
    return `:root{${vars.join(';')}}`;
}

// Cached so reading branding in the ROOT LAYOUT doesn't turn every page dynamic.
// Without this, a DB call in the layout would force /terms, /privacy, /pitham …
// to render per-request. Revalidates hourly; a branding save is not urgent.
export const getBranding = unstable_cache(
    async () => {
        try {
            const { data } = await supabaseAdmin
                .from('app_settings').select('value').eq('key', 'branding').single();
            return withDefaults('branding', data?.value);
        } catch {
            // Never let a settings read break the whole site.
            return { ...DEFAULT_BRANDING };
        }
    },
    ['branding'],
    { revalidate: 3600, tags: ['branding'] },
);

export const getSeo = unstable_cache(
    async () => {
        try {
            const { data } = await supabaseAdmin
                .from('app_settings').select('value').eq('key', 'seo').single();
            return withDefaults('seo', data?.value);
        } catch {
            return withDefaults('seo', null);
        }
    },
    ['seo'],
    { revalidate: 3600, tags: ['seo'] },
);
