// app/api/admin/cancel-registration/route.js
//
// Cancel a registration. ADMIN ONLY — a volunteer can never reach this even with
// `registrations:manage`, because cancelling destroys a seat-hold and voids an
// entry pass, and that call belongs to a named admin.
//
// Cancelling is NOT a refund. The money columns (amount_paid / amount_due /
// razorpay_payment_id / offline_reference) are left exactly as they are, so the
// payment record survives the cancellation and the books still balance. If money
// genuinely has to go back, that stays a separate, deliberate Refund (online) or
// Reverse (offline) action.
//
// The seat releases itself: every capacity count in the app is an allowlist of
// statuses (['completed','advance_paid'] for the hold, plus the enquiry states on
// the public page), and 'cancelled' is in none of them.
//
//   POST { id, reason } → { ok, waitlist: [...] }
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { notifyCancelled } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Cancelling one of these is meaningless or destructive: they're already ended.
const NOT_CANCELLABLE = ['cancelled', 'refunded', 'failed', 'closed'];
// Statuses where real money was taken — drives the no-refund line in the email.
const HAS_PAID = ['completed', 'advance_paid', 'amount_mismatch', 'cheque_received'];

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id, reason: rawReason } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    // A cancellation without a stated reason is unauditable, so it's required.
    const reason = (rawReason || '').toString().slice(0, 300).trim();
    if (!reason) return NextResponse.json({ error: 'A reason is required to cancel a registration.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('id, payment_status, category_id, first_name, last_name, phone, email, amount_paid, qr_sent_at, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    if (NOT_CANCELLABLE.includes(reg.payment_status)) {
        return NextResponse.json(
            { error: `This registration is already ${reg.payment_status} — there is nothing to cancel.` },
            { status: 400 },
        );
    }

    const hadPaid = HAS_PAID.includes(reg.payment_status) && Number(reg.amount_paid || 0) > 0;
    const previousStatus = reg.payment_status;

    const { error: updErr } = await supabaseAdmin
        .from('registrations')
        .update({
            payment_status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
        })
        .eq('id', id);
    if (updErr) {
        console.error('Cancel failed:', updErr.message);
        return NextResponse.json({ error: 'Could not cancel the registration.' }, { status: 500 });
    }

    // Best-effort — a notification failure must not leave the row half-cancelled.
    try {
        await notifyCancelled(reg, reason, hadPaid);
    } catch (e) {
        console.error('Cancellation notice failed:', e?.message);
    }

    // A seat just freed on this tier. Hand back whoever is waiting on it so the
    // UI can offer to notify them, instead of the admin having to remember.
    let waitlist = [];
    if (reg.category_id) {
        const { data } = await supabaseAdmin
            .from('waitlist')
            .select('id, name, phone')
            .eq('category_id', reg.category_id)
            .eq('status', 'waiting')
            .order('created_at', { ascending: true })
            .limit(5);
        waitlist = data || [];
    }

    await logAudit({
        session, request,
        action: 'registration.cancel', entity: 'registration', entityId: id,
        summary: `Cancelled registration (was ${previousStatus}${hadPaid ? `, ₹${Number(reg.amount_paid).toLocaleString('en-IN')} paid — not refunded` : ''}) — ${reason} — ${reg.first_name} ${reg.last_name} (${reg.phone})`,
        metadata: {
            previousStatus, reason, hadPaid,
            amountPaid: Number(reg.amount_paid || 0),
            refunded: false,
            qrWasSent: !!reg.qr_sent_at,
            waitlistWaiting: waitlist.length,
        },
    });

    return NextResponse.json({
        ok: true,
        hadPaid,
        tier: reg.categories?.title || null,
        waitlist,
    });
}
