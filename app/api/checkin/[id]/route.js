// Marks a registration as scanned at a specific checkpoint.
//
// AUTH: a signed-in account holding `checkin:scan` (admin always passes). There
// is deliberately NO shared scanner PIN any more — a PIN in env can't be
// attributed to a person, can't be revoked for one volunteer, and the old
// session fallback (`requireAdmin: false`) let ANY authenticated user record an
// entry. Gate staff now log in with their own account, exactly like the panel.
//
// ONE `checkins` row per registration + checkpoint. Re-scans at the same
// checkpoint report DUPLICATE (with the prior count) and insert nothing, so the
// table stays a clean "who came through where" record, not a raw scan feed.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEntryBands } from '@/lib/settingsServer';
import { BAND_COLORS } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const { response } = await authorize({ requirePermission: 'checkin:scan' });
    if (response) return response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { checkpointId, manual } = body;

    if (!checkpointId) {
        return NextResponse.json({ status: 'INVALID', reason: 'no_checkpoint' });
    }

    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, payment_status, category_id, categories(title)')
        .eq('id', id)
        .single();

    if (error || !reg) {
        return NextResponse.json({ status: 'INVALID', reason: 'not_found' });
    }

    if (reg.payment_status !== 'completed') {
        return NextResponse.json({ status: 'NOT_PAID', reg });
    }

    // Wristband colour for this Seva (Settings → Entry Checkpoints). Returned with
    // the result so the scanner can show the volunteer which band to hand over.
    // Only for paid entries — an unpaid scan gets no band.
    const bands = await getEntryBands();
    const bandKey = reg.category_id ? bands[reg.category_id] : null;
    const band = bandKey && BAND_COLORS[bandKey] ? { key: bandKey, ...BAND_COLORS[bandKey] } : null;

    // Count existing scans for this registration at this specific checkpoint.
    const { count: existingCount } = await supabaseAdmin
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('registration_id', id)
        .eq('checkpoint_id', checkpointId);

    const isFirst = !existingCount || existingCount === 0;

    if (isFirst) {
        await supabaseAdmin.from('checkins').insert({ registration_id: id, checkpoint_id: checkpointId, manual: !!manual });
        return NextResponse.json({ status: 'NEW', reg, band });
    }
    return NextResponse.json({ status: 'DUPLICATE', reg, band, count: existingCount });
}
