// app/api/admin/clear-pending/route.js
// Bulk-clears abandoned online checkouts: marks `pending` registrations older
// than N hours as `failed`. Safe — a pending row only ever becomes `completed`
// via a captured Razorpay payment (webhook or the reconcile cron), so anything
// still pending after a few hours had no payment captured. Admin only.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const hours = Math.max(1, Number(body.olderThanHours) || 24);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('registrations')
        .update({ payment_status: 'failed' })
        .eq('payment_status', 'pending')
        .lt('created_at', cutoff)
        .select('id');

    if (error) return NextResponse.json({ error: 'Cleanup failed.' }, { status: 500 });

    const count = data?.length || 0;
    if (count > 0) {
        await logAudit({
            session, request,
            action: 'registration.clear_pending',
            entity: 'registration',
            summary: `Cleared ${count} abandoned pending checkout(s) older than ${hours}h → failed`,
            metadata: { count, olderThanHours: hours },
        });
    }
    return NextResponse.json({ ok: true, count });
}
