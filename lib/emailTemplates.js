// lib/emailTemplates.js
// CLIENT + SERVER SAFE. Every transactional email, in one editable registry.
//
// This is the SINGLE SOURCE OF TRUTH for email copy. The senders (ticket.js,
// notify.js, payments.js, send-qr, waitlist, feedback, donate) no longer carry
// inline HTML — they call renderEmail(kind, vars) and get { subject, html } back.
// An admin can override any template in Settings → Templates & Config; with no
// override, the default below is used, so the shipped emails are unchanged.
//
// No supabase import here — the admin editor (a client component) imports the
// registry for its defaults and variable lists. The DB lookup lives in lib/email.js.
//
// TEMPLATE SYNTAX (deliberately tiny — this is admin-facing, not a programming
// language):
//   {{name}}              insert a value, HTML-escaped
//   {{{payLinkHtml}}}     insert a value RAW (only for values we generate ourselves)
//   {{#if reason}}…{{/if}} include the block only when the value is non-empty
//
// `wrap: true`  → the body is inner HTML, wrapped in the branded emailShell().
// `wrap: false` → the body is the complete email (the ticket + QR mails have their
//                 own bespoke layouts; wrapping them would restyle them).

import { escapeHtml } from '@/lib/escape';

// ── the mini engine ──────────────────────────────────────────────────────────
const val = (vars, key) => {
    const v = vars?.[key];
    return v === undefined || v === null ? '' : String(v);
};

export function renderTemplate(tpl, vars = {}) {
    let out = String(tpl || '');

    // 1. {{#if key}}…{{/if}} — drop the block when the value is empty/falsey.
    out = out.replace(/\{\{#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, key, body) => {
        const v = vars?.[key];
        const truthy = !(v === undefined || v === null || v === '' || v === false || v === 0);
        return truthy ? body : '';
    });

    // 2. {{{key}}} — raw, no escaping. Only for HTML we generated ourselves.
    out = out.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, key) => val(vars, key));

    // 3. {{key}} — escaped. Everything user- or admin-supplied lands here, so a
    //    name like `<script>` can never break out into the markup.
    out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => escapeHtml(val(vars, key)));

    return out;
}

