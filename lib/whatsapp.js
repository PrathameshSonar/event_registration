// lib/whatsapp.js
// ── CENTRAL WhatsApp Cloud API configuration ─────────────────────────────────
// ALL WhatsApp template names live here so you can add/update them in ONE place at
// deploy time. Meta requires a PRE-APPROVED template for any business-initiated
// message (a message to someone who didn't message you in the last 24h — which is
// every registrant, since they sign up on the website). Free-form text only works
// inside that 24-hour window.
//
// After Meta approves your templates, either name them to match the defaults
// below, OR set the matching env var to the approved name — no code change needed.
//
//   WHATSAPP_TEMPLATE_LANG        language code for all templates (default 'en')
//   WHATSAPP_TEMPLATE_TICKET      → ticketConfirmation
//   WHATSAPP_TEMPLATE_ANNOUNCE    → announcement
//   WHATSAPP_TEMPLATE_PAYMENT     → paymentLink   (not wired yet — see note below)
//   WHATSAPP_TEMPLATE_WAITLIST    → waitlistOpen  (not wired yet — see note below)

import { logMessage } from '@/lib/messageLog';

import { getWhatsAppTemplateNames } from '@/lib/settingsServer';

export const WHATSAPP_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

// Resolution order for a template name: Settings → Templates (DB) → env var →
// the built-in default below. The DB layer exists so that when Meta approves a
// template under a different name, an admin can point at it WITHOUT a redeploy.
export async function resolveTemplate(keyOrName) {
    if (!WHATSAPP_TEMPLATE_KEYS.includes(keyOrName)) {
        // Not one of our keys — it's already a literal Meta template name (this is
        // how the message-log RESEND path replays a stored send).
        return { name: keyOrName, lang: WHATSAPP_LANG };
    }
    try {
        const cfg = await getWhatsAppTemplateNames();
        return {
            name: cfg?.[keyOrName]?.trim() || WHATSAPP_TEMPLATES[keyOrName],
            lang: cfg?.lang?.trim() || WHATSAPP_LANG,
        };
    } catch {
        return { name: WHATSAPP_TEMPLATES[keyOrName], lang: WHATSAPP_LANG };
    }
}

export const WHATSAPP_TEMPLATES = {
    // Sent when a registration is fully paid — lib/ticket.js.
    // Body params: [name, tier, paymentRef]
    ticketConfirmation: process.env.WHATSAPP_TEMPLATE_TICKET || 'ticket_confirmation',

    // Broadcast announcement to a segment — app/api/admin/broadcast/route.js.
    // Body params: [message]
    announcement: process.env.WHATSAPP_TEMPLATE_ANNOUNCE || 'announcement',

    // Payment / balance link (enquiry payment + advance balance).
    // Body params: [name, tier, amount, payLink]
    // Suggested template body:
    //   "Namaste {{1}}, complete your payment of ₹{{3}} for {{2}} here: {{4}}
    //    Your entry pass is issued after payment. — BaglaBhairav"
    paymentLink: process.env.WHATSAPP_TEMPLATE_PAYMENT || 'payment_link',

    // Waitlist "a seat opened up".
    // Body params: [name, tier, registerLink]
    // Suggested template body:
    //   "Namaste {{1}}, a spot opened up for {{2}}! Register now before it fills: {{3}} — BaglaBhairav"
    waitlistOpen: process.env.WHATSAPP_TEMPLATE_WAITLIST || 'waitlist_open',
};

export const WHATSAPP_TEMPLATE_KEYS = Object.keys(WHATSAPP_TEMPLATES);

export function waConfigured() {
    return !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN);
}

export function normalizeIndianPhone(phone) {
    let p = String(phone || '').replace(/\D/g, '');
    if (p.length === 10) p = `91${p}`;
    return p;
}

// Low-level POST to the WhatsApp API. Returns true only on an HTTP-2xx response
// (fetch does NOT throw on HTTP errors, so we check res.ok explicitly).
//
// EVERY send is recorded to message_log from here, so the delivery log is complete
// by construction — no call site can forget to log. `entry` carries what's needed
// to re-send the message verbatim later; `log: { kind, registrationId }` adds the
// business context. `skipLog` is used by the resend path, which logs its own row.
async function post(payload, entry = {}, log = null, skipLog = false) {
    if (!waConfigured()) return false;

    let ok = false;
    let errMsg = null;
    try {
        const res = await fetch(process.env.WHATSAPP_API_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            ok = true;
        } else {
            errMsg = `HTTP ${res.status}: ${await res.text().catch(() => '')}`.slice(0, 500);
            console.error('WhatsApp send failed:', errMsg);
        }
    } catch (e) {
        errMsg = e?.message || 'Unknown error';
        console.error('WhatsApp send error:', errMsg);
    }

    if (!skipLog) {
        const meta = { ...(log?.metadata || {}), ...(entry.metadata || {}) };
        await logMessage({
            channel: 'whatsapp', recipient: payload.to, ok, error: errMsg,
            kind: log?.kind, registrationId: log?.registrationId,
            template: entry.template ?? null,
            templateParams: entry.templateParams ?? null,
            imageUrl: entry.imageUrl ?? null,
            body: entry.body ?? null,
            metadata: Object.keys(meta).length ? meta : null,
        });
    }
    return ok;
}

// Business-initiated TEMPLATE message (works outside the 24h window). Returns bool.
//
// `keyOrName` should be one of WHATSAPP_TEMPLATE_KEYS ('ticketConfirmation', …) —
// the ACTUAL Meta template name is resolved at send time from Settings, so a
// re-approval under a new name needs no code change. A literal name still works
// (the message-log resend path replays the stored name).
export async function sendWhatsAppTemplate(phone, keyOrName, bodyParams = [], log = null, skipLog = false) {
    const { name, lang } = await resolveTemplate(keyOrName);
    const components = bodyParams.length ? [{ type: 'body', parameters: bodyParams.map((t) => ({ type: 'text', text: String(t) })) }] : [];
    return post(
        {
            messaging_product: 'whatsapp', to: normalizeIndianPhone(phone), type: 'template',
            template: { name, language: { code: lang }, components },
        },
        // Log the RESOLVED name, so a resend replays exactly what was sent.
        { template: name, templateParams: bodyParams },
        log, skipLog,
    );
}

// Free-form TEXT — only delivers inside the 24h customer-service window. Returns bool.
export function sendWhatsAppText(phone, body, previewUrl = true, log = null, skipLog = false) {
    return post(
        { messaging_product: 'whatsapp', to: normalizeIndianPhone(phone), type: 'text', text: { preview_url: previewUrl, body } },
        { body, metadata: { preview_url: previewUrl } },
        log, skipLog,
    );
}

// IMAGE with caption (used for the QR pass when a public URL exists). Returns bool.
export function sendWhatsAppImage(phone, link, caption, log = null, skipLog = false) {
    return post(
        { messaging_product: 'whatsapp', to: normalizeIndianPhone(phone), type: 'image', image: { link, caption } },
        { imageUrl: link, body: caption },
        log, skipLog,
    );
}
