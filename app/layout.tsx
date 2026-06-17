// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BaglaBhairav | Annual Mahotsav",
  description: "Join the BaglaBhairav Mahotsav. Reserve your pass, explore our Pitham principles, and connect with the community.",
  openGraph: {
    title: "BaglaBhairav | Annual Mahotsav",
    description: "Join the BaglaBhairav Mahotsav. Reserve your pass, explore our Pitham principles, and connect with the community.",
    siteName: "BaglaBhairav",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "BaglaBhairav Mahotsav"
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <LanguageProvider>{children}</LanguageProvider>
        </body>
    </html>
  );
}