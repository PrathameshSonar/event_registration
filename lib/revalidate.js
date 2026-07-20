// lib/revalidate.js
// Bust the public-site cache immediately after an admin content edit, so changes
// appear on the live site right away instead of after the ISR / unstable_cache
// window (which is why edits used to take 1–2 minutes to show).
import { revalidatePath, revalidateTag } from 'next/cache';

// Cache tags used by unstable_cache readers (branding/seo/etc. handle their own).
const CONTENT_TAGS = ['site-event', 'contact-info'];

export function revalidatePublic() {
    try {
        // Every public page hangs off the root layout, so revalidating it refreshes
        // all cached public routes (home, /event, /about, /registration, …) on their
        // next request.
        revalidatePath('/', 'layout');
        for (const tag of CONTENT_TAGS) {
            try { revalidateTag(tag); } catch { /* tag may not exist yet */ }
        }
    } catch (e) {
        // Non-fatal — the normal ISR window still refreshes it eventually.
        console.error('revalidatePublic failed:', e?.message);
    }
}
