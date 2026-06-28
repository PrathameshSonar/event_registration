// app/api/admin/reconcile-balance/route.js
// Admin "Sync payment": re-checks a registration against Razorpay and applies any
// catch-up state change. Shares the exact reconciliation path as the cron and the
// live webhook (lib/payments). Use when a webhook was missed or not configured.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { reconcileRegistrationWithRazorpay } from '@/lib/payments';

export const dynamic = 'force-dynamic';

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
    if (reg.payment_status !== 'advance_paid' && reg.payment_status !== 'pending') {
        return NextResponse.json({ error: 'This registration has no pending payment to sync.' }, { status: 400 });
    }

    let result;
    try {
        result = await reconcileRegistrationWithRazorpay(reg);
    } catch (e) {
        console.error('reconcile-balance: failed:', e?.message);
        return NextResponse.json({ error: 'Could not reach Razorpay to verify the payment.' }, { status: 502 });
    }

    if (result.status === 'completed' || result.status === 'advance_recorded') {
        await logAudit({
            session, request,
            action: 'balance.reconcile',
            entity: 'registration', entityId: reg.id,
            summary: `Synced from Razorpay → ${result.status === 'completed' ? 'completed' : 'advance paid'} (${reg.first_name} ${reg.last_name})`,
            metadata: { result: result.status },
        });
        return NextResponse.json({ ok: true, completed: result.status === 'completed', status: result.status });
    }

    if (result.status === 'amount_mismatch') {
        await logAudit({
            session, request,
            action: 'balance.reconcile',
            entity: 'registration', entityId: reg.id,
            summary: `Sync found an AMOUNT MISMATCH for ${reg.first_name} ${reg.last_name}`,
            metadata: { expectedPaise: result.expectedPaise, capturedPaise: result.capturedPaise },
        });
        return NextResponse.json({ ok: true, completed: false, status: 'amount_mismatch', message: 'Razorpay shows a different amount than expected — flagged as Amount Mismatch for review. NOT marked paid.' });
    }

    if (result.status === 'error') {
        return NextResponse.json({ error: 'Could not reach Razorpay to verify the payment.' }, { status: 502 });
    }

    // still_pending / still_due / no_link / skipped_no_order
    const messages = {
        still_due: 'Razorpay shows the balance link is not paid yet.',
        still_pending: 'Razorpay shows no captured payment for this order yet.',
        no_link: 'No balance payment link was found on Razorpay for this registration.',
        skipped_no_order: 'This registration has no Razorpay order to check.',
    };
    return NextResponse.json({ ok: true, completed: false, status: result.status, message: messages[result.status] || 'No payment found to apply yet.' });
}
