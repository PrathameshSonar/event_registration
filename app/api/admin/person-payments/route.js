// app/api/admin/person-payments/route.js
// GET ?regId=<uuid> → every OTHER payment this person has made, so a registration
// isn't the only thing an admin can see about them. Right now that means standalone
// Seva donations from /donate, which have no foreign key to a registration — they're
// matched on identity instead: the last 10 digits of the phone, or the email.
//
// Last-10 matching (not exact) on purpose: donations and older registrations may
// store a phone raw ("07264810290", "+919876543210", "9876543210"), so an equality
// match would silently miss them. The ilike is only a prefilter — the exact last-10
// comparison is redone in JS so a substring can't produce a false match.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

export async function GET(request) {
    // Same gate as /api/admin/donations — donation figures are sensitive, so a
    // volunteer simply doesn't get this section (the UI hides it on a 403).
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const regId = new URL(request.url).searchParams.get('regId');
    if (!regId) return NextResponse.json({ error: 'Missing regId.' }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
        .from('registrations').select('id, phone, email').eq('id', regId).single();
    if (error || !reg) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    const phone10 = last10(reg.phone);
    const email = String(reg.email || '').toLowerCase().trim();

    const filters = [];
    if (phone10.length === 10) filters.push(`phone.ilike.%${phone10}`);
    if (email) filters.push(`email.ilike.${email}`);
    if (!filters.length) return NextResponse.json({ ok: true, donations: [], totalDonated: 0 });

    const { data: rows } = await supabaseAdmin
        .from('donations')
        .select('id, name, phone, email, amount, status, message, razorpay_payment_id, created_at')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
        .limit(50);

    // Re-verify the match exactly — ilike '%<10 digits>' is a prefilter, not proof.
    const donations = (rows || []).filter((d) =>
        (phone10.length === 10 && last10(d.phone) === phone10) ||
        (!!email && String(d.email || '').toLowerCase().trim() === email)
    );
    const totalDonated = donations
        .filter((d) => d.status === 'completed')
        .reduce((s, d) => s + Number(d.amount || 0), 0);

    return NextResponse.json({ ok: true, donations, totalDonated });
}
