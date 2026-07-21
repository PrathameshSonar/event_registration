// app/api/admin/reconcile-all/route.js
// Admin one-click "Sync all": runs the same Layer-2 reconciliation batch as the
// cron, but on demand and authorized by the admin session (not CRON_SECRET). Walks
// every open registration in the window against Razorpay and heals missed
// webhooks. Bounded by the shared batch limit; oldest-open rows first.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { reconcileBatch } from '@/lib/reconcileBatch';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'payments:verify' });
    if (response) return response;

    // A generous window for the manual run (the batch limit still bounds cost);
    // the admin expects "check everything that's still open", not just 30 days.
    const result = await reconcileBatch({ windowDays: 365, session, request, action: 'reconcile.manual' });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
