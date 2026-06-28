// app/api/webhook/razorpay/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { finalizeOrderCapture, finalizeBalancePaid } from '@/lib/payments';

export const dynamic = 'force-dynamic';

// Constant-time comparison to avoid timing side-channels on the signature.
function safeEqual(a, b) {
    const bufA = Buffer.from(a || '', 'utf8');
    const bufB = Buffer.from(b || '', 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('🚨 RAZORPAY_WEBHOOK_SECRET is not configured.');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        // 1. Verify Cryptographic Signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (!safeEqual(expectedSignature, signature)) {
            console.error("🚨 SECURITY ALERT: Invalid Razorpay Signature!");
            return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
        }

        const event = JSON.parse(body);
        const eventType = event.event;
        console.log(`\n🔔 Webhook Received: [${eventType}]`);

        // ==========================================
        // SCENARIO A: PAYMENT CAPTURED (advance order OR full order)
        // ==========================================
        if (eventType === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;

            const { data: reg, error: fetchError } = await supabaseAdmin
                .from('registrations')
                .select('*, categories(title)')
                .eq('razorpay_order_id', orderId)
                .single();

            // No match here may mean it's a Payment-Link (balance) payment — those
            // are handled by the payment_link.paid event below. Acknowledge & exit.
            if (fetchError || !reg) {
                console.log(`ℹ️ payment.captured for order ${orderId} has no matching advance/full registration (likely a payment-link balance). Acknowledged.`);
                return NextResponse.json({ status: "no_order_match_acknowledged" }, { status: 200 });
            }

            // Shared money-state logic: asserts captured == expected (→ amount_mismatch
            // if not), records advance + balance link, or completes + issues ticket.
            const result = await finalizeOrderCapture({ reg, capturedPaise: payment.amount, paymentId: payment.id });
            console.log(`💰 order ${orderId} → ${result.status}`);
            return NextResponse.json({ status: result.status }, { status: 200 });
        }

        // ==========================================
        // SCENARIO A2: BALANCE PAID via Payment Link → fully paid
        // ==========================================
        else if (eventType === 'payment_link.paid') {
            const link = event.payload.payment_link?.entity || {};
            const linkPayment = event.payload.payment?.entity || {};
            const regId = link.notes?.registration_id
                || (typeof link.reference_id === 'string' ? link.reference_id.replace(/^bal_/, '') : null);

            if (!regId) {
                console.error('❌ payment_link.paid with no registration reference. Acknowledged.');
                return NextResponse.json({ status: "no_reference_acknowledged" }, { status: 200 });
            }

            const { data: reg, error } = await supabaseAdmin
                .from('registrations')
                .select('*, categories(title)')
                .eq('id', regId)
                .single();
            if (error || !reg) {
                console.error(`❌ payment_link.paid: registration ${regId} not found. Acknowledged.`);
                return NextResponse.json({ status: "record_not_found_acknowledged" }, { status: 200 });
            }

            // The captured balance amount comes from the payment entity (paise);
            // fall back to the link's amount_paid. Shared logic asserts it matches.
            const capturedPaise = Number(linkPayment.amount) || Number(link.amount_paid) || 0;
            const result = await finalizeBalancePaid({ reg, capturedPaise, paymentId: linkPayment.id });
            console.log(`💰 balance link for ${reg.id} → ${result.status}`);
            return NextResponse.json({ status: result.status }, { status: 200 });
        }

        // ==========================================
        // SCENARIO B & C: FAILURES & REFUNDS
        // ==========================================
        else if (eventType === 'payment.failed') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            console.log(`⚠️ Payment Failed for Order ${orderId}. Reason: ${payment.error_description}`);
            // Only downgrade a still-pending order. A failed attempt can arrive
            // after a successful retry on the same order — never overwrite a
            // completed/advance_paid/mismatch row with 'failed'.
            await supabaseAdmin.from('registrations')
                .update({ payment_status: 'failed' })
                .eq('razorpay_order_id', orderId)
                .eq('payment_status', 'pending');
        } else if (eventType === 'refund.processed') {
            const refund = event.payload.refund.entity;
            console.log(`⏪ Refund Processed for Payment ${refund.payment_id}`);
            await supabaseAdmin.from('registrations').update({ payment_status: 'refunded' }).eq('razorpay_payment_id', refund.payment_id);
        }

        // Always return 200 OK so Razorpay knows we received the ping
        return NextResponse.json({ status: "success" }, { status: 200 });

    } catch (error) {
        console.error("❌ Fatal Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}