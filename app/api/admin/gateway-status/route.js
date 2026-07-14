// app/api/admin/gateway-status/route.js
// READ-ONLY status of the payment gateway + delivery channels.
//
// Deliberately NOT editable: API keys and webhook secrets stay in environment
// variables. Putting a live payment secret in a DB row that an admin panel can
// read and write would be a genuine security downgrade — anyone with settings
// access, or any SQL-injection/backup leak, would own the merchant account.
//
// So this answers the questions an operator actually has ("am I in test or live
// mode?", "is the webhook secret set?") WITHOUT ever exposing the secret itself.
// The key id is masked; the secret is never returned in any form.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { emailConfigured, EMAIL_FROM } from '@/lib/email';
import { waConfigured } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

// rzp_live_xxxx → rzp_live_••••xxxx  (enough to identify it, not enough to use it)
function maskKey(k) {
    if (!k) return null;
    const s = String(k);
    return s.length <= 8 ? '••••' : `${s.slice(0, 8)}••••${s.slice(-4)}`;
}

export async function GET() {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const hasSecret = !!process.env.RAZORPAY_KEY_SECRET;

    // Razorpay key ids are prefixed rzp_test_ / rzp_live_ — the only reliable way to
    // tell which mode you're actually in without calling their API.
    let mode = 'unknown';
    if (/^rzp_live_/i.test(keyId)) mode = 'live';
    else if (/^rzp_test_/i.test(keyId)) mode = 'test';

    return NextResponse.json({
        razorpay: {
            configured: !!keyId && hasSecret,
            keyId: maskKey(keyId),
            hasSecret,
            mode,
        },
        webhook: {
            secretSet: !!process.env.RAZORPAY_WEBHOOK_SECRET,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/webhook/razorpay`,
            // Both are required: without payment_link.paid, balance payments are
            // taken but the registration stays stuck on advance_paid (see §21).
            requiredEvents: ['payment.captured', 'payment_link.paid', 'payment.failed', 'refund.processed'],
        },
        cron: { secretSet: !!process.env.CRON_SECRET },
        email: { configured: emailConfigured(), from: EMAIL_FROM },
        whatsapp: { configured: waConfigured() },
    });
}
