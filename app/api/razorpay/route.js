import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
    try {
        // --- ADD THIS TEMPORARY DEBUG LOG ---
        console.log("Checking Keys on Server:");
        console.log("KEY ID:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
        console.log("SECRET EXISTS?", !!process.env.RAZORPAY_KEY_SECRET);
        // ------------------------------------

        const { amount } = await request.json();

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