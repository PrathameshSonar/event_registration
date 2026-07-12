// lib/email.js
// ── CENTRAL email (Resend) configuration ─────────────────────────────────────
// The sender address, API key handling, and the shared branded HTML wrapper live
// here so email config is in ONE place at deploy time. Each caller supplies only
// the recipient, subject, and inner HTML.
//
//   RESEND_API_KEY   Resend API key (required to actually send)
//   RESEND_FROM      From header, e.g. 'BaglaBhairav <tickets@yourdomain.com>'
//                    (must be a verified domain sender in Resend)
import { Resend } from 'resend';
import { logMessage } from '@/lib/messageLog';

let _resend = null;
const client = () => (_resend ||= new Resend(process.env.RESEND_API_KEY));

export const EMAIL_FROM = process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>';

export function emailConfigured() {
    return !!process.env.RESEND_API_KEY;
}

// Send an email from the configured sender. Returns true on success, false on any
// error (best-effort — a notification failure must never break the caller's flow).
// `html` is used as-is if you pass full markup; otherwise wrap `inner` in the
// shared shell via emailShell().
//
// EVERY send is recorded to message_log from here, so the delivery log is complete
// by construction — a caller cannot forget to log. Pass `log: { kind, registrationId }`
// to attach business context; without it the row still lands, just with a null kind.
// `skipLog` is for the resend path, which writes its own row linked to the original.
export async function sendEmail({ to, subject, html, log = null, skipLog = false }) {
    if (!emailConfigured() || !to) return false;

    const recipients = Array.isArray(to) ? to : [to];
    let ok = false;
    let errMsg = null;
    try {
        const { error } = await client().emails.send({ from: EMAIL_FROM, to: recipients, subject, html });
        if (error) {
            errMsg = error?.message || String(error);
            console.error('email send failed:', errMsg);
        } else {
            ok = true;
        }
    } catch (e) {
        errMsg = e?.message || 'Unknown error';
        console.error('email send error:', errMsg);
    }

    if (!skipLog) {
        // One row per recipient, so a per-person log/resend works for bulk sends too.
        for (const r of recipients) {
            await logMessage({
                channel: 'email', recipient: r, ok, subject, body: html,
                error: errMsg, kind: log?.kind, registrationId: log?.registrationId,
                metadata: log?.metadata || null,
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
