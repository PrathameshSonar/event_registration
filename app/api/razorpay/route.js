// app/api/razorpay/route.js
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
    try {
        const { amount } = await request.json();

        // Razorpay requires the amount in smallest currency sub-unit (Paise for INR)
        // So ₹500 becomes 50000 paise.
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        return NextResponse.json({ order }, { status: 200 });

    } catch (error) {
        console.error("Razorpay Error:", error);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}