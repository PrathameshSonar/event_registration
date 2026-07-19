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
import News from "@/components/site/home/News";
import Faq from "@/components/site/home/Faq";
import FinalCta from "@/components/site/home/FinalCta";

export default function HomeContent({ pageData, categories, mediaItems, seatsTaken, schedule, highlights, faqs, guests, news, testimonials }) {
  const [waitlistCat, setWaitlistCat] = useState(null);

  const hasCategories = Array.isArray(categories) && categories.length > 0;
  const allGuests = guests || [];
  const featuredGuest = allGuests.find((g) => g.is_featured) || null;
  // Non-featured guests form the "Chief Guests" lineup (the featured one is the
  // Leadership hero). If none are featured, all guests show in the lineup.
  const lineupGuests = featuredGuest ? allGuests.filter((g) => !g.is_featured) : allGuests;
  const bySection = (name) => (highlights || []).filter((h) => (h.section || "highlights") === name);
  const isLive = !!(pageData?.livestream_is_live && pageData?.livestream_url);

  return (
    <>
      <div className="bg-ivory text-brown">
        <Hero event={pageData} hasCategories={hasCategories} />
        {isLive && <Livestream event={pageData} />}
        <AboutMahayagya event={pageData} />
        <Leadership guest={featuredGuest} />
        <Lineup guests={lineupGuests} />
        <Pillars items={bySection("pillars")} />
        <Rituals items={bySection("highlights")} />
        <Benefits items={bySection("blessings")} />
        <SchedulePreview items={schedule || []} />
        <RegistrationCta categories={categories || []} seatsTaken={seatsTaken || {}} onWaitlist={setWaitlistCat} />
        <DonateLive event={pageData} />
        <Testimonials items={testimonials || []} />
        <Gallery mediaItems={mediaItems || []} />
        <News items={news || []} />
        <Faq items={faqs || []} />
        <FinalCta event={pageData} hasCategories={hasCategories} />
      </div>

      {waitlistCat && <WaitlistModal category={waitlistCat} onClose={() => setWaitlistCat(null)} />}
      <FloatingActions phone={pageData?.contact_phone} hasCategories={hasCategories} />
    </>
  );
}
