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

const VALID_STATUSES = ['pending', 'completed', 'failed', 'refunded', 'enquired', 'contacted', 'amount_mismatch'];
const TERMINAL_STATUSES = ['completed', 'failed', 'refunded', 'amount_mismatch'];

export async function PATCH(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status.' }, { status: 400 });
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
