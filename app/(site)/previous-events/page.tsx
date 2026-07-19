// app/previous-events/page.tsx — Server Component. Fetches data; rendering in PreviousEventsContent.
import { supabase } from '@/lib/supabase';
import PreviousEventsContent from '@/components/PreviousEventsContent';

export const revalidate = 60;

export default async function PreviousEventsPage() {
    // Only show inactive events the admin has flagged for the public archive.
    // Events created just for future planning stay hidden until opted in.
    const { data: pastEvents } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', false)
        .eq('show_in_archive', true)
        .order('created_at', { ascending: false });

    const { data: allMedia } = await supabase
        .from('event_media')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <PreviousEventsContent
            pastEvents={pastEvents || []}
            allMedia={allMedia || []}
        />
    );
}
