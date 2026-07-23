// app/(site)/about/page.tsx — About page. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes, getAboutPage, getContact } from '@/lib/siteEvent';
import AboutPageContent from '@/components/site/pages/AboutPageContent';

export const revalidate = 300;
export const metadata = { title: 'About Us' };

export default async function AboutPage() {
  const [{ data: event }, heroes, aboutPage, contact] = await Promise.all([
    supabase.from('events').select('*').eq('is_active', true).single(),
    getPageHeroes(),
    getAboutPage(),
    getContact(),
  ]);

  let featuredGuests: any[] = [];
  let pillars: any[] = [];
  let valueCards: any[] = [];
  let gallery: any[] = [];
  if (event?.id) {
    const [g, hl, av, media] = await Promise.all([
      supabaseAdmin.from('event_guests').select('*').eq('event_id', event.id).eq('is_featured', true).order('sort_order'),
      supabaseAdmin.from('event_highlights').select('*').eq('event_id', event.id).eq('section', 'pillars').order('sort_order'),
      supabaseAdmin.from('event_highlights').select('*').eq('event_id', event.id).eq('section', 'about').order('sort_order'),
      supabaseAdmin.from('event_media').select('*').eq('event_id', event.id).eq('media_type', 'image').order('sort_order').limit(6),
    ]);
    featuredGuests = g.data || [];
    pillars = hl.data || [];
    valueCards = av.data || [];
    gallery = media.data || [];
  }

  // Past Mahayagyas (Legacy) — archived events, most recent first.
  const { data: legacy } = await supabaseAdmin
    .from('events').select('id, title, date_time, translations, hero_image_url')
    .eq('show_in_archive', true).order('created_at', { ascending: false }).limit(3);

  return <AboutPageContent event={event} featuredGuests={featuredGuests} pillars={pillars} valueCards={valueCards} legacy={legacy || []} gallery={gallery} hero={heroes?.about || {}} aboutPage={aboutPage} officialUrl={contact?.website_url || ''} />;
}
