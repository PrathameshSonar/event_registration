// app/page.tsx — Server Component. Fetches data only; rendering is in HomeContent.
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getBranding, getSeo } from '@/lib/branding';
import HomeContent from '@/components/HomeContent';

export const revalidate = 60;

// Build the social/WhatsApp link-preview + <title>/description from the ACTIVE
// event, so a shared link shows the real event's title, date and hero image
// (falls back to the static /og-image.jpg when no hero image is set).
export async function generateMetadata(): Promise<Metadata> {
    const [{ data: ev }, seo, branding] = await Promise.all([
        supabase
            .from('events')
            .select('title, short_description, date_time, venue, hero_image_url')
            .eq('is_active', true)
            .single(),
        getSeo(),
        getBranding(),
    ]);

    // Preference order, most specific first: the ACTIVE EVENT's own copy → the
    // admin's SEO settings → the shipped default. The event wins because a shared
    // link should show the event someone is actually being invited to.
    const title = ev?.title ? `${ev.title} — ${branding.site_name} Mahotsav` : seo.site_title;
    const bits = [ev?.date_time, ev?.venue].filter(Boolean).join(' · ');
    const description = ev?.short_description
        ? `${ev.short_description}${bits ? ` (${bits})` : ''}`
        : seo.description;
    const image = ev?.hero_image_url || seo.og_image || '/og-image.jpg';

    return {
        title,
        description,
        openGraph: {
            title, description, siteName: branding.site_name, locale: 'en_IN', type: 'website',
            images: [{ url: image, width: 1200, height: 630, alt: title }],
        },
        twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
}

export default async function Home() {
    // 1. Event hero text (English in base columns + translations JSONB)
    const { data: pageData } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .single();

    // 2. Registration tiers — only show categories for the active event
    let categories: any[] = [];
    if (pageData?.id) {
        const { data: catData } = await supabase
            .from('categories')
            .select('*')
            .eq('event_id', pageData.id)
            .order('price', { ascending: true });
        categories = catData || [];
    }

    // 3. Media assets
    const { data: mediaItems } = await supabase
        .from('event_media')
        .select('*')
        .order('created_at', { ascending: false });

    // 3b. Devotional content for the active event (schedule + highlights + FAQs)
    let schedule: any[] = [];
    let highlights: any[] = [];
    let faqs: any[] = [];
    let guests: any[] = [];
    let news: Record<string, unknown>[] = [];
    let testimonials: any[] = [];
    if (pageData?.id) {
        // Use the service-role client: these tables aren't granted to the anon role.
        const [schedRes, hlRes, faqRes, guestRes, newsRes, testiRes] = await Promise.all([
            supabaseAdmin.from('event_schedule').select('*').eq('event_id', pageData.id).order('sort_order'),
            supabaseAdmin.from('event_highlights').select('*').eq('event_id', pageData.id).order('sort_order'),
            supabaseAdmin.from('event_faqs').select('*').eq('event_id', pageData.id).order('sort_order'),
            supabaseAdmin.from('event_guests').select('*').eq('event_id', pageData.id).order('sort_order'),
            // Only PUBLISHED announcements reach the public page — drafts stay hidden.
            supabaseAdmin.from('event_news').select('*').eq('event_id', pageData.id)
                .eq('is_published', true).order('published_at', { ascending: false }),
            supabaseAdmin.from('event_testimonials').select('*').eq('event_id', pageData.id)
                .eq('is_published', true).order('sort_order'),
        ]);
        schedule = schedRes.data || [];
        highlights = hlRes.data || [];
        faqs = faqRes.data || [];
        guests = guestRes.data || [];
        news = newsRes.data || [];
        testimonials = testiRes.data || [];
    }

    // 4. Seat counts — requires service-role key (RLS blocks anon reads on registrations)
    const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('category_id, attendees_count')
        .in('payment_status', ['completed', 'contacted', 'enquired', 'advance_paid']);

    const seatsTaken: Record<string, number> = {};
    regs?.forEach(reg => {
        seatsTaken[reg.category_id] = (seatsTaken[reg.category_id] || 0) + (reg.attendees_count || 1);
    });

    // Event structured data (JSON-LD) so Google can show a rich event result.
    const pricedTiers = categories.filter((c) => Number(c.price) > 0).map((c) => Number(c.price));
    const minPrice = pricedTiers.length ? Math.min(...pricedTiers) : Infinity;
    const jsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: pageData?.title || 'BaglaBhairav Mahotsav',
        description: pageData?.short_description || undefined,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(pageData?.start_at ? { startDate: pageData.start_at } : {}),
        ...(pageData?.end_at ? { endDate: pageData.end_at } : {}),
        ...(pageData?.hero_image_url ? { image: [pageData.hero_image_url] } : {}),
        ...(pageData?.venue ? { location: { '@type': 'Place', name: pageData.venue } } : {}),
        organizer: { '@type': 'Organization', name: 'BaglaBhairav' },
        ...(minPrice !== Infinity ? { offers: { '@type': 'Offer', price: minPrice, priceCurrency: 'INR', availability: 'https://schema.org/InStock' } } : {}),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <HomeContent
                pageData={pageData}
                categories={categories || []}
                mediaItems={mediaItems || []}
                seatsTaken={seatsTaken}
                schedule={schedule}
                highlights={highlights}
                faqs={faqs}
                guests={guests}
                news={news}
                testimonials={testimonials}
            />
        </>
    );
}
