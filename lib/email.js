// lib/email.js
// ── CENTRAL email configuration ──────────────────────────────────────────────
// The sender address, API key handling, provider SDK, and the shared branded HTML
// wrapper all live here so email config is in ONE place at deploy time. Callers
// supply only { to, subject, html } — nothing outside this file knows or cares
// which provider actually delivers the mail.
//
// ┌── SWAPPING PROVIDER (currently ZeptoMail HTTP API) ────────────────────────┐
// │ Change ONLY `deliver()` below (and, if the provider needs an SDK, its       │
// │ import + package.json dep). Do not touch any call site: `sendEmail()`'s     │
// │ signature, its boolean return, and the message_log write are all            │
// │ provider-neutral, and `emailShell()` is plain HTML.                         │
// │                                                                             │
// │ ⚠️ ATTACHMENTS are the one place the provider API shows through. We pass a  │
// │ neutral `[{ url, filename }]` and `deliver()` maps it to the provider's own │
// │ shape. ZeptoMail (unlike Resend) does NOT fetch URLs — it wants inline      │
// │ base64, so we fetch each file here and encode it (see buildZeptoAttachments │
// │ ). If you swap provider again, the attachment mapping is the ONE thing you  │
// │ must re-map. Nothing else here uses cc / bcc / reply-to.                    │
// └────────────────────────────────────────────────────────────────────────────┘
//
//   EMAIL_API_KEY   ZeptoMail "Send Mail Token" (Mail Agent → Setup → API). The
//                   'Zoho-enczapikey ' prefix is added automatically if omitted.
//   EMAIL_FROM      From header, e.g. 'BaglaBhairav <tickets@yourdomain.com>'
//                   (must be an address on your verified ZeptoMail domain).
//   EMAIL_API_URL   (optional) full API endpoint. Defaults to the INDIA data
//                   centre. ⚠️ The host MUST match your account's DC — use
//                   'https://api.zeptomail.com/v1.1/email' for a global/US account.
//
// The legacy RESEND_API_KEY / RESEND_FROM names are still read as a fallback so a
// half-migrated deployment doesn't hard-crash (the token format differs, so set
// EMAIL_API_KEY to the ZeptoMail token to actually send).
import { logMessage } from '@/lib/messageLog';
import { EMAIL_TEMPLATES, renderTemplate } from '@/lib/emailTemplates';
import { getEmailTemplates } from '@/lib/settingsServer';

const API_KEY = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;

export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'BaglaBhairav <noreply@example.com>';

export function emailConfigured() {
    return !!API_KEY;
}

// ── THE ONLY PROVIDER-SPECIFIC CODE IN THE APP ───────────────────────────────
// Sends one email via the ZeptoMail HTTP API. Returns { ok, error } — never throws.
// To change provider, rewrite this function's body and nothing else.
const ZEPTO_ENDPOINT = process.env.EMAIL_API_URL || 'https://api.zeptomail.in/v1.1/email';

// "BaglaBhairav <tickets@domain.com>" → { name, address } — ZeptoMail wants them split.
function parseSender(str) {
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(str || '');
    if (m) return { name: m[1] || undefined, address: m[2].trim() };
    return { address: (str || '').trim() };
}

const MIME_BY_EXT = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', csv: 'text/csv', txt: 'text/plain',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
function mimeFor(filename) {
    const ext = String(filename || '').split('.').pop()?.toLowerCase();
    return MIME_BY_EXT[ext] || 'application/octet-stream';
}

// Neutral input is [{ url, filename }]. ZeptoMail can't fetch URLs, so we pull each
// file and inline it as base64. Best-effort: a file that fails to fetch is skipped
// (the mail still goes out) rather than aborting the send.
async function buildZeptoAttachments(attachments) {
    const out = [];
    for (const a of attachments) {
        if (!a?.url) continue;
        try {
            const r = await fetch(a.url);
            if (!r.ok) { console.error('attachment fetch failed:', a.url, r.status); continue; }
            const buf = Buffer.from(await r.arrayBuffer());
            out.push({ content: buf.toString('base64'), mime_type: mimeFor(a.filename), name: a.filename || 'attachment' });
        } catch (e) {
            console.error('attachment fetch error:', a.url, e?.message);
        }
    }
    return out;
}

