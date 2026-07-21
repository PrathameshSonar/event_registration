// app/api/admin/balance-link/route.js
// Admin: return the balance payment link for an advance-paid registration so the
// admin can COPY and share it manually (e.g. the WhatsApp/email didn't arrive).
// Creates the link if one isn't stored yet, WITHOUT notifying the customer — that
// is the difference from /api/admin/resend-balance, which emails + WhatsApps it.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ensureBalanceLink } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response } = await authorize({ requirePermission: 'reminders:send' });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('*, categories(title)')
        .eq('id', id)
        .single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    if (reg.payment_status !== 'advance_paid' || Number(reg.amount_due) <= 0) {
        return NextResponse.json({ error: 'No outstanding balance for this registration.' }, { status: 400 });
    }

    // Surface Razorpay's own reason — a bare "could not create a payment link" gave
    // the admin nothing to act on.
    const { url, error: linkErr } = await ensureBalanceLink(reg);
    if (!url) {
        return NextResponse.json({ error: linkErr || 'Could not create a payment link.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, link: url });
}
