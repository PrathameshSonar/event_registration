// app/api/donate/verify/route.js
// Public: confirm a donation after Razorpay checkout. Verifies the payment
// signature (HMAC-SHA256 of "order_id|payment_id" with the key secret), marks the
// donation completed, and emails a receipt. This is the authoritative completion
// path for Seva (donations aren't seat-managed, so no webhook dependency).
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendTemplatedEmail } from '@/lib/email';

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
            await sendTemplatedEmail({
                to: donation.email,
                kind: 'donation_receipt',
                vars: {
                    name: greeting,
                    amount: Number(donation.amount).toLocaleString('en-IN'),
                    paymentRef: razorpay_payment_id,
                },
            });
        }
    }

    return NextResponse.json({ ok: true, name: donation.name || null, amount: donation.amount });
}
