// app/api/admin/broadcast/route.js
// Send a custom announcement (email + optional WhatsApp) to a segment of people.
// Requires the reminders:send permission (admin always passes).
//   POST { segment, categoryId?, channels:{email,whatsapp}, subject, body }
//   segment ∈ paid | tier | advance | enquiries | not_arrived
// Email is free-form (Resend). WhatsApp requires a pre-approved template (Meta
// policy forbids free-form broadcasts); we use the WHATSAPP_ANNOUNCE_TEMPLATE
// template with the body as its single parameter — if it isn't configured/approved
// those sends fail gracefully and are counted, while email still goes out.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { escapeHtml } from '@/lib/escape';
import { sendEmail, emailShell } from '@/lib/email';
import { sendWhatsAppTemplate, waConfigured, WHATSAPP_TEMPLATES } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 1000;
const SEGMENTS = ['paid', 'tier', 'advance', 'enquiries', 'not_arrived'];
const ENQUIRY = ['enquired', 'contacted', 'awaiting_payment'];

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'reminders:send' });
    if (response) return response;

    const { segment, categoryId, channels = {}, subject, body } = await request.json();
    if (!SEGMENTS.includes(segment)) return NextResponse.json({ error: 'Invalid segment.' }, { status: 400 });
    const text = String(body || '').trim();
    if (!text) return NextResponse.json({ error: 'Message body is required.' }, { status: 400 });
    if (!channels.email && !channels.whatsapp) return NextResponse.json({ error: 'Pick at least one channel.' }, { status: 400 });
    if (channels.email && !String(subject || '').trim()) return NextResponse.json({ error: 'Email needs a subject.' }, { status: 400 });

    // ── Resolve recipients ───────────────────────────────────────────────────
    let recipients = [];
    if (segment === 'not_arrived') {
        const [{ data: paid }, { data: ci }] = await Promise.all([
            supabaseAdmin.from('registrations').select('id, first_name, last_name, email, phone').eq('payment_status', 'completed'),
            supabaseAdmin.from('checkins').select('registration_id'),
        ]);
        const arrived = new Set((ci || []).map((c) => c.registration_id));
        recipients = (paid || []).filter((r) => !arrived.has(r.id));
    } else {
        let q = supabaseAdmin.from('registrations').select('id, first_name, last_name, email, phone');
        if (segment === 'paid') q = q.eq('payment_status', 'completed');
        else if (segment === 'advance') q = q.eq('payment_status', 'advance_paid');
        else if (segment === 'enquiries') q = q.in('payment_status', ENQUIRY);
        else if (segment === 'tier') {
            if (!categoryId) return NextResponse.json({ error: 'Choose a tier.' }, { status: 400 });
            q = q.eq('payment_status', 'completed').eq('category_id', categoryId);
        }
        recipients = (await q).data || [];
    }

    // Dedupe by phone (a person may have multiple registrations).
    const seen = new Set();
    const unique = [];
    for (const r of recipients) {
        const key = String(r.phone || r.email || r.id).replace(/\D/g, '').slice(-10) || r.id;
        if (seen.has(key)) continue;
        seen.add(key); unique.push(r);
    }
    const capped = unique.length > MAX_RECIPIENTS;
    const batch = unique.slice(0, MAX_RECIPIENTS);
    if (batch.length === 0) return NextResponse.json({ ok: true, emailSent: 0, waSent: 0, recipients: 0 });

    const htmlBody = escapeHtml(text).replace(/\n/g, '<br>');
    let emailSent = 0, waSent = 0;

    for (const r of batch) {
        if (channels.email && r.email) {
            const ok = await sendEmail({
                to: r.email,
                subject: String(subject).trim(),
                html: emailShell(`<p style="color:#404040;font-size:14px;line-height:1.7;margin:0;">Namaste ${escapeHtml(r.first_name || '')},<br><br>${htmlBody}</p>`),
            });
            if (ok) emailSent++;
        }
        if (channels.whatsapp && r.phone && waConfigured()) {
            if (await sendWhatsAppTemplate(r.phone, WHATSAPP_TEMPLATES.announcement, [text])) waSent++;
        }
    }

    await logAudit({
        session, request,
        action: 'broadcast.send', entity: 'batch', entityId: null,
        summary: `Broadcast "${String(subject || text).slice(0, 50)}" to ${segment} — ${emailSent} email(s), ${waSent} WhatsApp`,
        metadata: { segment, categoryId: categoryId || null, recipients: batch.length, emailSent, waSent, capped },
    });

    return NextResponse.json({ ok: true, recipients: batch.length, emailSent, waSent, capped });
}
