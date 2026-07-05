// app/api/admin/checkins/route.js
// Scan log: recent entry check-ins with the registrant's name + status and the
// checkpoint they were scanned at. Any authenticated role (admin/viewer).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

export async function GET(request) {
    const { response } = await authorize();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const checkpointId = searchParams.get('checkpointId');
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT));

    let query = supabaseAdmin
        .from('checkins')
        .select('id, scanned_at, checkpoint_id, checkpoints(name), registrations(id, first_name, last_name, salutation, payment_status, phone, categories(title))')
        .order('scanned_at', { ascending: false })
        .limit(limit);
    if (checkpointId && checkpointId !== 'all') query = query.eq('checkpoint_id', checkpointId);

    const { data, error } = await query;
    if (error) {
        console.error('checkins read error:', error.message);
        return NextResponse.json({ error: 'Failed to load scans.' }, { status: 500 });
    }

    // Unique registrations scanned (attendance count) across the returned set.
    const uniqueRegs = new Set((data || []).map((c) => c.registrations?.id).filter(Boolean));

    return NextResponse.json({ checkins: data || [], totalScans: (data || []).length, uniqueAttendees: uniqueRegs.size });
}