// ── the templates ────────────────────────────────────────────────────────────
// `vars` documents what each template can use — it drives the admin editor's
// variable palette, so keep it accurate.
export const EMAIL_TEMPLATES = {
    ticket: {
        label: 'Ticket confirmation',
        description: 'Sent the moment a registration is fully paid.',
        vars: ['name', 'tier', 'attendees', 'total', 'paymentRef', 'eventDate', 'eventVenue'],
        wrap: false,
        subject: '✅ Confirmed: Your Ticket for BaglaBhairav',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
  <div style="background-color: #171717; padding: 32px; text-align: center;">
    <span style="color: #ea580c; font-size: 12px; font-weight: bold; text-transform: uppercase;">Registration Confirmed</span>
    <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 28px; font-weight: 800;">BaglaBhairav</h1>
  </div>
  <div style="padding: 32px; background-color: #ffffff;">
    <p style="font-size: 16px; color: #404040; margin-top: 0;">Namaste <strong>{{name}}</strong>,</p>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Your registration is confirmed and your payment has been fully received. Below are your registration details. Your QR entry pass will be sent separately a few days before the event — please carry it at the venue gateway.</p>
    <div style="background-color: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #6b7280;">Access Tier:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">{{tier}}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Total Attendees:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">{{attendees}} Person(s)</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Payment Reference:</td><td style="padding: 6px 0; font-family: monospace; color: #ea580c; text-align: right; font-size: 12px;">{{paymentRef}}</td></tr>
        <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0 0 0; font-weight: bold; color: #111827;">Total Paid:</td><td style="padding: 12px 0 0 0; font-weight: 800; color: #16a34a; text-align: right; font-size: 18px;">₹{{total}}</td></tr>
      </table>
    </div>
    {{#if eventDate}}<div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="font-size: 13px; color: #9a3412; margin-bottom: 6px;">📅 <strong>Date:</strong> {{eventDate}}</div>
      {{#if eventVenue}}<div style="font-size: 13px; color: #9a3412;">📍 <strong>Venue:</strong> {{eventVenue}}</div>{{/if}}
    </div>{{/if}}
  </div>
</div>`,
    },

    qr: {
        label: 'QR entry pass',
        description: 'The scannable entry pass, sent before the event.',
        vars: ['name', 'tier', 'attendees', 'total', 'qrImage', 'passUrl', 'shortId'],
        wrap: false,
        subject: '🎟️ Your Entry QR Code — BaglaBhairav Mahotsav',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
  <div style="background:#171717;padding:32px;text-align:center;">
    <span style="color:#ea580c;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.1em;">Entry Pass</span>
    <h1 style="color:#fff;margin:8px 0 0;font-size:26px;font-weight:800;">BaglaBhairav Mahotsav</h1>
  </div>
  <div style="padding:32px;background:#fff;text-align:center;">
    <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">Please show this QR code at the event entrance. Our team will scan it to verify your registration.</p>
    <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:16px;padding:24px;display:inline-block;margin:16px auto;">
      <img src="{{{qrImage}}}" alt="Entry QR Code" width="220" height="220" style="display:block;border-radius:8px;" />
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;text-align:left;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:40%;">Name:</td><td style="padding:6px 0;font-weight:bold;color:#111827;">{{name}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td style="padding:6px 0;font-weight:bold;color:#111827;">{{tier}}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Attendees:</td><td style="padding:6px 0;font-weight:bold;color:#111827;">{{attendees}} Person(s)</td></tr>
        <tr style="border-top:1px solid #e5e7eb;"><td style="padding:10px 0 0;color:#6b7280;">Amount Paid:</td><td style="padding:10px 0 0;font-weight:800;color:#16a34a;font-size:16px;">₹{{total}}</td></tr>
      </table>
    </div>
    <p style="font-size:12px;color:#9ca3af;">Can't see the code? Open your pass: <a href="{{passUrl}}" style="color:#ea580c;">{{passUrl}}</a></p>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
    Ref: {{shortId}} · Secured via Razorpay
  </div>
</div>`,
    },

    balance_link: {
        label: 'Balance payment link',
        description: 'Sent to someone who paid an advance and still owes the balance.',
        vars: ['name', 'tier', 'amount', 'advancePaid', 'payLink'],
        wrap: true,
        subject: '⏳ Pay your balance — BaglaBhairav registration',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Thank you — your advance of <strong>₹{{advancePaid}}</strong> for <strong>{{tier}}</strong> is received. To confirm your registration and receive your entry pass, please clear the remaining balance:</p>
<div style="text-align:center;margin:24px 0;">
  <div style="font-size:13px;color:#6b7280;">Balance due</div>
  <div style="font-size:28px;font-weight:800;color:#ea580c;margin:4px 0 16px;">₹{{amount}}</div>
  <a href="{{payLink}}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">Pay Balance Now</a>
</div>
<p style="font-size:12px;color:#9ca3af;">Your entry pass is issued only after the full amount is paid. This is a No-Refund registration.</p>`,
    },

    // Distinct from balance_link on purpose: this is the *nudge* an admin sends
    // later ("this is a reminder…"), not the first "thanks, your advance is
    // received" mail. Collapsing the two would make a chase email read like a
    // fresh confirmation.
    balance_reminder: {
        label: 'Balance reminder (re-send)',
        description: 'Sent when an admin re-sends the balance link to chase payment.',
        vars: ['name', 'tier', 'amount', 'payLink'],
        wrap: true,
        subject: '⏳ Reminder: pay your balance — BaglaBhairav',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">This is a reminder to clear your remaining balance of <strong>₹{{amount}}</strong> for <strong>{{tier}}</strong>.</p>
<p><a href="{{payLink}}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Pay Balance Now</a></p>
<p style="font-size:12px;color:#9ca3af;">Your entry pass is issued only after full payment. No-refund policy applies.</p>`,
    },

    payment_link: {
        label: 'Payment link (enquiry)',
        description: 'Sent when an admin converts an enquiry — asks the lead to pay.',
        vars: ['name', 'tier', 'amount', 'payLink'],
        wrap: true,
        subject: '🙏 Complete your registration — BaglaBhairav',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Thank you for your interest in <strong>{{tier}}</strong>. To confirm your registration and receive your entry pass, please complete the payment:</p>
<div style="text-align:center;margin:24px 0;">
  <div style="font-size:13px;color:#6b7280;">Amount payable</div>
  <div style="font-size:28px;font-weight:800;color:#ea580c;margin:4px 0 16px;">₹{{amount}}</div>
  <a href="{{payLink}}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">Pay &amp; Confirm</a>
</div>
<p style="font-size:12px;color:#9ca3af;">Your entry pass is issued only after the full amount is paid. This is a No-Refund registration.</p>`,
    },

    cancellation: {
        label: 'Cancellation notice',
        description: 'Sent when an admin cancels a registration. Cancelling never refunds.',
        vars: ['name', 'tier', 'reason', 'hadPaid', 'refundPolicyUrl'],
        wrap: true,
        subject: 'Your registration has been cancelled — {{tier}} (BaglaBhairav)',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Your registration for <strong>{{tier}}</strong> has been cancelled by our team. Any entry pass issued for it is no longer valid.</p>
{{#if reason}}<p style="font-size:14px;color:#b91c1c;line-height:1.6;"><strong>Reason:</strong> {{reason}}</p>{{/if}}
{{#if hadPaid}}<p style="font-size:14px;color:#6b7280;line-height:1.6;">As per our <a href="{{refundPolicyUrl}}" style="color:#ea580c;">no-refund policy</a>, no refund is issued on cancellation.</p>{{/if}}
<p style="font-size:14px;color:#6b7280;line-height:1.6;">If you believe this is a mistake, please reply to this email or contact us.</p>`,
    },

    offline_submitted: {
        label: 'Offline payment received',
        description: 'Sent when someone submits a bank/cheque/cash payment for verification.',
        vars: ['name', 'tier', 'method', 'reference'],
        wrap: true,
        subject: '⏳ Payment received — under verification (BaglaBhairav)',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">We've received your <strong>{{method}}</strong> payment details for <strong>{{tier}}</strong>{{#if reference}} (Ref: {{reference}}){{/if}}. Our team will verify it and confirm your registration shortly. Your entry pass is issued once the payment is verified.</p>`,
    },

    offline_rejected: {
        label: 'Offline payment rejected',
        description: "Sent when an admin can't verify an offline payment.",
        vars: ['name', 'tier', 'reason', 'siteUrl'],
        wrap: true,
        subject: '⚠️ Action needed: payment could not be verified (BaglaBhairav)',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">We couldn't verify your payment for <strong>{{tier}}</strong>.</p>
{{#if reason}}<p style="font-size:14px;color:#b91c1c;line-height:1.6;"><strong>Reason:</strong> {{reason}}</p>{{/if}}
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Please re-submit the correct payment details{{#if siteUrl}} at <a href="{{siteUrl}}" style="color:#ea580c;">{{siteUrl}}</a>{{/if}} or reply to this email.</p>`,
    },

    waitlist: {
        label: 'Waitlist — a seat opened',
        description: 'Sent when an admin notifies someone that a seat has freed up.',
        vars: ['name', 'tier', 'registerLink'],
        wrap: true,
        subject: '🎉 A spot opened up — {{tier}}',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Good news — a spot has opened up for <strong>{{tier}}</strong>. Register now before it fills again:</p>
<p><a href="{{registerLink}}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Register now</a></p>
<p style="font-size:12px;color:#9ca3af;">This spot is first-come — the link may stop working once seats fill.</p>`,
    },

    feedback: {
        label: 'Thank-you / feedback request',
        description: 'Sent after the event to every paid attendee.',
        vars: ['name', 'feedbackLink'],
        wrap: true,
        subject: '🙏 Thank you for joining the BaglaBhairav Mahotsav',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Thank you for being part of the BaglaBhairav Mahotsav — your presence made it special. 🙏</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">We'd love to hear how it was for you. It takes less than a minute:</p>
<p><a href="{{feedbackLink}}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Share your feedback</a></p>`,
    },

    donation_receipt: {
        label: 'Donation (Seva) receipt',
        description: 'Sent after a Seva contribution is confirmed.',
        vars: ['name', 'amount', 'paymentRef'],
        wrap: true,
        subject: '🙏 Thank you for your Seva — BaglaBhairav',
        html: `<p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>{{name}}</strong>,</p>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Thank you for your generous contribution of <strong>₹{{amount}}</strong> towards the BaglaBhairav Mahotsav. Your Seva sustains this sacred gathering.</p>
<div style="background:#f9fafb;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;color:#6b7280;">
  Payment Reference: <span style="font-family:monospace;color:#ea580c;">{{paymentRef}}</span>
</div>
<p style="font-size:12px;color:#9ca3af;">May you be blessed. 🙏</p>`,
    },
};

export const EMAIL_TEMPLATE_KINDS = Object.keys(EMAIL_TEMPLATES);
