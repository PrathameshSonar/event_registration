// app/api/admin/refund/route.js
// Issue a Razorpay refund for a paid online registration. Full by default, or a
// partial amount. A full refund flips the registration to 'refunded'. Admin only.
// (Offline payments have no Razorpay payment — use the "Reverse" action instead.)
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { getRazorpayClient } from '@/lib/razorpayClient';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'payments:refund' });
    if (response) return response;

    const { id, amount, note } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const reason = (note || '').toString().slice(0, 300).trim();

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('id, razorpay_payment_id, payment_status, total_amount, payment_method, first_name, last_name')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    if (reg.payment_status !== 'completed') {
        return NextResponse.json({ error: 'Only a completed (Paid) registration can be refunded.' }, { status: 400 });
    }
    if (!reg.razorpay_payment_id || (reg.payment_method && reg.payment_method !== 'razorpay')) {
        return NextResponse.json({ error: 'This is an offline payment — use "Reverse" on the registration instead.' }, { status: 400 });
    }

    const total = Number(reg.total_amount) || 0;
    const refundRupees = amount != null && amount !== '' ? Number(amount) : total;
    if (!(refundRupees > 0) || refundRupees > total) {
        return NextResponse.json({ error: `Enter a refund amount between ₹1 and ₹${total}.` }, { status: 400 });
    }
    const isFull = refundRupees >= total;

    try {
        await getRazorpayClient().payments.refund(reg.razorpay_payment_id, {
            amount: Math.round(refundRupees * 100),
            speed: 'normal',
            notes: { reason: reason || 'Admin refund', registration_id: id, by: session?.role || 'admin' },
        });
    } catch (e) {
        console.error('Refund failed:', e?.error?.description || e?.message);
        return NextResponse.json({ error: e?.error?.description || 'Razorpay refund failed.' }, { status: 502 });
    }

    if (isFull) {
        await supabaseAdmin.from('registrations').update({ payment_status: 'refunded' }).eq('id', id);
    }

    await logAudit({
        session, request,
        action: 'registration.refund', entity: 'registration', entityId: id,
        summary: `Refunded ₹${refundRupees.toLocaleString('en-IN')}${isFull ? ' (full)' : ' (partial)'} to ${reg.first_name} ${reg.last_name}${reason ? ` — ${reason}` : ''}`,
        metadata: { amount: refundRupees, full: isFull, reason: reason || null },
    });

    return NextResponse.json({ ok: true, full: isFull });
}
