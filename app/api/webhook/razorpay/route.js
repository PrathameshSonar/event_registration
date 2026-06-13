// app/api/webhook/razorpay/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
// import { sendWhatsAppNotification, sendEmailReceipt } from '@/lib/comms';

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // 1. Verify Cryptographic Signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error("🚨 SECURITY ALERT: Invalid Razorpay Signature!");
            return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
        }

        const event = JSON.parse(body);
        const eventType = event.event;
        console.log(`\n🔔 Webhook Received: [${eventType}]`);

        // 2. Route the specific events
        switch (eventType) {

            // ==========================================
            // SCENARIO A: PAYMENT SUCCESSFULLY CAPTURED
            // ==========================================
            case 'payment.captured': {
                const payment = event.payload.payment.entity;
                const orderId = payment.order_id;

                // Anti-Duplication Check (Idempotency)
                // Check if we already marked this as completed to avoid sending 2 emails
                const { data: existingReg, error: fetchError } = await supabase
                    .from('registrations')
                    .select('payment_status, receipt_sent')
                    .eq('razorpay_order_id', orderId)
                    .single();

                if (fetchError || !existingReg) {
                    // Orphaned Payment Alert: Razorpay has the money, but the DB record is missing!
                    console.error(`❌ CRITICAL: Payment captured for Order ${orderId}, but no database record found!`);
                    // Note: We return 200 so Razorpay stops retrying. You will need to manually check Razorpay dashboard.
                    return NextResponse.json({ status: "record_not_found_but_acknowledged" }, { status: 200 });
                }

                if (existingReg.payment_status === 'completed') {
                    console.log(`✅ Idempotency Guard: Order ${orderId} is already marked as completed. Skipping duplicate execution.`);
                    return NextResponse.json({ status: "already_processed" }, { status: 200 });
                }

                // Update database to completed
                const { error: updateError } = await supabase
                    .from('registrations')
                    .update({
                        payment_status: 'completed',
                        razorpay_payment_id: payment.id
                    })
                    .eq('razorpay_order_id', orderId);

                if (updateError) {
                    console.error(`❌ DB Update Failed for Order ${orderId}:`, updateError);
                    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
                }

                console.log(`✅ SUCCESS: Order ${orderId} marked as COMPLETED.`);

                // TODO: Trigger Email & WhatsApp here!
                // await sendEmailReceipt(...);
                // await sendWhatsAppNotification(...);

                break;
            }

            // ==========================================
            // SCENARIO B: PAYMENT FAILED
            // ==========================================
            case 'payment.failed': {
                const payment = event.payload.payment.entity;
                const orderId = payment.order_id;
                const failureReason = payment.error_description;

                console.log(`⚠️ Payment Failed for Order ${orderId}. Reason: ${failureReason}`);

                // Update DB so Admin can see who tried to pay but failed
                await supabase
                    .from('registrations')
                    .update({ payment_status: 'failed' })
                    .eq('razorpay_order_id', orderId);

                break;
            }

            // ==========================================
            // SCENARIO C: REFUND SUCCESSFULLY PROCESSED
            // ==========================================
            case 'refund.processed': {
                const refund = event.payload.refund.entity;
                const paymentId = refund.payment_id;

                console.log(`⏪ Refund Processed for Payment ${paymentId}`);

                await supabase
                    .from('registrations')
                    .update({ payment_status: 'refunded' })
                    .eq('razorpay_payment_id', paymentId);

                break;
            }

            // ==========================================
            // UNHANDLED EVENTS
            // ==========================================
            default:
                console.log(`ℹ️ Unhandled Event Type: ${eventType}. Ignoring.`);
                break;
        }

        // 3. Always return 200 OK so Razorpay knows we received it
        return NextResponse.json({ status: "success" }, { status: 200 });

    } catch (error) {
        console.error("❌ Fatal Webhook Error:", error);
        // If our code literally crashes, tell Razorpay to try sending it again later (Status 500)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}