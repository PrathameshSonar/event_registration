// app/api/admin/test-email/route.js
// Admin: send a sample email through the configured provider to verify delivery
// end-to-end (domain verification, token, data-centre). Goes through the exact same
// sendEmail() path as every real message, so it also writes to message_log — if it
// fails, the provider's error is captured there for debugging.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { sendEmail, emailShell, emailConfigured, EMAIL_FROM } from '@/lib/email';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    if (!emailConfigured()) {
        return NextResponse.json({ error: 'Email is not configured — set EMAIL_API_KEY in your environment.' }, { status: 400 });
    }

    const { to } = await request.json().catch(() => ({}));
    const recipient = String(to || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(recipient)) {
        return NextResponse.json({ error: 'Enter a valid recipient email address.' }, { status: 400 });
    }

    const sentAt = new Date().toISOString();
    const html = emailShell(`
        <h2 style="margin:0 0 12px;color:#171717;">✅ Test email</h2>
        <p style="margin:0 0 14px;">If you're reading this, your email provider is wired correctly — tickets, confirmations, and balance links will deliver.</p>
        <table style="font-size:13px;color:#404040;border-collapse:collapse;">
            <tr><td style="padding:3px 14px 3px 0;color:#737373;">From</td><td>${EMAIL_FROM}</td></tr>
            <tr><td style="padding:3px 14px 3px 0;color:#737373;">Sent at</td><td>${sentAt}</td></tr>
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:#a3a3a3;">Sent from Admin → Settings → Templates &amp; Config → Payment gateway.</p>
    `);

    const ok = await sendEmail({
        to: recipient,
        subject: 'BaglaBhairav — test email ✅',
        html,
        log: { kind: 'test', metadata: { source: 'admin_test' } },
    });

    await logAudit({
        session, request, action: 'email.test', entity: 'system',
        summary: `Sent a test email to ${recipient} — ${ok ? 'delivered' : 'FAILED'}`,
        metadata: { to: recipient, ok },
    });

    if (!ok) {
        return NextResponse.json({ error: 'Send failed. Open the Message Log for the provider error (often a DC/host mismatch or an unverified From domain).' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, to: recipient });
}
