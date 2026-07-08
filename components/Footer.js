// components/Footer.js
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-neutral-900 text-neutral-400 border-t border-neutral-800 mt-auto">
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">BaglaBhairav</h3>
                        <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">
                            Annual spiritual gathering — connecting devotees and contributors across Bharat.
                        </p>
                    </div>
                    <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                        <Link href="/" className="hover:text-white transition">Home</Link>
                        <Link href="/pitham" className="hover:text-white transition">Pitham</Link>
                        <Link href="/previous-events" className="hover:text-white transition">Past Events</Link>
                        <Link href="/my-pass" className="hover:text-white transition">Find My Registration</Link>
                        <Link href="/donate" className="hover:text-white transition">Donate / Seva</Link>
                        <Link href="/terms" className="hover:text-white transition">Terms &amp; Conditions</Link>
                        <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
                        <Link href="/refund" className="hover:text-white transition">Refund Policy</Link>
                    </nav>
                </div>
                <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span>© 2025 BaglaBhairav. All rights reserved.</span>
                    <span>Payments secured by Razorpay.</span>
                </div>
            </div>
        </footer>
    );
}
