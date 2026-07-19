// app/(site)/live/page.tsx — live stream page. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { getPageHeroes } from '@/lib/siteEvent';
import LivePageContent from '@/components/site/pages/LivePageContent';

export const revalidate = 60;
export const metadata = { title: 'Live Stream' };

export default async function LivePage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('livestream_url, livestream_is_live, livestream_banner').eq('is_active', true).single(),
    getPageHeroes(),
  ]);
  return <LivePageContent event={event} hero={heroes?.live || {}} />;
}
