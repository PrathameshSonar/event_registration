// app/api/admin/request-enquiry-payment/route.js
// Converts an enquiry lead into a payable registration: sets the tier's fixed
// price on the record, moves it to `awaiting_payment`, and sends a Razorpay
// payment link (email + WhatsApp). Payment completes the SAME record via the
// existing payment_link.paid webhook / reconcile path. Admin only.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { sendPaymentLink } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const ELIGIBLE = ['enquired', 'contacted', 'awaiting_payment'];

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title, price)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    if (!ELIGIBLE.includes(reg.payment_status)) {
        return NextResponse.json({ error: 'Payment can only be requested for an open enquiry.' }, { status: 400 });
    }

    const price = Number(reg.categories?.price) || 0;
    if (price <= 0) {
        return NextResponse.json({ error: 'Set a price on this ticket tier before requesting payment.' }, { status: 400 });
    }

    // Stamp the fixed price onto the record so the balance-link engine can charge
    // and complete it. amount_due = full price → payment_link.paid completes it.
    const { error: upErr } = await supabaseAdmin
        .from('registrations')
        .update({
            total_amount: price,
            amount_due: price,
            amount_paid: 0,
            payment_plan: 'full',
            payment_status: 'awaiting_payment',
        })
        .eq('id', reg.id);
    if (upErr) return NextResponse.json({ error: 'Could not update the registration.' }, { status: 500 });

    const freshReg = { ...reg, total_amount: price, amount_due: price };
    const shortUrl = await sendPaymentLink(freshReg, 'enquiry');
    if (!shortUrl) {
        return NextResponse.json({ error: 'Could not create the payment link. Check Razorpay configuration.' }, { status: 500 });
    }

    await logAudit({
        session, request,
        action: 'enquiry.request_payment',
        entity: 'registration', entityId: reg.id,
        summary: `Requested payment (₹${price.toLocaleString('en-IN')}) from ${reg.first_name} ${reg.last_name}`,
        metadata: { price },
    });

    return NextResponse.json({ ok: true, link: shortUrl });
}
