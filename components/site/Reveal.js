// components/site/Reveal.js
// Reveal-on-scroll wrapper. IntersectionObserver toggles the `.reveal-in` class
// (see app/styles/app.css). Respects prefers-reduced-motion via the CSS.
"use client";

import { useEffect, useRef } from "react";

export default function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = setTimeout(() => el.classList.add("reveal-in"), delay);
            obs.unobserve(el);
            return () => clearTimeout(id);
          }
        });
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
