// app/page.tsx — Server Component. Fetches data only; rendering is in HomeContent.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import HomeContent from '@/components/HomeContent';

export const revalidate = 60;

export default async function Home() {
    // 1. Event hero text (includes title_hi, short_description_hi if set)
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
    if (pageData?.id) {
        // Use the service-role client: these tables aren't granted to the anon role.
        const [schedRes, hlRes, faqRes] = await Promise.all([
            supabaseAdmin.from('event_schedule').select('*').eq('event_id', pageData.id).order('sort_order'),
            supabaseAdmin.from('event_highlights').select('*').eq('event_id', pageData.id).order('sort_order'),
            supabaseAdmin.from('event_faqs').select('*').eq('event_id', pageData.id).order('sort_order'),
        ]);
        schedule = schedRes.data || [];
        highlights = hlRes.data || [];
        faqs = faqRes.data || [];
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

    return (
        <HomeContent
            pageData={pageData}
            categories={categories || []}
            mediaItems={mediaItems || []}
            seatsTaken={seatsTaken}
            schedule={schedule}
            highlights={highlights}
            faqs={faqs}
        />
    );
}
