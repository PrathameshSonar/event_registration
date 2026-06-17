// app/refund/page.js
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPage() {
    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 py-16 px-4 md:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 border border-neutral-200 rounded-2xl shadow-sm">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-orange-600 mb-8 transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <h1 className="text-3xl font-bold mb-6">Cancellation & Refund Policy</h1>
                <div className="space-y-4 text-neutral-600 text-sm leading-relaxed">
                    <p>Last updated: June 2026</p>
                    <p>We understand that plans can change. Please review our policy regarding cancellations and refunds for the BaglaBhairav Mahotsav.</p>
                    <h2 className="text-lg font-bold text-neutral-900 mt-6">1. Cancellation Requests</h2>
                    <p>If you need to cancel your registration, you must submit a formal request via email to our support team at least 15 days prior to the event start date.</p>
                    <h2 className="text-lg font-bold text-neutral-900 mt-6">2. Refund Processing</h2>
                    <p>Approved refunds will be processed within 5-7 business days. The funds will be credited back to the original payment method used during checkout via the Razorpay gateway.</p>
                    <h2 className="text-lg font-bold text-neutral-900 mt-6">3. Non-Refundable Scenarios</h2>
                    <p>Voluntary additional donations are strictly non-refundable. Cancellations made within 15 days of the event, or failure to attend the event (&quot;no-shows&quot;), are not eligible for a refund.</p>
                </div>
            </div>
        </main>
    );
}