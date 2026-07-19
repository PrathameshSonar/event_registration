// app/(site)/live/page.tsx — live stream page. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes } from '@/lib/siteEvent';
import LivePageContent from '@/components/site/pages/LivePageContent';

export const revalidate = 60;
export const metadata = { title: 'Live Stream' };

export default async function LivePage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('id, livestream_url, livestream_is_live, livestream_banner').eq('is_active', true).single(),
    getPageHeroes(),
  ]);

  // Recent announcements double as the "live updates" feed beside the player.
  let updates: any[] = [];
  if (event?.id) {
    const { data } = await supabaseAdmin
      .from('event_news').select('id, title, body, translations, published_at').eq('event_id', event.id)
      .eq('is_published', true).order('published_at', { ascending: false }).limit(6);
    updates = data || [];
  }

  return <LivePageContent event={event} updates={updates} hero={heroes?.live || {}} />;
}
