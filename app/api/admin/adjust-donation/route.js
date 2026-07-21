// app/api/admin/adjust-donation/route.js
// Admin: change (or remove) the optional donation attached to a registration.
// Real-world need: someone adds a donation at checkout, then asks the desk to drop
// it and pay only the Seva fee. `donation_amount`/`total_amount` are deliberately
// NOT in the generic PATCH's EDITABLE list — money moves through this guarded path.
//
// Rules that make this safe:
//  • The Seva base is derived from the ROW (total − donation), never from the
//    category's CURRENT price — a later price change must not silently re-bill.
//  • Never create an overpayment: reducing below what's already collected is a
//    REFUND, not an edit, so that is rejected with a clear message.
//  • A stored balance link was created for the OLD amount, so it is cleared and a
//    fresh one is minted on the next send/copy.
//  • If the reduced total is already covered, the row completes (+ ticket).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { dispatchTicket } from '@/lib/ticket';
import { cancelPaymentLink } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const MAX_DONATION = 1_000_000;
// Money has genuinely been collected here, so covering the new total completes it.
const CAN_AUTO_COMPLETE = ['advance_paid', 'amount_mismatch'];
// Closed-out rows: editing the donation is meaningless (and would corrupt reports).
const LOCKED = ['refunded', 'cancelled', 'failed', 'closed'];

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'payments:verify' });
    if (response) return response;

    const { id, donation } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const newDonation = Math.max(0, Math.min(MAX_DONATION, Math.round(Number(donation) || 0)));

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    if (LOCKED.includes(reg.payment_status)) {
        return NextResponse.json({ error: `Cannot change the donation on a ${reg.payment_status} registration.` }, { status: 400 });
    }

    const oldDonation = Number(reg.donation_amount) || 0;
    if (newDonation === oldDonation) return NextResponse.json({ ok: true, unchanged: true });

    const base = Math.max(0, (Number(reg.total_amount) || 0) - oldDonation);
    const newTotal = base + newDonation;
    const paid = Number(reg.amount_paid) || 0;

    // Money guard: never silently leave the registrant overpaid.
    if (newTotal < paid - 1) {
        return NextResponse.json({
            error: `₹${paid.toLocaleString('en-IN')} is already paid — this would leave ₹${(paid - newTotal).toLocaleString('en-IN')} overpaid. Use Refund for that amount instead.`,
        }, { status: 400 });
    }

    const newDue = Math.max(0, newTotal - paid);
    const update = { donation_amount: newDonation, total_amount: newTotal, amount_due: newDue };

    // The stored balance link was priced at the OLD amount. CANCEL it on Razorpay
    // before dropping it — clearing our columns alone would leave a live link that a
    // devotee holding the earlier email/WhatsApp could still pay at the stale amount,
    // and an over-capture is accepted by the money guard, so it would silently
    // complete with an unrecorded overpayment.
    let linkCancelled = null;
    if (reg.balance_link_url || reg.balance_link_id) {
        if (reg.balance_link_id) {
            const res = await cancelPaymentLink(reg.balance_link_id);
            linkCancelled = res.ok ? true : res.error;
        }
        update.balance_link_url = null;
        update.balance_link_id = null;
    }

    // Already covered by what they've paid → complete it and send the ticket.
    const completing = newDue <= 0 && CAN_AUTO_COMPLETE.includes(reg.payment_status);
    if (completing) {
        update.payment_status = 'completed';
        update.amount_due = 0;
    }

    const { error: upErr } = await supabaseAdmin.from('registrations').update(update).eq('id', id);
    if (upErr) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

    if (completing) {
        await dispatchTicket({ ...reg, ...update }, reg.razorpay_payment_id || reg.offline_reference || 'donation-adjusted');
    }

    const who = `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'registrant';
    const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
    await logAudit({
        session, request,
        action: 'registration.adjust_donation', entity: 'registration', entityId: id,
        summary: `Donation ${inr(oldDonation)} → ${inr(newDonation)} for ${who} · total ${inr(newTotal)}, due ${inr(update.amount_due)}${completing ? ' · marked Paid' : ''}${linkCancelled === true ? ' · old balance link cancelled' : linkCancelled ? ' · ⚠️ old balance link NOT cancelled' : ''}`,
        metadata: { oldDonation, newDonation, base, newTotal, paid, newDue: update.amount_due, completed: completing, linkCancelled },
    });

    return NextResponse.json({
        ok: true, donation: newDonation, total: newTotal,
        amount_due: update.amount_due, completed: completing,
        // true = cancelled, a string = Razorpay's reason it couldn't be, null = none existed.
        linkCancelled,
    });
}
