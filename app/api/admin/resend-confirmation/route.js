// app/api/admin/resend-confirmation/route.js
// Re-send the "registration confirmed" email + WhatsApp for a completed
// registration (e.g. after fixing a wrong email). Admin only. The QR entry pass
// is sent separately via /api/admin/send-qr.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { dispatchTicket } from '@/lib/ticket';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'registrations:manage' });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    if (reg.payment_status !== 'completed') {
        return NextResponse.json({ error: 'Confirmation is only for a completed (Paid) registration.' }, { status: 400 });
    }

    await dispatchTicket(reg, reg.razorpay_payment_id || reg.offline_reference || 'confirmation');
    await logAudit({
        session, request,
        action: 'registration.resend_confirmation', entity: 'registration', entityId: id,
        summary: `Re-sent confirmation to ${reg.first_name} ${reg.last_name} (${reg.email})`,
    });

    return NextResponse.json({ ok: true });
}
