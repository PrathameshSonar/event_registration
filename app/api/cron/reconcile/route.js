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
import { reconcileBatch } from '@/lib/reconcileBatch';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow time to walk a batch of registrations

function authorized(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false; // refuse to run unprotected
    const header = request.headers.get('authorization') || '';
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await reconcileBatch({ action: 'reconcile.cron' });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// Allow POST too, for external schedulers that prefer it.
export async function POST(request) {
    return GET(request);
}
