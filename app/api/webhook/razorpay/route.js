// app/api/webhook/razorpay/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Lazily initialized so missing RESEND_API_KEY during `next build` doesn't throw.
let _resend = null;
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

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
        // SCENARIO A: PAYMENT SUCCESSFULLY CAPTURED
        // ==========================================
        if (eventType === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            // 1. Fetch the user's full profile from our DB
            const { data: existingReg, error: fetchError } = await supabaseAdmin
                .from('registrations')
                .select('*, categories(title)')
                .eq('razorpay_order_id', orderId)
                .single();

            if (fetchError || !existingReg) {
                console.error(`❌ CRITICAL: Payment captured for Order ${orderId}, but no database record found!`);
                return NextResponse.json({ status: "record_not_found_but_acknowledged" }, { status: 200 });
            }

            // 2. Idempotency Guard (Prevents double-sending if Razorpay pings us twice)
            if (existingReg.payment_status === 'completed') {
                console.log(`✅ Idempotency Guard: Order ${orderId} is already completed.`);
                return NextResponse.json({ status: "already_processed" }, { status: 200 });
            }

            // No amount comparison here — Razorpay may add convenience fees that
            // legitimately change payment.amount vs. order amount. Security is
            // guaranteed by: (a) HMAC signature above, (b) price looked up
            // server-side from DB when the order was created (client never sets price).
            console.log(`💰 Captured ₹${(payment.amount / 100).toFixed(2)} for Order ${orderId}`);

            // 3. Mark Database as Completed
            const { error: updateError } = await supabaseAdmin
                .from('registrations')
                .update({
                    payment_status: 'completed',
                    razorpay_payment_id: paymentId
                })
                .eq('razorpay_order_id', orderId);

            if (updateError) {
                console.error(`❌ DB Update Failed for Order ${orderId}:`, updateError);
                return NextResponse.json({ error: "Database update failed" }, { status: 500 });
            }

            console.log(`✅ SUCCESS: Order ${orderId} marked as COMPLETED.`);

            // ==========================================
            // SECURE SERVER-SIDE TICKET DISPATCH
            // ==========================================
            const firstName = existingReg.first_name;
            const lastName = existingReg.last_name;
            const categoryTitle = existingReg.categories?.title || 'General Admission';
            const totalAmount = existingReg.total_amount;
            const attendeesCount = existingReg.attendees_count;
            const email = existingReg.email;
            const phone = existingReg.phone;

            // DISPATCH EMAIL
            if (email) {
                try {
                    await getResend().emails.send({
                        from: process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>',
                        to: [email],
                        subject: `✅ Confirmed: Your Ticket for BaglaBhairav`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="background-color: #171717; padding: 32px; text-align: center;">
                                <span style="color: #ea580c; font-size: 12px; font-weight: bold; tracking: 0.1em; text-transform: uppercase;">Registration Confirmed</span>
                                <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 28px; font-weight: 800;">BaglaBhairav</h1>
                            </div>
                            <div style="padding: 32px; background-color: #ffffff;">
                                <p style="font-size: 16px; color: #404040; margin-top: 0;">Namaste <strong>${firstName} ${lastName}</strong>,</p>
                                <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Your contribution has been successfully received. Below is your official digital entry pass parameter registry. Please keep this email handy at the venue gateway entrance.</p>
                                <div style="background-color: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    <tr><td style="padding: 6px 0; color: #6b7280;">Access Tier:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${categoryTitle}</td></tr>
                                    <tr><td style="padding: 6px 0; color: #6b7280;">Total Attendees:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${attendeesCount} Person(s)</td></tr>
                                    <tr><td style="padding: 6px 0; color: #6b7280;">Payment Reference:</td><td style="padding: 6px 0; font-family: monospace; color: #ea580c; text-align: right; font-size: 12px;">${paymentId}</td></tr>
                                    <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0 0 0; font-weight: bold; color: #111827;">Total Paid:</td><td style="padding: 12px 0 0 0; font-weight: 800; color: #16a34a; text-align: right; font-size: 18px;">₹${totalAmount}</td></tr>
                                </table>
                                </div>
                                <div style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 8px;">
                                📍 <strong>Venue & Dates:</strong> To be broadcasted shortly via your registered WhatsApp contact line.
                                </div>
                            </div>
                            <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
                                This is an automated operational billing transaction document verified via Razorpay Secured Pipelines.
                            </div>
                            </div>
                        `
                    });
                    console.log(`📧 Ticket emailed securely to ${email}`);
                } catch (emailErr) {
                    console.error("🚨 Webhook Email Failure:", emailErr);
                }
            }

            // DISPATCH WHATSAPP
            if (phone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
                try {
                    let cleanPhone = phone.replace(/\D/g, '');
                    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

                    const waPayload = {
                        messaging_product: "whatsapp",
                        to: cleanPhone,
                        type: "template",
                        template: {
                            name: "ticket_confirmation",
                            language: { code: "en" },
                            components: [
                                {
                                    type: "body",
                                    parameters: [
                                        { type: "text", text: `${firstName} ${lastName}` },
                                        { type: "text", text: categoryTitle },
                                        { type: "text", text: paymentId }
                                    ]
                                }
                            ]
                        }
                    };

                    await fetch(process.env.WHATSAPP_API_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(waPayload),
                    });
                    console.log(`💬 WhatsApp ticket sent securely to ${cleanPhone}`);
                } catch (waErr) {
                    console.error("🚨 Webhook WhatsApp Failure:", waErr);
                }
            }
        }

        // ==========================================
        // SCENARIO B & C: FAILURES & REFUNDS
        // ==========================================
        else if (eventType === 'payment.failed') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            console.log(`⚠️ Payment Failed for Order ${orderId}. Reason: ${payment.error_description}`);
            await supabaseAdmin.from('registrations').update({ payment_status: 'failed' }).eq('razorpay_order_id', orderId);
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