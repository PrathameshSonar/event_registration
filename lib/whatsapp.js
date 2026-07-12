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

export const WHATSAPP_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

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
export function sendWhatsAppTemplate(phone, template, bodyParams = [], log = null, skipLog = false) {
    const components = bodyParams.length ? [{ type: 'body', parameters: bodyParams.map((t) => ({ type: 'text', text: String(t) })) }] : [];
    return post(
        {
            messaging_product: 'whatsapp', to: normalizeIndianPhone(phone), type: 'template',
            template: { name: template, language: { code: WHATSAPP_LANG }, components },
        },
        { template, templateParams: bodyParams },
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
