// app/(site)/registration/page.tsx — the tier-list landing (nav "Register").
// Nav/footer from the (site) layout.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPageHeroes } from '@/lib/siteEvent';
import RegistrationListContent from '@/components/site/pages/RegistrationListContent';

export const revalidate = 120;
export const metadata = { title: 'Registration' };

export default async function RegistrationPage() {
  const [{ data: event }, heroes] = await Promise.all([
    supabase.from('events').select('id').eq('is_active', true).single(),
    getPageHeroes(),
  ]);

  let categories: any[] = [];
  const seatsTaken: Record<string, number> = {};
  if (event?.id) {
    const { data: cats } = await supabase
      .from('categories').select('*').eq('event_id', event.id).order('price', { ascending: true });
    categories = cats || [];

    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('category_id, attendees_count')
      .in('payment_status', ['completed', 'contacted', 'enquired', 'advance_paid']);
    regs?.forEach((r) => { seatsTaken[r.category_id] = (seatsTaken[r.category_id] || 0) + (r.attendees_count || 1); });
  }

  return <RegistrationListContent categories={categories} seatsTaken={seatsTaken} hero={heroes?.registration || {}} />;
}
