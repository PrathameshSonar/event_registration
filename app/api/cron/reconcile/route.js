// app/api/cron/reconcile/route.js
//
// Layer 2 reconciliation: periodically re-checks every not-yet-final registration
// (pending / advance_paid) against Razorpay and self-heals anything a missed
// webhook left behind. A captured payment that the webhook never delivered gets
// applied here within minutes; an underpayment is flagged amount_mismatch.
//
// Scheduling: wired via vercel.json (Vercel Cron). Protected by CRON_SECRET —
// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when that env
// var is set. Can also be triggered by any external scheduler that sends the
// same header.
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { reconcileRegistrationWithRazorpay } from '@/lib/payments';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow time to walk a batch of registrations

const WINDOW_DAYS = Number(process.env.RECONCILE_WINDOW_DAYS) || 30;
const BATCH_LIMIT = 100;

function authorized(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false; // refuse to run unprotected
    const header = request.headers.get('authorization') || '';
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function runReconcile() {
    const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .in('payment_status', ['pending', 'advance_paid', 'amount_mismatch', 'awaiting_payment'])
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true })
        .limit(BATCH_LIMIT);

    if (error) {
        console.error('reconcile cron: fetch failed:', error.message);
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
            console.error(`reconcile cron: ${reg.id} threw:`, e?.message);
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
            session: { role: 'system' },
            action: 'reconcile.cron',
            entity: 'registration',
            summary: `Reconcile cron healed ${summary.completed} completed, ${summary.advance_recorded} advance, ${summary.amount_mismatch} mismatch`,
            metadata: { ...summary, healed },
        });
    }

    console.log('🔁 reconcile cron:', JSON.stringify(summary));
    return { ok: true, ...summary };
}

export async function GET(request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await runReconcile();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// Allow POST too, for external schedulers that prefer it.
export async function POST(request) {
    return GET(request);
}
