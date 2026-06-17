// app/api/checkin/[id]/route.js
// Marks a registration as checked-in. Accepts scanner PIN or admin session.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { scannerPin } = body;

    // Accept scanner PIN (for entry staff) OR admin/viewer session.
    const pinEnv = process.env.SCANNER_PIN;
    const pinOk = pinEnv && scannerPin === pinEnv;

    if (!pinOk) {
        const { response } = await authorize({ requireAdmin: false });
        if (response) return response;
    }

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, payment_status, checked_in_at, checked_in_count, categories(title)')
        .eq('id', id)
        .single();

    if (error || !reg) {
        return NextResponse.json({ status: 'INVALID', reason: 'not_found' });
    }

    if (reg.payment_status !== 'completed') {
        return NextResponse.json({ status: 'NOT_PAID', reg });
    }

    const isFirst = !reg.checked_in_at;
    const newCount = (reg.checked_in_count || 0) + 1;

    await supabaseAdmin
        .from('registrations')
        .update({
            checked_in_at: isFirst ? new Date().toISOString() : reg.checked_in_at,
            checked_in_count: newCount,
        })
        .eq('id', id);

    if (isFirst) {
        return NextResponse.json({ status: 'NEW', reg });
    }
    return NextResponse.json({ status: 'DUPLICATE', reg, checkedInAt: reg.checked_in_at, count: newCount });
}
