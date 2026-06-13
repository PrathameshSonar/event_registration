// app/api/webhook/razorpay/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
// import { sendWhatsAppNotification, sendEmailReceipt } from '@/lib/comms'; // We will use this later!

export async function POST(request) {
    try {
        // 1. Get the raw body as text (Required for Razorpay signature verification)
        const body = await request.text();

        // 2. Get the signature sent by Razorpay from the headers
        const signature = request.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // 3. Verify the signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error("Invalid Razorpay Signature!");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // 4. Parse the verified payload
        const event = JSON.parse(body);

        // 5. Handle the specific event
        if (event.event === 'payment.captured') {
            const paymentData = event.payload.payment.entity;
            const orderId = paymentData.order_id;

            console.log(`Webhook received: Payment captured for Order ${orderId}`);

            // Update the database to mark the payment as completed
            const { error } = await supabase
                .from('registrations')
                .update({ payment_status: 'completed' })
                .eq('razorpay_order_id', orderId);

            if (error) {
                console.error("Supabase update error inside webhook:", error);
            } else {
                // SUCCESS! 
                // Here is where we will trigger the WhatsApp message and Email Receipt
                // await sendWhatsAppNotification(...);
                // await sendEmailReceipt(...);
            }
        }

        // Return a 200 OK so Razorpay knows we received it
        return NextResponse.json({ status: "success" }, { status: 200 });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}