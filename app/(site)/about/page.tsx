// app/(site)/about/page.tsx — About page. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes } from '@/lib/siteEvent';
import AboutPageContent from '@/components/site/pages/AboutPageContent';

export const revalidate = 300;
export const metadata = { title: 'About' };

export default async function AboutPage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('*').eq('is_active', true).single(),
    getPageHeroes(),
  ]);

  let featuredGuest: any = null;
  let pillars: any[] = [];
  if (event?.id) {
    const [g, hl] = await Promise.all([
      supabaseAdmin.from('event_guests').select('*').eq('event_id', event.id).eq('is_featured', true).order('sort_order').limit(1),
      supabaseAdmin.from('event_highlights').select('*').eq('event_id', event.id).eq('section', 'pillars').order('sort_order'),
    ]);
    featuredGuest = (g.data || [])[0] || null;
    pillars = hl.data || [];
  }

  return <AboutPageContent event={event} featuredGuest={featuredGuest} pillars={pillars} hero={heroes?.about || {}} />;
}