async function deliver({ to, subject, html, attachments }) {
    const token = API_KEY.startsWith('Zoho-enczapikey') ? API_KEY : `Zoho-enczapikey ${API_KEY}`;
    const payload = {
        from: parseSender(EMAIL_FROM),
        to: (Array.isArray(to) ? to : [to]).filter(Boolean).map((address) => ({ email_address: { address } })),
        subject,
        htmlbody: html,
    };
    if (attachments?.length) {
        const built = await buildZeptoAttachments(attachments);
        if (built.length) payload.attachments = built;
    }

    let res;
    try {
        res = await fetch(ZEPTO_ENDPOINT, {
            method: 'POST',
            headers: { Authorization: token, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        return { ok: false, error: e?.message || 'Network error reaching ZeptoMail' };
    }
    if (res.ok) return { ok: true };

    // Surface ZeptoMail's structured error into the message_log for debugging.
    let detail = `HTTP ${res.status}`;
    try {
        const body = await res.json();
        detail = body?.error?.details?.[0]?.message || body?.error?.message || body?.message || JSON.stringify(body);
    } catch { /* non-JSON error body */ }
    return { ok: false, error: detail };
}
// ─────────────────────────────────────────────────────────────────────────────

// Send an email from the configured sender. Returns true on success, false on any
// error (best-effort — a notification failure must never break the caller's flow).
// `html` is used as-is if you pass full markup; otherwise wrap `inner` in the
// shared shell via emailShell().
//
// EVERY send is recorded to message_log from here, so the delivery log is complete
// by construction — a caller cannot forget to log. Pass `log: { kind, registrationId }`
// to attach business context; without it the row still lands, just with a null kind.
// `skipLog` is for the resend path, which writes its own row linked to the original.
// `attachments` is the provider-neutral shape [{ url, filename }] — see deliver().
export async function sendEmail({ to, subject, html, attachments = null, log = null, skipLog = false }) {
    if (!emailConfigured() || !to) return false;

    const recipients = Array.isArray(to) ? to : [to];
    let ok = false;
    let errMsg = null;
    try {
        const res = await deliver({ to: recipients, subject, html, attachments });
        ok = res.ok;
        if (!ok) {
            errMsg = res.error;
            console.error('email send failed:', errMsg);
        }
    } catch (e) {
        errMsg = e?.message || 'Unknown error';
        console.error('email send error:', errMsg);
    }

    if (!skipLog) {
        // One row per recipient, so a per-person log/resend works for bulk sends too.
        const meta = { ...(log?.metadata || {}) };
        if (attachments?.length) meta.attachments = attachments.map((a) => a.filename).filter(Boolean);
        for (const r of recipients) {
            await logMessage({
                channel: 'email', recipient: r, ok, subject, body: html,
                error: errMsg, kind: log?.kind, registrationId: log?.registrationId,
                metadata: Object.keys(meta).length ? meta : null,
            });
        }
    }
    return ok;
}

// ── Templated sends ──────────────────────────────────────────────────────────
// The one way transactional email copy is produced. Resolves the template for a
// message kind — an admin override from Settings if there is one, otherwise the
// default in lib/emailTemplates.js — renders it with `vars`, and sends.
//
// Callers pass only DATA. No sender carries inline HTML any more, so the copy has
// exactly one home and Settings → Templates can genuinely change what goes out.
//
// Returns the same boolean as sendEmail().
export async function sendTemplatedEmail({ to, kind, vars = {}, attachments = null, registrationId = null, metadata = null }) {
    if (!to) return false;

    const def = EMAIL_TEMPLATES[kind];
    if (!def) {
        console.error(`sendTemplatedEmail: unknown template kind "${kind}"`);
        return false;
    }

    let subject = def.subject;
    let body = def.html;
    let wrap = def.wrap;

    try {
        const overrides = await getEmailTemplates();
        const custom = overrides?.[kind];
        if (custom && (custom.subject || custom.html?.trim())) {
            if (custom.subject) subject = custom.subject;
            if (custom.html?.trim()) {
                body = custom.html;
                // A hand-edited template is taken as the complete body unless it's
                // clearly a fragment — wrapping someone's full <div> layout in the
                // shell again would nest two branded headers.
                wrap = def.wrap && !/<(html|body|table|div)[\s>]/i.test(custom.html.trim().slice(0, 200));
            }
        }
    } catch (e) {
        // Never let a settings failure stop a ticket going out — fall back to default.
        console.error('email template lookup failed (using default):', e?.message);
    }

    const rendered = renderTemplate(body, vars);
    return sendEmail({
        to,
        subject: renderTemplate(subject, vars),
        html: wrap ? emailShell(rendered) : rendered,
        attachments,
        log: { kind, registrationId, metadata },
    });
}

// Shared branded wrapper — dark header + white body card. Pass the inner HTML.
export function emailShell(inner) {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#171717;padding:24px;text-align:center;"><span style="color:#ea580c;font-size:12px;font-weight:bold;text-transform:uppercase;">BaglaBhairav</span><div style="color:#fff;font-size:22px;font-weight:800;margin-top:4px;">बगलाभैरव महोत्सव</div></div>
        <div style="padding:32px;background:#fff;color:#404040;">${inner}</div>
    </div>`;
}
