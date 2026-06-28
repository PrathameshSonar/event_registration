// app/api/admin/reconcile-balance/route.js
// Admin "Sync payment": re-checks a balance payment link against Razorpay and,
// if it's actually paid, completes the registration. This is the safety net for
// when the `payment_link.paid` webhook is missed or not configured in Razorpay.
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { dispatchTicket } from '@/lib/ticket';

export const dynamic = 'force-dynamic';

let _razorpay = null;
function getRazorpay() {
    if (!_razorpay) {
        _razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _razorpay;
}

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    if (reg.payment_status === 'completed') {
        return NextResponse.json({ ok: true, completed: true, alreadyCompleted: true });
    }
    if (reg.payment_status !== 'advance_paid') {
        return NextResponse.json({ error: 'This registration has no pending balance to sync.' }, { status: 400 });
    }

    // Find the relevant payment link on Razorpay. Prefer the stored id; fall back
    // to looking up by the reference_id the webhook uses (bal_<registrationId>).
    let link = null;
    try {
        if (reg.balance_link_id) {
            link = await getRazorpay().paymentLink.fetch(reg.balance_link_id);
        } else {
            const res = await getRazorpay().paymentLink.all({ reference_id: `bal_${reg.id}`, count: 10 });
            const items = res?.payment_links || [];
            // Prefer a paid link; otherwise take the most recent.
            link = items.find((l) => l.status === 'paid') || items[items.length - 1] || null;
        }
    } catch (e) {
        console.error('reconcile-balance: Razorpay lookup failed:', e?.message);
        return NextResponse.json({ error: 'Could not reach Razorpay to verify the payment.' }, { status: 502 });
    }

    if (!link) {
        return NextResponse.json({ ok: true, completed: false, status: 'no_link', message: 'No balance payment link found on Razorpay for this registration.' });
    }

    if (link.status !== 'paid') {
        return NextResponse.json({ ok: true, completed: false, status: link.status, message: `Razorpay shows the balance link as "${link.status}", not paid yet.` });
    }

    // Paid on Razorpay but not reflected here → complete it now.
    // `payments` may be an array or a single object depending on API shape.
    const pay = Array.isArray(link.payments) ? link.payments[0] : link.payments;
    const paymentId = pay?.payment_id || link.id || reg.razorpay_payment_id;
    const { error: upErr } = await supabaseAdmin
        .from('registrations')
        .update({
            payment_status: 'completed',
            amount_paid: reg.total_amount,
            amount_due: 0,
            razorpay_payment_id: paymentId,
            balance_link_id: reg.balance_link_id || link.id,
        })
        .eq('id', reg.id);
    if (upErr) {
        console.error('reconcile-balance: DB update failed:', upErr.message);
        return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
    }

    await dispatchTicket(reg, paymentId);

    await logAudit({
        session, request,
        action: 'balance.reconcile',
        entity: 'registration', entityId: reg.id,
        summary: `Synced balance from Razorpay → completed (${reg.first_name} ${reg.last_name})`,
        metadata: { paymentLinkId: link.id, paymentId },
    });

    return NextResponse.json({ ok: true, completed: true });
}
