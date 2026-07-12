// app/api/donate/verify/route.js
// Public: confirm a donation after Razorpay checkout. Verifies the payment
// signature (HMAC-SHA256 of "order_id|payment_id" with the key secret), marks the
// donation completed, and emails a receipt. This is the authoritative completion
// path for Seva (donations aren't seat-managed, so no webhook dependency).
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail, emailShell } from '@/lib/email';
import { escapeHtml } from '@/lib/escape';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json().catch(() => ({}));
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 });
    }

    // Verify the signature — proves the payment is genuine and untampered.
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    const a = Buffer.from(expected), b = Buffer.from(String(razorpay_signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
    }

    const { data: donation } = await supabaseAdmin
        .from('donations').select('*').eq('razorpay_order_id', razorpay_order_id).single();
    if (!donation) return NextResponse.json({ error: 'Donation not found.' }, { status: 404 });

    if (donation.status !== 'completed') {
        await supabaseAdmin.from('donations')
            .update({ status: 'completed', razorpay_payment_id }).eq('id', donation.id);

        // An anonymous donor has no name on file, so greet them generically — but
        // still send the receipt if they gave us an email.
        const greeting = donation.is_anonymous || !donation.name ? 'devotee' : donation.name;

        if (donation.email) {
            await sendEmail({
                to: donation.email,
                subject: '🙏 Thank you for your Seva — BaglaBhairav',
                html: emailShell(`
                    <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${escapeHtml(greeting)}</strong>,</p>
                    <p style="font-size:14px;color:#6b7280;line-height:1.6;">Thank you for your generous contribution of <strong>₹${Number(donation.amount).toLocaleString('en-IN')}</strong> towards the BaglaBhairav Mahotsav. Your Seva sustains this sacred gathering.</p>
                    <div style="background:#f9fafb;border:1px dashed #cbd5e1;border-radius:12px;padding:16px;margin:16px 0;font-size:13px;color:#6b7280;">
                        Payment Reference: <span style="font-family:monospace;color:#ea580c;">${escapeHtml(razorpay_payment_id)}</span>
                    </div>
                    <p style="font-size:12px;color:#9ca3af;">May you be blessed. 🙏</p>
                `),
                log: { kind: 'donation_receipt' },
            });
        }
    }

    return NextResponse.json({ ok: true, name: donation.name || null, amount: donation.amount });
}
