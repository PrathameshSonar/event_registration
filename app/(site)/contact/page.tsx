// app/(site)/contact/page.tsx — contact info + form. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { getPageHeroes } from '@/lib/siteEvent';
import ContactPageContent from '@/components/site/pages/ContactPageContent';

export const revalidate = 300;
export const metadata = { title: 'Contact' };

export default async function ContactPage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('contact_phone, venue, instagram_url, facebook_url, youtube_url').eq('is_active', true).single(),
    getPageHeroes(),
  ]);
  return <ContactPageContent event={event} hero={heroes?.contact || {}} />;
}
