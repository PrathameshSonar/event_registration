// app/(site)/event/page.tsx — full event details. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes } from '@/lib/siteEvent';
import EventPageContent from '@/components/site/pages/EventPageContent';

export const revalidate = 300;
export const metadata = { title: 'Event Details' };

export default async function EventPage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('*').eq('is_active', true).single(),
    getPageHeroes(),
  ]);

  let schedule: any[] = [];
  let guests: any[] = [];
  if (event?.id) {
    const [s, g] = await Promise.all([
      supabaseAdmin.from('event_schedule').select('*').eq('event_id', event.id).order('sort_order'),
      supabaseAdmin.from('event_guests').select('*').eq('event_id', event.id).order('sort_order'),
    ]);
    schedule = s.data || [];
    guests = g.data || [];
  }

  return <EventPageContent event={event} schedule={schedule} guests={guests} hero={heroes?.event || {}} />;
}
