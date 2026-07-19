// app/(site)/news/page.tsx — full news list. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes } from '@/lib/siteEvent';
import NewsPageContent from '@/components/site/pages/NewsPageContent';

export const revalidate = 120;
export const metadata = { title: 'News & Announcements' };

export default async function NewsPage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('id').eq('is_active', true).single(),
    getPageHeroes(),
  ]);

  let items: any[] = [];
  if (event?.id) {
    const { data } = await supabaseAdmin
      .from('event_news').select('*').eq('event_id', event.id)
      .eq('is_published', true).order('published_at', { ascending: false });
    items = data || [];
  }

  return <NewsPageContent items={items} eventId={event?.id || null} hero={heroes?.news || {}} />;
}
