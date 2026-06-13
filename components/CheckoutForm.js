// components/CheckoutForm.js
"use client";

import { useState } from 'react';
import { User, Mail, Phone, Users, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CheckoutForm({ category }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        attendeesCount: 1,
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);

        // 1. Load the Razorpay Script
        const res = await loadRazorpayScript();
        if (!res) {
            alert('Razorpay SDK failed to load. Please check your internet connection.');
            setLoading(false);
            return;
        }

        // 2. Generate the Razorpay Order ID from our backend
        const orderResponse = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: category.price }),
        });

        const orderData = await orderResponse.json();

        if (!orderData.order) {
            alert("Server error generating order. Please try again.");
            setLoading(false);
            return;
        }

        // 3. CRITICAL STEP: Save the "Pending" registration to Supabase FIRST
        // This ensures if the user closes the window after paying, the Webhook can still find their data.
        const { data: pendingRecord, error: dbError } = await supabase
            .from('registrations')
            .insert([
                {
                    category_id: category.id,
                    full_name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    attendees_count: formData.attendeesCount,
                    razorpay_order_id: orderData.order.id,
                    payment_status: 'pending' // Explicitly marking as pending
                }
            ])
            .select()
            .single();

        if (dbError) {
            console.error("Database Error:", dbError);
            alert("Failed to initialize registration. Please try again.");
            setLoading(false);
            return;
        }

        // 4. Configure Razorpay Popup options
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: orderData.order.amount,
            currency: "INR",
            name: "Shankhnad Mahotsav",
            description: `Registration for ${category.title}`,
            order_id: orderData.order.id,

            // 5. This handler runs ONLY if the user successfully pays in the popup
            handler: async function (response) {

                // Optimistically update the database to 'completed' from the frontend.
                // If this fails (e.g., browser crash), our Webhook will do it automatically!
                await supabase
                    .from('registrations')
                    .update({
                        payment_status: 'completed',
                        razorpay_payment_id: response.razorpay_payment_id
                    })
                    .eq('id', pendingRecord.id);

                alert(`Success! Your payment is confirmed. Reference: ${response.razorpay_payment_id}`);

                // Reset form or redirect to a success page
                setFormData({ fullName: '', email: '', phone: '', attendeesCount: 1 });
                // window.location.href = '/success'; (Optional: Create this page later)
            },
            prefill: {
                name: formData.fullName,
                email: formData.email,
                contact: formData.phone,
            },
            theme: { color: "#ea580c" }, // Tailwind orange-600
        };

        // 6. Open the payment popup
        const paymentObject = new window.Razorpay(options);

        // Handle if user manually closes the popup without paying
        paymentObject.on('payment.failed', function (response) {
            console.error(response.error.description);
            // The record stays 'pending' in Supabase, which is correct!
            alert("Payment was not completed. You can try again.");
        });

        paymentObject.open();
        setLoading(false);
    };

    return (
        <form onSubmit={handlePayment} className="space-y-6">

            {/* High-Value Warning for UPI Limits */}
            {category.price >= 100000 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>
                        <strong>Note:</strong> This transaction exceeds standard daily UPI limits (₹1,00,000).
                        Please select <strong>Netbanking</strong> or <strong>Card</strong> inside the Razorpay popup to ensure your payment does not fail.
                    </p>
                </div>
            )}

            {/* Full Name */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Full Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="text" name="fullName" value={formData.fullName} required onChange={handleChange} placeholder="Enter your full name" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition" />
                </div>
            </div>

            {/* Email Address */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="email" name="email" value={formData.email} required onChange={handleChange} placeholder="name@example.com" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition" />
                </div>
            </div>

            {/* Phone Number */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">WhatsApp Number</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="tel" name="phone" value={formData.phone} required onChange={handleChange} placeholder="10-digit mobile number" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition" />
                </div>
            </div>

            {/* Attendees */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Total Attendees</label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <select name="attendeesCount" value={formData.attendeesCount} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition appearance-none">
                        <option value="1">1 Person</option>
                        <option value="2">2 People</option>
                        <option value="3">3 People</option>
                        <option value="4">4 People</option>
                        <option value="5">5 People</option>
                    </select>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-70">
                {loading ? "Processing Securely..." : `Pay ₹${category.price} Securely`}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Secured transaction via Razorpay</span>
            </div>
        </form>
    );
}