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
//   WHATSAPP_TEMPLATE_TICKET      → ticketConfirmation  (lib/ticket.js)
//   WHATSAPP_TEMPLATE_ANNOUNCE    → announcement        (admin broadcast)
//   WHATSAPP_TEMPLATE_PAYMENT     → paymentLink         (balance link + enquiry payment + resend)
//   WHATSAPP_TEMPLATE_WAITLIST    → waitlistOpen        (admin waitlist notify)
//
// ⚠️ All four are WIRED. Each template must be approved in Meta with a BODY that
// has exactly the variable count listed against it below, and NO dynamic-URL
// button — sendWhatsAppTemplate() only ever sends a `body` component, so a
// template expecting a button parameter will fail at send time.
//
// ⚠️ Everything sent via sendWhatsAppText / sendWhatsAppImage (QR pass, offline
// payment notices, cancellation, self-service lookup, feedback request) is
// FREE-FORM and therefore only delivers inside the 24-hour customer-service
// window. For a registrant who signed up on the website and never messaged the
// business, those sends are rejected by Meta and land in message_log as failed.
// Converting one of those to a guaranteed delivery means approving a template
// for it (an image-header template, in the QR pass's case).

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

    // ── MEDIA-HEADER TEMPLATES ───────────────────────────────────────────────
    // These exist because a plain image/document message is FREE-FORM and only
    // delivers inside the 24h window — useless for a registrant who signed up on
    // the website. A template carries the same media in its HEADER and delivers
    // any time. The header file is a per-send parameter; only the body wording is
    // approved, so one approval covers every attendee.

    // QR entry pass. Approve with HEADER FORMAT = IMAGE.
    // Body params: [name, tier, attendees, passLink]
    // Suggested body:
    //   "Namaste {{1}}, your entry pass for {{2}} is ready ({{3}} attendee/s).
    //    Show the QR above at the gate. Full pass: {{4}}"
    entryPass: process.env.WHATSAPP_TEMPLATE_ENTRY_PASS || 'entry_pass',

    // Announcement carrying a document. Approve with HEADER FORMAT = DOCUMENT.
    // Body params: [message]
    // Suggested body: "{{1}}"
    documentAnnouncement: process.env.WHATSAPP_TEMPLATE_DOC_ANNOUNCE || 'document_announcement',
};

// Which templates REQUIRE a media header, and of what format. A mismatch here is
// the most likely cause of a send failing at Meta ("expected 1 parameter for
// component header"), so it is declared rather than left implicit at call sites.
export const TEMPLATE_HEADER_FORMAT = {
    entryPass: 'image',
    documentAnnouncement: 'document',
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

// Meta REJECTS a template parameter containing a newline, a tab, or more than 4
// consecutive spaces — the whole send fails with a parameter-format error. That
// bites exactly where you'd least expect it: an admin types a normal multi-line
// announcement into the broadcast box, the email goes out perfectly, and every
// WhatsApp silently fails.
//
// Sanitising HERE rather than at the call sites means no future template send can
// reintroduce it — the same "complete by construction" reasoning as the message log.
// Line breaks become a single space; that is a real (documented) loss of formatting
// on WhatsApp, not something we can work around — the API simply forbids it.
export function sanitizeTemplateParam(value) {
    return String(value ?? '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {5,}/g, '    ')
        .trim();
}

// The rendered template body is capped by Meta at 1024 characters. A caller
// supplying free text (the broadcast) must check this BEFORE fanning out to a
// thousand recipients — see /api/admin/broadcast.
export const WHATSAPP_BODY_LIMIT = 1024;

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
// `opts.header` attaches MEDIA to the template's header component — this is how an
// image or document reaches someone OUTSIDE the 24h window (a plain image/document
// message cannot). Shape:
//     { type: 'image',    link }
//     { type: 'document', link, filename }
//     { type: 'video',    link }
// ⚠️ `link` must be a PUBLICLY FETCHABLE https URL — Meta downloads it server-side.
// A Supabase *signed* URL qualifies (the token is in the URL); a private path does
// not. Limits are Meta's: image 5 MB, document 100 MB, video 16 MB.
// ⚠️ The template must have been APPROVED with that header format. Sending a
// header to a header-less template (or omitting one it expects) fails at Meta.
export async function sendWhatsAppTemplate(phone, keyOrName, bodyParams = [], log = null, skipLog = false, opts = {}) {
    const { name, lang } = await resolveTemplate(keyOrName);
    const header = opts?.header;

    const components = [];
    if (header?.type && header?.link) {
        const media = header.type === 'document'
            ? { link: header.link, ...(header.filename ? { filename: header.filename } : {}) }
            : { link: header.link };
        components.push({ type: 'header', parameters: [{ type: header.type, [header.type]: media }] });
    }
    // Every param is sanitised — a newline anywhere fails the whole send at Meta.
    const cleanParams = bodyParams.map(sanitizeTemplateParam);
    if (cleanParams.length) {
        components.push({ type: 'body', parameters: cleanParams.map((t) => ({ type: 'text', text: t })) });
    }

    return post(
        {
            messaging_product: 'whatsapp', to: normalizeIndianPhone(phone), type: 'template',
            template: { name, language: { code: lang }, components },
        },
        // Log the RESOLVED name + the SANITISED params + the header, so a resend
        // replays exactly what was sent rather than re-deriving it (a re-derived
        // link could have expired, and raw params would fail the same way twice).
        {
            template: name,
            templateParams: cleanParams,
            imageUrl: header?.link || null,
            metadata: header ? { header: { type: header.type, filename: header.filename || null } } : null,
        },
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
