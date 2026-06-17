// app/register/[id]/page.js — Server Component. Fetches category; rendering in RegisterPageContent.
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import RegisterPageContent from '@/components/RegisterPageContent';

export default async function RegisterPage({ params }) {
    const { id } = await params;

    const { data: category, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !category) notFound();

    return <RegisterPageContent category={category} />;
}
