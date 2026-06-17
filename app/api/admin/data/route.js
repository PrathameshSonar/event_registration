// app/api/admin/data/route.js
// Returns all dashboard data. Any authenticated role (admin or viewer).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize();
    if (response) return response;

    const [regRes, catRes, evRes, mediaRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('*, categories(title)').order('created_at', { ascending: false }),
        supabaseAdmin.from('categories').select('*').order('price', { ascending: true }),
        supabaseAdmin.from('events').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('event_media').select('*, events(title)').order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
        registrations: regRes.data || [],
        categories: catRes.data || [],
        events: evRes.data || [],
        media: mediaRes.data || [],
    });
}
