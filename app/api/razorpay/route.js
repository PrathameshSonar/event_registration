// app/api/razorpay/route.js
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, currency = "INR" } = body;

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Create the order
        const options = {
            amount: Math.round(amount * 100), // Convert to paise securely
            currency,
            receipt: `rcpt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        // Always return clean JSON
        return NextResponse.json(order, { status: 200 });

    } catch (error) {
        console.error("🚨 Razorpay API Error:", error);
        // Return a JSON error instead of crashing into an HTML page
        return NextResponse.json(
            { error: error.message || "Failed to create Razorpay order" },
            { status: 500 }
        );
    }
}