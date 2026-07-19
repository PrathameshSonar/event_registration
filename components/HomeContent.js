// components/HomeContent.js
// Luxury homepage composer. Assembles the section components (components/site/home/*)
// in story-flow order, wiring each to the admin-controlled data from app page.
// No content is hardcoded — a section hides itself when its data is empty.
// Navbar + Footer come from the shared (site) route-group layout.
"use client";

import { useState } from "react";

import FloatingActions from "@/components/FloatingActions";
import WaitlistModal from "@/components/WaitlistModal";

import Hero from "@/components/site/home/Hero";
import Livestream from "@/components/site/home/Livestream";
import AboutMahayagya from "@/components/site/home/AboutMahayagya";
import Leadership from "@/components/site/home/Leadership";
import Lineup from "@/components/site/home/Lineup";
import Pillars from "@/components/site/home/Pillars";
import Rituals from "@/components/site/home/Rituals";
import Benefits from "@/components/site/home/Benefits";
import SchedulePreview from "@/components/site/home/SchedulePreview";
import RegistrationCta from "@/components/site/home/RegistrationCta";
import DonateLive from "@/components/site/home/DonateLive";
import Testimonials from "@/components/site/home/Testimonials";
import Gallery from "@/components/site/home/Gallery";
import FinalCta from "@/components/site/home/FinalCta";

export default function HomeContent({ pageData, contact, categories, mediaItems, seatsTaken, schedule, highlights, guests, testimonials }) {
  const [waitlistCat, setWaitlistCat] = useState(null);

  const hasCategories = Array.isArray(categories) && categories.length > 0;
  const allGuests = guests || [];
  // Every featured guest renders as a Leadership hero (alternating layout). The
  // rest form the "Chief Guests" lineup. If none are featured, all show in lineup.
  const featuredGuests = allGuests.filter((g) => g.is_featured);
  const lineupGuests = featuredGuests.length ? allGuests.filter((g) => !g.is_featured) : allGuests;
  const bySection = (name) => (highlights || []).filter((h) => (h.section || "highlights") === name);
  const isLive = !!(pageData?.livestream_is_live && pageData?.livestream_url);

  return (
    <>
      <div className="bg-ivory text-brown">
        <Hero event={pageData} hasCategories={hasCategories} />
        {isLive && <Livestream event={pageData} />}
        <AboutMahayagya event={pageData} />
        {featuredGuests.map((g, i) => <Leadership key={g.id} guest={g} flip={i % 2 === 1} primary={i === 0} />)}
        <Lineup guests={lineupGuests} />
        <Pillars items={bySection("pillars")} />
        <Rituals items={bySection("highlights")} />
        <Benefits items={bySection("blessings")} />
        <SchedulePreview items={schedule || []} event={pageData} />
        <RegistrationCta categories={categories || []} seatsTaken={seatsTaken || {}} onWaitlist={setWaitlistCat} />
        <DonateLive event={pageData} />
        <Testimonials items={testimonials || []} />
        <Gallery mediaItems={mediaItems || []} />
        {/* News (/news) and FAQ (/faq) intentionally kept OFF the homepage to keep
            it compact — they each have their own page, linked from the nav/footer. */}
        <FinalCta event={pageData} hasCategories={hasCategories} />
      </div>

      {waitlistCat && <WaitlistModal category={waitlistCat} onClose={() => setWaitlistCat(null)} />}
      <FloatingActions phone={contact?.phone} hasCategories={hasCategories} />
    </>
  );
}
