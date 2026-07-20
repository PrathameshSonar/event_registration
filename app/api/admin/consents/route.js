// app/api/admin/consents/route.js
// Admin: list consent (Samanti Patra) acceptance records. Requires settings:manage.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    let query = supabaseAdmin
        .from('consents')
        .select('id, kind, registration_id, donation_id, name, phone, email, dob, declaration_title, declaration_body, accepted_at, ip')
        .order('accepted_at', { ascending: false })
        .limit(1000);
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to load consent records.' }, { status: 500 });
    return NextResponse.json({ consents: data || [], count: (data || []).length });
}
