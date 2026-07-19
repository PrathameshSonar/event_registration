// app/(site)/layout.tsx
// Shared chrome for every PUBLIC page (home, register, donate, my-pass, feedback,
// previous-events, pitham, legal). Renders the luxury Navbar + Footer around the
// page. Admin/scan live outside this group and never get this chrome.
//
// The footer's contact/socials come from getSiteEvent() — cached (unstable_cache)
// so this layout does NOT turn the static legal pages dynamic.
import LuxuryNavbar from "@/components/site/LuxuryNavbar";
import LuxuryFooter from "@/components/site/LuxuryFooter";
import { getSiteEvent } from "@/lib/siteEvent";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const event = await getSiteEvent();
  return (
    <>
      <LuxuryNavbar />
      <main className="min-h-screen bg-ivory text-brown">{children}</main>
      <LuxuryFooter event={event} />
    </>
  );
}
