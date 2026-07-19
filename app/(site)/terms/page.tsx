// app/(site)/terms/page.tsx — nav/footer come from the (site) layout.
import LegalShell from '@/components/site/LegalShell';

export const metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <LegalShell kicker="Legal" title="Terms & Conditions" updated="Last updated: June 2026">
      <p>By registering for our event or using this website, you agree to comply with and be bound by the following terms and conditions of use.</p>
      <h2>1. Registration &amp; Entry</h2>
      <p>All registrations are subject to verification. The organizers reserve the right to refuse entry or revoke registration at their sole discretion if any provided information is found to be false or violates our community guidelines.</p>
      <h2>2. Code of Conduct</h2>
      <p>Attendees are expected to maintain respectful behavior at all times during the event. The organizers reserve the right to remove any individual causing disruption without refund.</p>
      <h2>3. Changes to the Event</h2>
      <p>The organizers reserve the right to change the date, venue, or schedule of the event due to unforeseen circumstances or force majeure. In such cases, registered attendees will be notified via their registered contact details.</p>
    </LegalShell>
  );
}
