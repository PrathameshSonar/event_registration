// app/api/razorpay/route.js
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { amount, currency = "INR" } = body;

        // 1. Safety Check: Ensure keys exist on the server
        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error("Missing Razorpay Keys in Vercel Environment!");
            return NextResponse.json({ error: "Server missing payment gateway credentials." }, { status: 500 });
        }

        // 2. Safety Check: Ensure amount is valid
        if (!amount || isNaN(amount)) {
            return NextResponse.json({ error: "Invalid amount passed to server." }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: Math.round(amount * 100),
            currency,
            receipt: `rcpt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        return NextResponse.json(order, { status: 200 });

    } catch (error) {
        console.error("🚨 Razorpay API Error:", error);
        // Return the exact error description provided by Razorpay so you aren't guessing
        return NextResponse.json(
            { error: error.description || error.message || "Failed to create Razorpay order" },
            { status: 500 }
        );
    }
}