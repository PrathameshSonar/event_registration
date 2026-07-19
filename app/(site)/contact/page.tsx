// app/(site)/contact/page.tsx — contact info + form. Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { getPageHeroes, getContact } from '@/lib/siteEvent';
import ContactPageContent from '@/components/site/pages/ContactPageContent';

export const revalidate = 300;
export const metadata = { title: 'Contact' };

export default async function ContactPage() {
  const [{ data: event }, heroes, contact] = await Promise.all([
    supabase.from('events').select('venue').eq('is_active', true).single(),
    getPageHeroes(),
    getContact(),
  ]);
  return <ContactPageContent event={event} contact={contact} hero={heroes?.contact || {}} />;
}
