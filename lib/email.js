// lib/email.js
// ── CENTRAL email configuration ──────────────────────────────────────────────
// The sender address, API key handling, provider SDK, and the shared branded HTML
// wrapper all live here so email config is in ONE place at deploy time. Callers
// supply only { to, subject, html } — nothing outside this file knows or cares
// which provider actually delivers the mail.
//
// ┌── SWAPPING PROVIDER (Resend → SES / Postmark / SendGrid / …) ──────────────┐
// │ Change ONLY `deliver()` below, plus the SDK import and the dependency in    │
// │ package.json. Do not touch any call site: `sendEmail()`'s signature, its    │
// │ boolean return, and the message_log write are all provider-neutral, and     │
// │ `emailShell()` is plain HTML.                                               │
// │                                                                             │
// │ ⚠️ ATTACHMENTS are the one place the provider API shows through. We pass a  │
// │ neutral `[{ url, filename }]` and `deliver()` maps it to the provider's own │
// │ shape (Resend takes `{ path, filename }` and fetches the URL itself; SES    │
// │ wants raw MIME, Postmark wants base64 `Content`). If you swap provider, the │
// │ attachment mapping is the ONE thing you must re-map — everything else is a  │
// │ straight port. Nothing else here uses cc / bcc / reply-to.                  │
// └────────────────────────────────────────────────────────────────────────────┘
//
//   EMAIL_API_KEY   provider API key (required to actually send)
//   EMAIL_FROM      From header, e.g. 'BaglaBhairav <tickets@yourdomain.com>'
//                   (must be a verified domain sender with your provider)
//
// The legacy RESEND_API_KEY / RESEND_FROM names are still honoured as a fallback
// so an existing deployment keeps working without touching its env vars.
import { Resend } from 'resend';
import { logMessage } from '@/lib/messageLog';

const API_KEY = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;

export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>';

export function emailConfigured() {
    return !!API_KEY;
}

// ── THE ONLY PROVIDER-SPECIFIC CODE IN THE APP ───────────────────────────────
// Sends one email. Returns { ok, error } — never throws.
// To change provider, rewrite this function's body and nothing else.
let _resend = null;
const client = () => (_resend ||= new Resend(API_KEY));

async function deliver({ to, subject, html, attachments }) {
    const payload = { from: EMAIL_FROM, to, subject, html };
    if (attachments?.length) {
        // Neutral input is [{ url, filename }]. Resend fetches `path` itself, so we
        // never buffer the file through this server. A different provider would map
        // the same neutral shape to base64 content here instead.
        payload.attachments = attachments
            .filter((a) => a?.url)
            .map((a) => ({ path: a.url, filename: a.filename || 'attachment' }));
    }
    const { error } = await client().emails.send(payload);
    return error ? { ok: false, error: error?.message || String(error) } : { ok: true };
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

// Shared branded wrapper — dark header + white body card. Pass the inner HTML.
export function emailShell(inner) {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#171717;padding:24px;text-align:center;"><span style="color:#ea580c;font-size:12px;font-weight:bold;text-transform:uppercase;">BaglaBhairav</span><div style="color:#fff;font-size:22px;font-weight:800;margin-top:4px;">बगलाभैरव महोत्सव</div></div>
        <div style="padding:32px;background:#fff;color:#404040;">${inner}</div>
    </div>`;
}
