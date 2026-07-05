// app/api/admin/registration-notes/route.js
// Contact-history notes for the enquiry pipeline.
//   GET  ?registrationId=<id>  → notes for a registration (newest first). Any role.
//   POST { registrationId, note } → append a note. Admin only.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { response } = await authorize();
    if (response) return response;

    const registrationId = new URL(request.url).searchParams.get('registrationId');
    if (!registrationId) return NextResponse.json({ notes: [] });

    const { data, error } = await supabaseAdmin
        .from('registration_notes')
        .select('*')
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Failed to load notes.' }, { status: 500 });
    return NextResponse.json({ notes: data || [] });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'enquiries:manage' });
    if (response) return response;

    const { registrationId, note } = await request.json();
    if (!registrationId || !note?.trim()) {
        return NextResponse.json({ error: 'Missing registration or note.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('registration_notes')
        .insert({ registration_id: registrationId, note: note.trim(), actor_role: session?.role || 'unknown' })
        .select()
        .single();
    if (error) return NextResponse.json({ error: 'Could not save the note.' }, { status: 500 });

    await logAudit({
        session, request,
        action: 'enquiry.note',
        entity: 'registration', entityId: registrationId,
        summary: `Added a contact note: "${note.trim().slice(0, 60)}"`,
    });

    return NextResponse.json({ ok: true, note: data });
}
