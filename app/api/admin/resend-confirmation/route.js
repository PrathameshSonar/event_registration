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

    // `channels` (optional) limits the resend to specific channels. The row's ⚠️
    // "retry failed delivery" passes only the failed channel(s), so a channel that
    // already delivered is never re-sent. Omitted → both (a deliberate full resend,
    // e.g. after correcting the email address).
    const { id, channels } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const validChannels = Array.isArray(channels)
        ? channels.filter((c) => c === 'email' || c === 'whatsapp')
        : null;
    if (validChannels && validChannels.length === 0) {
        return NextResponse.json({ error: 'Nothing to resend — both channels already delivered.' }, { status: 400 });
    }

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    if (reg.payment_status !== 'completed') {
        return NextResponse.json({ error: 'Confirmation is only for a completed (Paid) registration.' }, { status: 400 });
    }

    const result = await dispatchTicket(
        reg,
        reg.razorpay_payment_id || reg.offline_reference || 'confirmation',
        validChannels ? { channels: validChannels } : {},
    );
    await logAudit({
        session, request,
        action: 'registration.resend_confirmation', entity: 'registration', entityId: id,
        summary: `Re-sent confirmation (${(validChannels || ['email', 'whatsapp']).join(' + ')}) to ${reg.first_name} ${reg.last_name} (${reg.email})`,
        metadata: { channels: validChannels || ['email', 'whatsapp'], result },
    });

    return NextResponse.json({ ok: true, ...result });
}
