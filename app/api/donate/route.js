// app/api/donate/route.js
// Public: start a Seva/donation. Creates a Razorpay order for an arbitrary amount
// and a pending donations row. Completion is confirmed by /api/donate/verify
// (HMAC signature) — donations are NOT seat-managed like ticket registrations.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getRazorpayClient } from '@/lib/razorpayClient';

export const dynamic = 'force-dynamic';

const MIN = 1;
const MAX = 1_000_000; // ₹10,00,000 sanity cap
const bad = (m) => NextResponse.json({ error: m }, { status: 400 });

export async function POST(request) {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 500 });
    }

    const { name, phone, email, amount, message } = await request.json().catch(() => ({}));
    const cleanName = String(name || '').replace(/<[^>]*>/g, '').trim();
    const amt = Math.floor(Number(amount) || 0);
    if (!cleanName) return bad('Please enter your name.');
    if (!(amt >= MIN) || amt > MAX) return bad(`Enter an amount between ₹${MIN} and ₹${MAX.toLocaleString('en-IN')}.`);
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) return bad('Enter a valid email address.');
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanMsg = String(message || '').replace(/<[^>]*>/g, '').slice(0, 300).trim();

    let order;
    try {
        order = await getRazorpayClient().orders.create({
            amount: amt * 100, currency: 'INR', receipt: `seva_${Date.now()}`, notes: { type: 'donation' },
        });
    } catch (e) {
        console.error('Donation order failed:', e?.error?.description || e?.message);
        return NextResponse.json({ error: 'Could not start the payment. Try again.' }, { status: 502 });
    }

    const { data: row, error } = await supabaseAdmin.from('donations').insert({
        name: cleanName, phone: cleanPhone || null, email: cleanEmail || null,
        amount: amt, message: cleanMsg || null, razorpay_order_id: order.id,
    }).select('id').single();
    if (error) {
        console.error('Donation insert failed:', error.message);
        return NextResponse.json({ error: 'Could not record the donation. Try again.' }, { status: 500 });
    }

    return NextResponse.json({
        orderId: order.id, amount: order.amount, currency: order.currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, donationId: row.id,
    });
}
