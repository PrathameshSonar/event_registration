// lib/reconcileBatch.js
//
// Shared Layer-2 reconciliation: walk every not-yet-final registration in the
// window and re-check it against Razorpay, self-healing anything a missed webhook
// left behind (captured → completed/advance; genuine shortfall → amount_mismatch).
// Used by BOTH the scheduled cron (app/api/cron/reconcile) and the admin one-click
// "Sync all" button (app/api/admin/reconcile-all). Keep the status allowlist here
// in sync with the cron's original filter.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { reconcileRegistrationWithRazorpay } from '@/lib/payments';
import { logAudit } from '@/lib/auditLog';

const DEFAULT_WINDOW_DAYS = Number(process.env.RECONCILE_WINDOW_DAYS) || 30;
const DEFAULT_BATCH_LIMIT = 100;
const OPEN_STATUSES = ['pending', 'advance_paid', 'amount_mismatch', 'awaiting_payment'];

export async function reconcileBatch({
    windowDays = DEFAULT_WINDOW_DAYS,
    limit = DEFAULT_BATCH_LIMIT,
    session = { role: 'system' },
    request = null,
    action = 'reconcile.cron',
} = {}) {
    const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .in('payment_status', OPEN_STATUSES)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true }) // oldest-open first
        .limit(limit);

    if (error) {
        console.error('reconcileBatch: fetch failed:', error.message);
        return { ok: false, error: error.message };
    }

    const summary = { checked: 0, completed: 0, advance_recorded: 0, amount_mismatch: 0, still_open: 0, errors: 0 };
    const healed = [];

    for (const reg of rows || []) {
        summary.checked++;
        let result;
        try {
            result = await reconcileRegistrationWithRazorpay(reg);
        } catch (e) {
            summary.errors++;
            console.error(`reconcileBatch: ${reg.id} threw:`, e?.message);
            continue;
        }
        switch (result.status) {
            case 'completed':
                summary.completed++;
                healed.push({ id: reg.id, to: 'completed' });
                break;
            case 'advance_recorded':
                summary.advance_recorded++;
                healed.push({ id: reg.id, to: 'advance_paid' });
                break;
            case 'amount_mismatch':
                summary.amount_mismatch++;
                healed.push({ id: reg.id, to: 'amount_mismatch', expectedPaise: result.expectedPaise, capturedPaise: result.capturedPaise });
                break;
            case 'error':
                summary.errors++;
                break;
            default:
                summary.still_open++;
        }
    }

    // Only record an audit entry when the run actually changed money state.
    if (healed.length > 0) {
        await logAudit({
            session, request, action,
            entity: 'registration',
            summary: `Reconcile ${action === 'reconcile.cron' ? 'cron' : 'run'} healed ${summary.completed} completed, ${summary.advance_recorded} advance, ${summary.amount_mismatch} mismatch`,
            metadata: { ...summary, healed },
        });
    }

    console.log('🔁 reconcileBatch:', JSON.stringify(summary));
    return { ok: true, ...summary };
}
