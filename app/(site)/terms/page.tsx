// app/terms/page.js
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 py-16 px-4 md:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 border border-neutral-200 rounded-2xl shadow-sm">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-orange-600 mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
        <div className="space-y-4 text-neutral-600 text-sm leading-relaxed">
          <p>Last updated: June 2026</p>
          <p>Welcome to BaglaBhairav. By registering for our Mahotsav or using this website, you agree to comply with and be bound by the following terms and conditions of use.</p>
          <h2 className="text-lg font-bold text-neutral-900 mt-6">1. Registration & Entry</h2>
          <p>All registrations are subject to verification. The organizers reserve the right to refuse entry or revoke registration at their sole discretion if any provided information is found to be false or violates our community guidelines.</p>
          <h2 className="text-lg font-bold text-neutral-900 mt-6">2. Code of Conduct</h2>
          <p>Attendees are expected to maintain respectful behavior at all times during the event. The organizers reserve the right to remove any individual causing disruption without refund.</p>
          <h2 className="text-lg font-bold text-neutral-900 mt-6">3. Changes to the Event</h2>
          <p>The organizers reserve the right to change the date, venue, or schedule of the event due to unforeseen circumstances or force majeure. In such cases, registered attendees will be notified via their registered contact details.</p>
        </div>
      </div>
    </main>
  );
}