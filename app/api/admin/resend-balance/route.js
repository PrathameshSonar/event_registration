// Admin: re-send the balance payment link for an advance-paid registration.
// Reuses the stored link if present, otherwise creates a fresh one.
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

let _resend = null;
const getResend = () => (_resend ||= new Resend(process.env.RESEND_API_KEY));

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    if (reg.payment_status !== 'advance_paid' || Number(reg.amount_due) <= 0) {
        return NextResponse.json({ error: 'No outstanding balance for this registration.' }, { status: 400 });
    }

    const categoryTitle = reg.categories?.title || 'Registration';
    const dueRupees = Number(reg.amount_due) || 0;
    let shortUrl = reg.balance_link_url;

    // Create a link if one isn't stored yet.
    if (!shortUrl) {
        try {
            const razorpay = new Razorpay({
                key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            let cleanPhone = String(reg.phone || '').replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
            const link = await razorpay.paymentLink.create({
                amount: Math.round(dueRupees * 100),
                currency: 'INR',
                accept_partial: false,
                description: `Balance payment — ${categoryTitle} (BaglaBhairav)`,
                reference_id: `bal_${reg.id}_${Date.now()}`,
                customer: { name: `${reg.first_name} ${reg.last_name}`.trim(), email: reg.email || undefined, contact: cleanPhone || undefined },
                notify: { sms: false, email: false },
                reminder_enable: true,
                notes: { registration_id: reg.id, kind: 'balance' },
            });
            shortUrl = link?.short_url || null;
            if (shortUrl) await supabaseAdmin.from('registrations').update({ balance_link_url: shortUrl }).eq('id', reg.id);
        } catch (e) {
            console.error('Resend balance link creation failed:', e);
            return NextResponse.json({ error: 'Could not create payment link.' }, { status: 500 });
        }
    }
    if (!shortUrl) return NextResponse.json({ error: 'No payment link available.' }, { status: 500 });

    // Email
    let emailed = false, waSent = false;
    if (reg.email && process.env.RESEND_API_KEY) {
        try {
            await getResend().emails.send({
                from: process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>',
                to: [reg.email],
                subject: '⏳ Reminder: pay your balance — BaglaBhairav',
                html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                    <p>Namaste <strong>${reg.first_name} ${reg.last_name}</strong>,</p>
                    <p>This is a reminder to clear your remaining balance of <strong>₹${dueRupees.toLocaleString('en-IN')}</strong> for <strong>${categoryTitle}</strong>.</p>
                    <p><a href="${shortUrl}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Pay Balance Now</a></p>
                    <p style="font-size:12px;color:#9ca3af;">Your entry pass is issued only after full payment. No-refund policy applies.</p>
                </div>`,
            });
            emailed = true;
        } catch (e) { console.error('Resend balance email failed:', e); }
    }

    // WhatsApp
    if (reg.phone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
        try {
            let cleanPhone = String(reg.phone).replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
            const text = `🙏 *BaglaBhairav* reminder — balance due for *${categoryTitle}*: *₹${dueRupees.toLocaleString('en-IN')}*\nPay here:\n${shortUrl}`;
            await fetch(process.env.WHATSAPP_API_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { preview_url: true, body: text } }),
            });
            waSent = true;
        } catch (e) { console.error('Resend balance WhatsApp failed:', e); }
    }

    await logAudit({
        session, request,
        action: 'balance.resend',
        entity: 'registration', entityId: reg.id,
        summary: `Re-sent balance link (₹${dueRupees.toLocaleString('en-IN')}) to ${reg.first_name} ${reg.last_name}`,
        metadata: { amount_due: dueRupees, emailed, waSent },
    });

    return NextResponse.json({ ok: true, link: shortUrl, emailed, waSent });
}
