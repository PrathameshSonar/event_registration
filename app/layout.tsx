// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import LiveBanner from "@/components/LiveBanner";
import { BrandingProvider } from "@/components/BrandingProvider";
import { getBranding, getSeo, brandCss } from "@/lib/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Luxury devotional type system (ported from the Mahayagya design):
// Cinzel for display/headings, Cormorant Garamond for italic accents, Inter for body.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000');

// Site-wide defaults now come from Settings → Branding & SEO rather than being
// hardcoded. The homepage still overrides these with the ACTIVE EVENT's own title,
// description and hero image (see app/page.tsx) — this is the fallback, and what
// every other page uses.
export async function generateMetadata(): Promise<Metadata> {
  const [seo, branding] = await Promise.all([getSeo(), getBranding()]);
  // `/og-image.jpg` was referenced here for months but never actually existed, so
  // shares had no image at all. An admin-set og_image finally fixes that; the
  // static path stays as a last resort in case someone drops the file in.
  const image = seo.og_image || "/og-image.jpg";

  return {
    metadataBase: new URL(siteUrl),
    title: seo.site_title,
    description: seo.description,
    ...(seo.keywords ? { keywords: String(seo.keywords).split(",").map((k: string) => k.trim()).filter(Boolean) } : {}),
    openGraph: {
      title: seo.site_title,
      description: seo.description,
      siteName: branding.site_name,
      images: [{ url: image, width: 1200, height: 630, alt: seo.site_title }],
      locale: "en_IN",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: seo.site_title, description: seo.description, images: [image] },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Branding is read through unstable_cache (1h), so this DB call does NOT make
  // every page render per-request — /terms, /privacy, /pitham etc. stay prerendered.
  // brandCss() returns '' while branding is untouched, so an unconfigured site emits
  // no extra CSS at all and looks exactly as it did before this feature existed.
  const branding = await getBranding();
  const css = brandCss(branding);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Inlined (not a stylesheet request) so the brand colours are present on
            first paint — a fetched stylesheet would flash the default palette. */}
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body className="min-h-full flex flex-col">
          <BrandingProvider value={branding}>
            <LanguageProvider>
              {/* Renders nothing unless the active event is actually streaming. */}
              <LiveBanner />
              {children}
            </LanguageProvider>
          </BrandingProvider>
        </body>
    </html>
  );
}