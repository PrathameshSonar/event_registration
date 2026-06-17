import type { NextConfig } from "next";

// Baseline security headers — camera blocked everywhere except /scan.
const baseHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// /scan needs camera access to scan QR codes.
const scanHeaders = baseHeaders.map(h =>
  h.key === "Permissions-Policy"
    ? { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" }
    : h
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/scan", headers: scanHeaders },
      { source: "/:path*", headers: baseHeaders },
    ];
  },
};

export default nextConfig;
