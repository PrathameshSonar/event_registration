// app/api/admin/feedback/route.js
//   GET  → list feedback + average rating (settings:manage)
//   POST → send a post-event thank-you + feedback link to all Paid (reminders:send)
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { sendTemplatedEmail } from '@/lib/email';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { getSiteName } from '@/lib/branding';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 2000;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

export async function GET() {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { data, error } = await supabaseAdmin
        .from('feedback').select('id, name, phone, rating, comment, created_at')
        .order('created_at', { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ error: 'Failed to load feedback.' }, { status: 500 });
    const rows = data || [];
    const avg = rows.length ? Math.round((rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.length) * 10) / 10 : 0;
    return NextResponse.json({ feedback: rows, count: rows.length, avg });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'reminders:send' });
    if (response) return response;

    const link = `${siteUrl()}/feedback`;
    const siteName = await getSiteName();
    const { data: regs } = await supabaseAdmin
        .from('registrations').select('id, first_name, last_name, email, phone')
        .eq('payment_status', 'completed').limit(MAX_BATCH + 1);

    // Dedupe by phone.
    const seen = new Set();
    const batch = [];
    for (const r of regs || []) {
        const key = String(r.phone || r.email || '').replace(/\D/g, '').slice(-10) || r.email;
        if (!key || seen.has(key)) continue;
        seen.add(key); batch.push(r);
        if (batch.length >= MAX_BATCH) break;
    }

    let emailSent = 0, waSent = 0;
    for (const r of batch) {
        if (r.email) {
            const ok = await sendTemplatedEmail({
                to: r.email,
                kind: 'feedback',
                registrationId: r.id,
                vars: { name: r.first_name || '', feedbackLink: link },
            });
            if (ok) emailSent++;
        }
        if (r.phone) {
            const ok = await sendWhatsAppText(r.phone, `🙏 *${siteName}* — thank you for joining us! We'd love your feedback (under a minute):\n${link}`, true, { kind: 'feedback', registrationId: r.id });
            if (ok) waSent++;
        }
    }

    await logAudit({
        session, request, action: 'feedback.request', entity: 'batch', entityId: null,
        summary: `Sent post-event thank-you + feedback to ${batch.length} paid attendee(s) — ${emailSent} email, ${waSent} WhatsApp`,
        metadata: { recipients: batch.length, emailSent, waSent },
    });

    return NextResponse.json({ ok: true, recipients: batch.length, emailSent, waSent });
}
