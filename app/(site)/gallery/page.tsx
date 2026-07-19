// app/(site)/gallery/page.tsx — full gallery. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { getPageHeroes } from '@/lib/siteEvent';
import GalleryPageContent from '@/components/site/pages/GalleryPageContent';

export const revalidate = 300;
export const metadata = { title: 'Gallery' };

export default async function GalleryPage() {
  const [heroes, mediaRes] = await Promise.all([
    getPageHeroes(),
    supabase.from('event_media').select('*').order('created_at', { ascending: false }),
  ]);
  return <GalleryPageContent media={mediaRes.data || []} hero={heroes?.gallery || {}} />;
}
