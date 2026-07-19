// components/site/LegalShell.js
// Luxury wrapper for the legal/content pages (terms, privacy, refund). The nav +
// footer come from the (site) layout, so this only provides the page heading and
// a readable prose card. Content is passed as children.
"use client";

import SectionKicker from "@/components/site/SectionKicker";

export default function LegalShell({ kicker, title, updated, children }) {
  return (
    <section className="section-y mandala-bg">
      <div className="container-luxury max-w-3xl">
        {kicker && <SectionKicker>{kicker}</SectionKicker>}
        <h1 className="mt-5 display-section text-brown">{title}</h1>
        {updated && <p className="mt-3 text-sm text-mutedgold">{updated}</p>}
        <div className="mt-10 luxury-card p-8 md:p-12 prose-legal">
          {children}
        </div>
      </div>
    </section>
  );
}
