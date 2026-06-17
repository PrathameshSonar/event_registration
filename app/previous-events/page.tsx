// app/previous-events/page.tsx — Server Component. Fetches data; rendering in PreviousEventsContent.
import { supabase } from '@/lib/supabase';
import PreviousEventsContent from '@/components/PreviousEventsContent';

export const revalidate = 60;

export default async function PreviousEventsPage() {
    const { data: pastEvents } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', false)
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
