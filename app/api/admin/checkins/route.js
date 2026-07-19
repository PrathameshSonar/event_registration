// app/api/admin/checkins/route.js
// Scan log: recent entry check-ins with the registrant's name + status and the
// checkpoint they were scanned at. GET = any authenticated role.
// DELETE = undo a check-in (wrong person scanned) — needs scanlog:view.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

export async function GET(request) {
    const { response } = await authorize({ requirePermission: 'scanlog:view' });
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const checkpointId = searchParams.get('checkpointId');
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT));

    let query = supabaseAdmin
        .from('checkins')
        .select('id, scanned_at, checkpoint_id, manual, checkpoints(name), registrations(id, first_name, last_name, salutation, payment_status, phone, categories(title))')
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

// Undo a check-in — removes the row so the person can be scanned in again
// (wrong person / mistaken tap). Frees them from the "already scanned" state.
export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'scanlog:view' });
    if (response) return response;

    const { id } = await request.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: 'Missing check-in id.' }, { status: 400 });

    // Fetch for a descriptive audit line before deleting.
    const { data: row } = await supabaseAdmin
        .from('checkins')
        .select('id, manual, checkpoints(name), registrations(first_name, last_name, phone)')
        .eq('id', id)
        .single();

    const { error } = await supabaseAdmin.from('checkins').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Could not undo the check-in.' }, { status: 500 });

    const who = `${row?.registrations?.first_name || ''} ${row?.registrations?.last_name || ''}`.trim() || 'registrant';
    await logAudit({
        session, request,
        action: 'checkin.undo', entity: 'checkin', entityId: id,
        summary: `Undid check-in — ${who}${row?.registrations?.phone ? ` (${row.registrations.phone})` : ''} at ${row?.checkpoints?.name || 'checkpoint'}${row?.manual ? ' (was manual)' : ''}`,
    });
    return NextResponse.json({ ok: true });
}
