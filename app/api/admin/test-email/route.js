// app/api/admin/test-email/route.js
// Admin: send a test email to verify delivery. Two modes:
//   • Generic (no `kind`)  → a fixed "email works" probe (Gateway tab).
//   • Template (`kind` set) → renders the ADMIN'S CURRENT template content
//     (subject/html from the editor, unsaved edits included) with realistic sample
//     data, so they see exactly what a registrant would receive (Email Templates tab).
// Either way it goes through the real sendEmail() path, so it lands in message_log
// and any provider error is captured there.
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authorize } from '@/lib/adminGuard';
import { sendEmail, emailShell, emailConfigured, EMAIL_FROM } from '@/lib/email';
import { EMAIL_TEMPLATES, renderTemplate } from '@/lib/emailTemplates';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

// Realistic stand-ins for every variable used across the templates. Shared pool —
// variable names are consistent across templates (name/tier/amount/…).
const SAMPLE = {
    name: 'Ramesh Iyer',
    tier: 'Rajyabhishek Seva',
    attendees: 2,
    total: '11,000',
    amount: '5,500',
    advancePaid: '5,500',
    paymentRef: 'pay_TEST1234567890',
    eventDate: '12–14 Feb 2026',
    eventVenue: 'Shri Kshetra, Kolhapur',
    verifyUrl: 'https://example.com/entry/SAMPLE123',
    passUrl: 'https://example.com/pass/SAMPLE123',
    shortId: 'SAMPLE123',
    payLink: 'https://rzp.io/i/SAMPLElink',
    reason: 'This is a sample reason line.',
    hadPaid: true,
    refundPolicyUrl: 'https://example.com/refund',
    method: 'Bank Transfer',
    reference: 'UTR9988776655',
    siteUrl: 'https://example.com',
    registerLink: 'https://example.com/register/sample',
    feedbackLink: 'https://example.com/feedback/sample',
};

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    if (!emailConfigured()) {
        return NextResponse.json({ error: 'Email is not configured — set EMAIL_API_KEY in your environment.' }, { status: 400 });
    }

    const { to, kind, subject, html } = await request.json().catch(() => ({}));
    const recipient = String(to || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(recipient)) {
        return NextResponse.json({ error: 'Enter a valid recipient email address.' }, { status: 400 });
    }

    let finalSubject;
    let finalHtml;
    let label = 'test';

    if (kind) {
        // ── TEMPLATE TEST ────────────────────────────────────────────────────
        const def = EMAIL_TEMPLATES[kind];
        if (!def) return NextResponse.json({ error: `Unknown template "${kind}".` }, { status: 400 });
        label = def.label;

        // Use the editor's current content if supplied, else the built-in default.
        const subjectTpl = (typeof subject === 'string' && subject.trim()) ? subject : def.subject;
        const bodyTpl = (typeof html === 'string' && html.trim()) ? html : def.html;
        // Mirror sendTemplatedEmail()'s wrap rule: a hand-edited full document is
        // sent as-is; a fragment gets the branded shell.
        let wrap = def.wrap;
        if (typeof html === 'string' && html.trim()) {
            wrap = def.wrap && !/<(html|body|table|div)[\s>]/i.test(html.trim().slice(0, 200));
        }

        const sampleVars = { ...SAMPLE };
        if (kind === 'qr') {
            try { sampleVars.qrImage = await QRCode.toDataURL(SAMPLE.verifyUrl, { width: 220, margin: 2 }); }
            catch { sampleVars.qrImage = ''; }
        }

        const rendered = renderTemplate(bodyTpl, sampleVars);
        finalHtml = wrap ? emailShell(rendered) : rendered;
        finalSubject = `[TEST] ${renderTemplate(subjectTpl, sampleVars)}`;
    } else {
        // ── GENERIC DELIVERABILITY PROBE ─────────────────────────────────────
        const sentAt = new Date().toISOString();
        finalSubject = 'BaglaBhairav — test email ✅';
        finalHtml = emailShell(`
            <h2 style="margin:0 0 12px;color:#171717;">✅ Test email</h2>
            <p style="margin:0 0 14px;">If you're reading this, your email provider is wired correctly — tickets, confirmations, and balance links will deliver.</p>
            <table style="font-size:13px;color:#404040;border-collapse:collapse;">
                <tr><td style="padding:3px 14px 3px 0;color:#737373;">From</td><td>${EMAIL_FROM}</td></tr>
                <tr><td style="padding:3px 14px 3px 0;color:#737373;">Sent at</td><td>${sentAt}</td></tr>
            </table>
            <p style="margin:18px 0 0;font-size:12px;color:#a3a3a3;">Sent from Admin → Settings → Templates &amp; Config.</p>
        `);
    }

    const ok = await sendEmail({
        to: recipient,
        subject: finalSubject,
        html: finalHtml,
        log: { kind: 'test', metadata: { source: 'admin_test', template: kind || null } },
    });

    await logAudit({
        session, request, action: 'email.test', entity: 'system',
        summary: `Sent a test email (${label}) to ${recipient} — ${ok ? 'delivered' : 'FAILED'}`,
        metadata: { to: recipient, kind: kind || null, ok },
    });

    if (!ok) {
        return NextResponse.json({ error: 'Send failed. Open the Message Log for the provider error (often a DC/host mismatch or an unverified From domain).' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, to: recipient });
}
