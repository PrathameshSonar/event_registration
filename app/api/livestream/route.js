// app/api/livestream/route.js
// PUBLIC: is the active event streaming right now?
//
// Exists so the site-wide sticky banner can be a small CLIENT component. The root
// layout is a static server component — doing a DB read there would force EVERY
// page (including the static /terms, /privacy, /pitham) to render dynamically on
// each request. Fetching this tiny JSON from the client instead keeps those pages
// static, and lets the banner appear without a reload when the admin goes live.
//
// Returns only what the banner needs. `embedUrl` is resolved server-side so the
// client never has to know about YouTube URL forms.
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { youtubeEmbedUrl } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { data: ev } = await supabase
        .from('events')
        .select('livestream_url, livestream_is_live, livestream_banner, translations')
        .eq('is_active', true)
        .single();

    // Live requires BOTH the toggle and a URL — a toggle with no URL would show an
    // empty player, so treat it as not live.
    const live = !!(ev?.livestream_is_live && ev?.livestream_url);
    if (!live) return NextResponse.json({ live: false });

    return NextResponse.json({
        live: true,
        embedUrl: youtubeEmbedUrl(ev.livestream_url),
        banner: ev.livestream_banner || null,
        // The banner text is translatable like every other event field.
        translations: ev.translations || {},
    });
}
