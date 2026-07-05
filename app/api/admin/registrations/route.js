// app/api/admin/registrations/route.js
// Update a registration's status. Admin only.
// Financial-state immutability: a registration in a terminal money state
// (completed / failed / refunded / amount_mismatch) is locked server-side and
// cannot be re-edited from the dashboard.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'completed', 'failed', 'refunded', 'enquired', 'contacted', 'amount_mismatch', 'closed'];
const TERMINAL_STATUSES = ['completed', 'failed', 'refunded', 'amount_mismatch'];

// Personal/contact fields an admin may correct (NOT money/status — those have
// their own guarded flows). Editable on any registration, incl. completed ones
// (fixing a wrong email so the ticket/QR actually arrives).
const EDITABLE = ['salutation', 'first_name', 'last_name', 'gotra', 'gender', 'date_of_birth', 'email', 'phone', 'pincode', 'taluka', 'state', 'problem_samasya', 'attendees_count'];
const TEXT_FIELDS = ['salutation', 'first_name', 'last_name', 'gotra', 'gender', 'pincode', 'taluka', 'state', 'problem_samasya'];

export async function PATCH(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id, status, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    // ── DETAILS EDIT ─────────────────────────────────────────────────────
    if (updates && typeof updates === 'object') {
        const clean = {};
        for (const k of EDITABLE) if (updates[k] !== undefined) clean[k] = updates[k];
        for (const k of TEXT_FIELDS) if (clean[k] != null) clean[k] = String(clean[k]).replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim() || null;
        if (clean.email != null) {
            clean.email = String(clean.email).toLowerCase().trim();
            if (clean.email && !/^\S+@\S+\.\S+$/.test(clean.email)) return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
        }
        if (clean.phone != null) clean.phone = String(clean.phone).trim() || null;
        if (clean.attendees_count != null) clean.attendees_count = Math.max(1, parseInt(clean.attendees_count, 10) || 1);
        if (updates.custom_fields && typeof updates.custom_fields === 'object') {
            const cf = {};
            for (const [k, v] of Object.entries(updates.custom_fields)) cf[k] = v == null ? null : String(v).replace(/<[^>]*>/g, '').trim();
            clean.custom_fields = cf;
        }
        if (Object.keys(clean).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

        // Keep full_name consistent if name parts changed.
        if (clean.first_name !== undefined || clean.last_name !== undefined || clean.salutation !== undefined) {
            const { data: cur } = await supabaseAdmin.from('registrations').select('salutation, first_name, last_name').eq('id', id).single();
            const sal = clean.salutation ?? cur?.salutation ?? '';
            const fn = clean.first_name ?? cur?.first_name ?? '';
            const ln = clean.last_name ?? cur?.last_name ?? '';
            clean.full_name = `${sal || ''} ${fn} ${ln}`.replace(/\s+/g, ' ').trim();
        }

        const { error } = await supabaseAdmin.from('registrations').update(clean).eq('id', id);
        if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        await logAudit({
            session, request,
            action: 'registration.edit', entity: 'registration', entityId: id,
            summary: 'Edited registrant details',
            metadata: { fields: Object.keys(clean) },
        });
        return NextResponse.json({ ok: true });
    }

    // ── STATUS CHANGE ────────────────────────────────────────────────────
    if (!status) return NextResponse.json({ error: 'Missing status.' }, { status: 400 });
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

    const { data: current, error: fetchError } = await supabaseAdmin
        .from('registrations')
        .select('payment_status')
        .eq('id', id)
        .single();

    if (fetchError || !current) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    if (TERMINAL_STATUSES.includes(current.payment_status)) {
        return NextResponse.json(
            { error: `This registration is locked (${current.payment_status}) and cannot be changed.` },
            { status: 409 }
        );
    }

    const { error } = await supabaseAdmin.from('registrations').update({ payment_status: status }).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

    await logAudit({
        session, request,
        action: 'registration.status_change',
        entity: 'registration', entityId: id,
        summary: `Status ${current.payment_status} → ${status}`,
        metadata: { from: current.payment_status, to: status },
    });

    return NextResponse.json({ ok: true });
}
