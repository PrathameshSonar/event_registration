// components/site/SectionKicker.js
// Small uppercase section label with flanking gold rules. Uses the `.kicker`
// class from app/styles/luxury.css.
"use client";

export default function SectionKicker({ children, light = false }) {
  return (
    <span className={`${light ? "kicker-light" : "kicker"} inline-flex items-center gap-3`}>
      <span className="h-px w-8 bg-gold/60" />
      {children}
      <span className="h-px w-8 bg-gold/60" />
    </span>
  );
}
