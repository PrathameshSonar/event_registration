// app/api/admin/verify-payment/route.js
// Admin verification state machine for offline payments. Admin only.
//   POST { id, action, amount?, note?, method?, reference? }
//   action ∈ approve | reject | cheque_received | cheque_cleared | cheque_bounced | reverse | record
// approve/cheque_cleared/record → completed (+ ticket). reject → payment_rejected
// (+ notify). cheque_received → cheque_received. cheque_bounced/reverse → failed.
// If a confirmed amount ≠ tier total, the row is flagged amount_mismatch instead
// of completed. Every action is audit-logged.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { dispatchTicket } from '@/lib/ticket';
import { notifyOfflineRejected } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const OFFLINE_METHODS = ['bank_transfer', 'cheque', 'cash', 'dd'];

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id, action, amount, note, method, reference } = await request.json();
    if (!id || !action) return NextResponse.json({ error: 'Missing id or action.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    const now = new Date().toISOString();
    const stamp = { verified_by: session?.role || 'admin', verified_at: now };
    // Name the person in every audit summary so the log reads "…— Ramesh Iyer (98765…)".
    const who = `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'registrant';
    const tail = `${reg.phone ? ` (${reg.phone})` : ''}`;
    const audit = (summary, metadata) => logAudit({ session, request, action: `payment.${action}`, entity: 'registration', entityId: id, summary: `${summary} — ${who}${tail}`, metadata });

    // ── COMPLETE (approve / cheque_cleared / record) ─────────────────────────
    const completeStatuses = { approve: 1, cheque_cleared: 1, record: 1 };
    if (completeStatuses[action]) {
        // record = admin logs an offline payment on a pending/enquiry row in one step.
        if (action === 'record') {
            if (!OFFLINE_METHODS.includes(method)) return NextResponse.json({ error: 'Choose a payment method.' }, { status: 400 });
        }
        const price = Number(reg.total_amount) || 0;
        const received = amount != null && amount !== '' ? Number(amount) : price;
        const expected = action === 'record' ? (received || price) : price;

        // Money guard: a confirmed amount short of the tier price is a mismatch,
        // not a completion (over/equal is fine).
        if (expected > 0 && received < expected - 1) {
            await supabaseAdmin.from('registrations').update({
                payment_status: 'amount_mismatch', amount_paid: received,
                payment_method: action === 'record' ? method : reg.payment_method,
                offline_reference: reference ?? reg.offline_reference, ...stamp,
            }).eq('id', id);
            await audit(`Offline amount mismatch: received ₹${received}, expected ₹${expected}`, { received, expected });
            return NextResponse.json({ ok: true, status: 'amount_mismatch' });
        }

        const update = {
            payment_status: 'completed',
            amount_paid: action === 'record' ? received : (reg.total_amount || received),
            amount_due: 0, ...stamp,
        };
        if (action === 'record') {
            update.payment_method = method;
            update.offline_reference = reference || reg.offline_reference || null;
            if (!reg.total_amount) update.total_amount = received;
        }
        const { error: upErr } = await supabaseAdmin.from('registrations').update(update).eq('id', id);
        if (upErr) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

        await dispatchTicket({ ...reg, ...update }, reg.offline_reference || (action === 'record' ? reference : null) || `offline-${reg.payment_method || method}`);
        await audit(`Marked Paid (offline: ${action === 'record' ? method : reg.payment_method}${note ? ` — ${note}` : ''})`, { received, note: note || null });
        return NextResponse.json({ ok: true, status: 'completed' });
    }

    // ── CHEQUE RECEIVED ──────────────────────────────────────────────────────
    if (action === 'cheque_received') {
        await supabaseAdmin.from('registrations').update({ payment_status: 'cheque_received', ...stamp }).eq('id', id);
        await audit('Cheque received — awaiting clearance', { note: note || null });
        return NextResponse.json({ ok: true, status: 'cheque_received' });
    }

    // ── REJECT (proof invalid → user may resubmit) ───────────────────────────
    if (action === 'reject') {
        await supabaseAdmin.from('registrations').update({ payment_status: 'payment_rejected', ...stamp }).eq('id', id);
        await notifyOfflineRejected(reg, note || '');
        await audit(`Rejected offline payment${note ? `: ${note}` : ''}`, { reason: note || null });
        return NextResponse.json({ ok: true, status: 'payment_rejected' });
    }

    // ── CHEQUE BOUNCED / REVERSE (money did not land / clawback) ──────────────
    if (action === 'cheque_bounced' || action === 'reverse') {
        const target = action === 'reverse' ? 'refunded' : 'failed';
        await supabaseAdmin.from('registrations').update({ payment_status: target, amount_paid: 0, ...stamp }).eq('id', id);
        await audit(`${action === 'reverse' ? 'Reversed offline payment' : 'Cheque bounced'}${note ? `: ${note}` : ''}`, { reason: note || null, target });
        return NextResponse.json({ ok: true, status: target });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
