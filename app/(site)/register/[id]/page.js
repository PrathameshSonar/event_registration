// app/register/[id]/page.js — Server Component. Fetches category; rendering in RegisterPageContent.
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import RegisterPageContent from '@/components/RegisterPageContent';
import { isRegistrationOpen } from '@/lib/registrationStatus';

export const dynamic = 'force-dynamic';

export default async function RegisterPage({ params }) {
    const { id } = await params;

    const { data: category, error } = await supabase
        .from('categories')
        .select('*, events(registration_open, end_at)')
        .eq('id', id)
        .single();

    if (error || !category) notFound();

    // Registration stopped by admin, or the event has ended → details-only.
    const registrationOpen = isRegistrationOpen(category.events);

    // Offline-payment details (bank/UPI/cheque) shown when the tier is payable.
    const { data: setting } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'bank_details').single();
    const paymentSettings = setting?.value || null;

    return <RegisterPageContent category={category} paymentSettings={paymentSettings} registrationOpen={registrationOpen} />;
}
