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
        .select("contact_phone, venue, instagram_url, facebook_url, youtube_url")
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
