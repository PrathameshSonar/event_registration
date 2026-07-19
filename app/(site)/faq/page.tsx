// app/(site)/faq/page.tsx — full FAQ. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes } from '@/lib/siteEvent';
import FaqPageContent from '@/components/site/pages/FaqPageContent';

export const revalidate = 300;
export const metadata = { title: 'FAQ' };

export default async function FaqPage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('id').eq('is_active', true).single(),
    getPageHeroes(),
  ]);

  let items: any[] = [];
  if (event?.id) {
    const { data } = await supabaseAdmin
      .from('event_faqs').select('*').eq('event_id', event.id).order('sort_order');
    items = data || [];
  }

  return <FaqPageContent items={items} hero={heroes?.faq || {}} />;
}
