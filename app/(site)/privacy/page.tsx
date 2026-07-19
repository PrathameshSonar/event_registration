// app/(site)/privacy/page.tsx — nav/footer come from the (site) layout.
import LegalShell from '@/components/site/LegalShell';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalShell kicker="Legal" title="Privacy Policy" updated="Last updated: June 2026">
      <p>We are committed to protecting your privacy and ensuring your personal information is handled securely.</p>
      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly to us when you register for the event, including your name, email address, phone number, physical address, date of birth, and any other details you choose to provide in the registration form.</p>
      <h2>2. How We Use Your Information</h2>
      <p>We use the collected information to process your registration, send you event tickets, communicate important updates, and provide customer support.</p>
      <h2>3. Data Security &amp; Payments</h2>
      <p>We do not store your credit card or payment processing details. All transactions are securely processed through Razorpay. We employ industry-standard security measures to protect your personal data stored on our servers.</p>
    </LegalShell>
  );
}
