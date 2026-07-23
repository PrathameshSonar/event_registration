// lib/siteEvent.js
// Cached read of the active event's "chrome" fields (footer contact + socials),
// for the shared (site) layout. Cached with unstable_cache so rendering it in a
// layout doesn't turn every public page dynamic — /terms, /privacy etc. stay
// static, exactly like getBranding. Revalidates every 5 minutes.
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withDefaults } from "@/lib/appSettings";

export const getSiteEvent = unstable_cache(
  async () => {
    try {
      const { data } = await supabaseAdmin
        .from("events")
        .select("venue, registration_open, end_at")
        .eq("is_active", true)
        .single();
      return data || null;
    } catch {
      return null;
    }
  },
  ["site-event"],
  { revalidate: 300, tags: ["site-event"] },
);

// Contact + social links (Settings → Contact & Social). Stored in app_settings,
// decoupled from the event. Cached so it never turns a static page dynamic.
export const getContact = unstable_cache(
  async () => {
    try {
      const { data } = await supabaseAdmin
        .from("app_settings").select("value").eq("key", "contact").single();
      return withDefaults("contact", data?.value);
    } catch {
      return withDefaults("contact", null);
    }
  },
  ["contact-info"],
  { revalidate: 300, tags: ["contact-info"] },
);

// Homepage "Enquire Now" config (Settings → General Enquiry). Cached + tagged so
// the homepage read never turns a static page dynamic, and a save (which busts the
// `general_enquiry` tag) shows up immediately.
export const getGeneralEnquiry = unstable_cache(
  async () => {
    try {
      const { data } = await supabaseAdmin
        .from("app_settings").select("value").eq("key", "general_enquiry").single();
      return withDefaults("general_enquiry", data?.value);
    } catch {
      return withDefaults("general_enquiry", null);
    }
  },
  ["general-enquiry"],
  { revalidate: 300, tags: ["general_enquiry"] },
);

// About Us page sections (Settings → About Us Page): Pitham + Guruji.
export const getAboutPage = unstable_cache(
  async () => {
    try {
      const { data } = await supabaseAdmin
        .from("app_settings").select("value").eq("key", "about_page").single();
      return withDefaults("about_page", data?.value);
    } catch {
      return withDefaults("about_page", null);
    }
  },
  ["about-page"],
  { revalidate: 300, tags: ["about_page"] },
);

// Per-page hero images + copy (Settings → Page Headers). Cached so the inner
// pages stay static/ISR.
export const getPageHeroes = unstable_cache(
  async () => {
    try {
      const { data } = await supabaseAdmin
        .from("app_settings").select("value").eq("key", "page_heroes").single();
      return withDefaults("page_heroes", data?.value);
    } catch {
      return withDefaults("page_heroes", null);
    }
  },
  ["page-heroes"],
  { revalidate: 300, tags: ["page_heroes"] },
);
