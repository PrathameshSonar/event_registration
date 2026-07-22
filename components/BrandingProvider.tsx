// components/BrandingProvider.tsx
// Makes the branding settings (site name, logo) readable from any CLIENT component.
//
// The root layout already fetches branding server-side (cached, so it doesn't make
// pages dynamic) to inject the colour variables. Rather than thread `site_name`
// down through every page's props — Footer alone is used on three different pages —
// that same value is handed to this context once.
//
// Colours do NOT come through here: they're applied as CSS variables in the layout,
// so components keep using plain Tailwind classes (bg-orange-600 …) and get themed
// for free. This context is only for the things CSS can't express: the name and logo.
"use client";

import { createContext, useContext } from "react";
import { DEFAULT_BRANDING } from "@/lib/appSettings";

export interface Branding {
    site_name: string;
    logo_url: string;
    primary_color: string;
    accent_color: string;
}

const DEFAULTS: Branding = {
    site_name: DEFAULT_BRANDING.site_name,
    logo_url: "",
    primary_color: "#ea580c",
    accent_color: "#d4a017",
};

const BrandingContext = createContext<Branding>(DEFAULTS);

export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ value, children }: { value?: Partial<Branding>; children: React.ReactNode }) {
    return (
        <BrandingContext.Provider value={{ ...DEFAULTS, ...(value || {}) }}>
            {children}
        </BrandingContext.Provider>
    );
}
