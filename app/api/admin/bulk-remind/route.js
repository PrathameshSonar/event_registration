// app/api/admin/bulk-remind/route.js
// One-click bulk payment reminders. Admin only.
//   POST { kind }  where kind ∈ 'pending' | 'balance'
//   'pending' → every abandoned online checkout (payment_status='pending'):
//               send a fresh "complete your registration" link for the full amount.
//   'balance' → every part-payment (payment_status='advance_paid', amount_due>0):
//               send the balance payment link.
// Each recipient gets an email + WhatsApp via sendPaymentLink(). One audit line
// records the batch. Links resolve through the same payment_link.paid webhook as
// single sends, so completion/reconciliation is unchanged.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { sendPaymentLink } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 200; // safety cap on a single click

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'reminders:send' });
    if (response) return response;

    const { kind } = await request.json();
    if (kind !== 'pending' && kind !== 'balance') {
        return NextResponse.json({ error: "kind must be 'pending' or 'balance'." }, { status: 400 });
    }

    const status = kind === 'balance' ? 'advance_paid' : 'pending';
    const { data: rows, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('payment_status', status)
        .order('created_at', { ascending: true })
        .limit(MAX_BATCH + 1);
    if (error) return NextResponse.json({ error: 'Could not load registrations.' }, { status: 500 });

    // Only rows we can actually reach and that owe money.
    const targets = (rows || [])
        .map((r) => ({ ...r, _due: Number(r.amount_due) > 0 ? Number(r.amount_due) : Number(r.total_amount) || 0 }))
        .filter((r) => r._due > 0 && (r.email || r.phone));

    const capped = targets.length > MAX_BATCH;
    const batch = targets.slice(0, MAX_BATCH);

    let sent = 0;
    const failedIds = [];
    for (const reg of batch) {
        // sendPaymentLink() reads amount_due; for pending we bill the full amount.
        const link = await sendPaymentLink({ ...reg, amount_due: reg._due }, kind === 'balance' ? 'balance' : 'enquiry');
        if (link) sent++; else failedIds.push(reg.id);
    }

    await logAudit({
        session, request,
        action: 'reminder.bulk',
        entity: 'batch', entityId: null,
        summary: `Bulk ${kind === 'balance' ? 'balance' : 'payment'} reminder — sent ${sent} of ${batch.length}${capped ? ` (capped at ${MAX_BATCH})` : ''}`,
        metadata: { kind, sent, attempted: batch.length, failed: failedIds.length, capped },
    });

    return NextResponse.json({ ok: true, sent, attempted: batch.length, failed: failedIds.length, capped, eligible: targets.length });
}
