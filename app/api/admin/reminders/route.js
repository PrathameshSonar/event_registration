// Admin: list reminder opt-ins for an event (for export / outreach).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ items: [] });
    const { data, error } = await supabaseAdmin
        .from('event_reminders')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    return NextResponse.json({ items: data || [] });
}
