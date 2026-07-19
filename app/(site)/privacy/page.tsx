// app/privacy/page.js
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 py-16 px-4 md:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 border border-neutral-200 rounded-2xl shadow-sm">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-orange-600 mb-8 transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
                <div className="space-y-4 text-neutral-600 text-sm leading-relaxed">
                    <p>Last updated: June 2026</p>
                    <p>At BaglaBhairav, we are committed to protecting your privacy and ensuring your personal information is handled securely.</p>
                    <h2 className="text-lg font-bold text-neutral-900 mt-6">1. Information We Collect</h2>
                    <p>We collect information you provide directly to us when you register for the event, including your name, email address, phone number, physical address, date of birth, and any other details you choose to provide in the registration form.</p>
                    <h2 className="text-lg font-bold text-neutral-900 mt-6">2. How We Use Your Information</h2>
                    <p>We use the collected information to process your registration, send you event tickets, communicate important updates regarding the Mahotsav, and provide customer support.</p>
                    <h2 className="text-lg font-bold text-neutral-900 mt-6">3. Data Security & Payments</h2>
                    <p>We do not store your credit card or payment processing details. All transactions are securely processed through Razorpay. We employ industry-standard security measures to protect your personal data stored on our servers.</p>
                </div>
            </div>
        </main>
    );
}