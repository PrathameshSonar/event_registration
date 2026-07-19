// app/(site)/refund/page.tsx — nav/footer come from the (site) layout.
import LegalShell from '@/components/site/LegalShell';

export const metadata = { title: 'Cancellation & Refund Policy' };

export default function RefundPage() {
  return (
    <LegalShell kicker="Legal" title="Cancellation & Refund Policy" updated="Last updated: June 2026">
      <p>We understand that plans can change. Please review our policy regarding cancellations and refunds.</p>
      <h2>1. Cancellation Requests</h2>
      <p>If you need to cancel your registration, you must submit a formal request via email to our support team at least 15 days prior to the event start date.</p>
      <h2>2. Refund Processing</h2>
      <p>Approved refunds will be processed within 5–7 business days. The funds will be credited back to the original payment method used during checkout via the Razorpay gateway.</p>
      <h2>3. Non-Refundable Scenarios</h2>
      <p>Voluntary additional donations are strictly non-refundable. Cancellations made within 15 days of the event, or failure to attend the event (&quot;no-shows&quot;), are not eligible for a refund.</p>
    </LegalShell>
  );
}
