// components/CheckoutForm.js
"use client";

import { useState } from 'react';
import { User, Mail, Phone, Users, ShieldCheck } from 'lucide-react';
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

    // Dynamically load the Razorpay checkout script
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

        // 1. Load the script
        const res = await loadRazorpayScript();
        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            setLoading(false);
            return;
        }

        // 2. Ask our backend for an Order ID
        const orderResponse = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: category.price }),
        });

        const orderData = await orderResponse.json();

        if (!orderData.order) {
            alert("Server error. Please try again.");
            setLoading(false);
            return;
        }

        // 3. Configure Razorpay Popup options
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key here
            amount: orderData.order.amount,
            currency: "INR",
            name: "Shankhnad Mahotsav",
            description: `Registration for ${category.title}`,
            order_id: orderData.order.id,
            handler: async function (response) {
                // 4. Payment Successful! Save to Supabase
                const { error } = await supabase.from('registrations').insert([
                    {
                        category_id: category.id,
                        full_name: formData.fullName,
                        email: formData.email,
                        phone: formData.phone,
                        attendees_count: formData.attendeesCount,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        payment_status: 'completed'
                    }
                ]);

                if (error) {
                    console.error("Supabase Save Error:", error);
                    alert("Payment successful, but failed to save registration. Please contact support.");
                } else {
                    alert(`Success! Payment ID: ${response.razorpay_payment_id}`);
                    // Later: We will redirect to a success page or send WhatsApp here
                }
            },
            prefill: {
                name: formData.fullName,
                email: formData.email,
                contact: formData.phone,
            },
            theme: { color: "#ea580c" }, // Tailwind orange-600
        };

        // 5. Open the popup
        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        setLoading(false);
    };

    return (
        <form onSubmit={handlePayment} className="space-y-6">
            {/* Full Name */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Full Name</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="text" name="fullName" required onChange={handleChange} placeholder="Enter your full name" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition" />
                </div>
            </div>

            {/* Email Address */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="email" name="email" required onChange={handleChange} placeholder="name@example.com" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition" />
                </div>
            </div>

            {/* Phone Number */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">WhatsApp Number</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input type="tel" name="phone" required onChange={handleChange} placeholder="10-digit mobile number" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition" />
                </div>
            </div>

            {/* Attendees */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Total Attendees</label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <select name="attendeesCount" onChange={handleChange} defaultValue="1" className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition appearance-none">
                        <option value="1">1 Person</option>
                        <option value="2">2 People</option>
                        <option value="3">3 People</option>
                    </select>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-70">
                {loading ? "Processing..." : `Pay ₹${category.price} Securely`}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Secured transaction via Razorpay</span>
            </div>
        </form>
    );
}