// app/(site)/layout.tsx
// Shared chrome for every PUBLIC page (home, register, donate, my-pass, feedback,
// previous-events, pitham, legal). Renders the luxury Navbar + Footer around the
// page. Admin/scan live outside this group and never get this chrome.
//
// The footer's contact/socials come from getContact() (app_settings, decoupled
// from the event); the event only supplies the venue as an address fallback. Both
// are cached (unstable_cache) so this layout does NOT turn static pages dynamic.
import LuxuryNavbar from "@/components/site/LuxuryNavbar";
import LuxuryFooter from "@/components/site/LuxuryFooter";
import { RegistrationProvider } from "@/components/RegistrationProvider";
import { getSiteEvent, getContact } from "@/lib/siteEvent";
import { isRegistrationOpen } from "@/lib/registrationStatus";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [event, contact] = await Promise.all([getSiteEvent(), getContact()]);
  const registrationOpen = isRegistrationOpen(event);
  return (
    <RegistrationProvider open={registrationOpen}>
      <LuxuryNavbar />
      <main className="min-h-screen bg-ivory text-brown">{children}</main>
      <LuxuryFooter event={event} contact={contact} />
    </RegistrationProvider>
  );
}
