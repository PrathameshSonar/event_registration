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
export async function sendEmail({ to, subject, html }) {
    if (!emailConfigured() || !to) return false;
    try {
        const { error } = await client().emails.send({
            from: EMAIL_FROM,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        });
        if (error) { console.error('email send failed:', error?.message || error); return false; }
        return true;
    } catch (e) {
        console.error('email send error:', e?.message);
        return false;
    }
}

// Shared branded wrapper — dark header + white body card. Pass the inner HTML.
export function emailShell(inner) {
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#171717;padding:24px;text-align:center;"><span style="color:#ea580c;font-size:12px;font-weight:bold;text-transform:uppercase;">BaglaBhairav</span><div style="color:#fff;font-size:22px;font-weight:800;margin-top:4px;">बगलाभैरव महोत्सव</div></div>
        <div style="padding:32px;background:#fff;color:#404040;">${inner}</div>
    </div>`;
}
