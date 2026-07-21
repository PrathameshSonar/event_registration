// Marks a registration as scanned at a specific checkpoint.
// Each scan inserts one row in the checkins table (full audit trail).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEntryBands } from '@/lib/settingsServer';
import { BAND_COLORS } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { scannerPin, checkpointId, manual } = body;

    // Accept scanner PIN (entry staff) OR admin/volunteer session.
    const pinEnv = process.env.SCANNER_PIN;
    const pinOk = pinEnv && scannerPin === pinEnv;
    if (!pinOk) {
        const { response } = await authorize({ requireAdmin: false });
        if (response) return response;
    }

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

    // One check-in row per registration + checkpoint. Re-scans at the same
    // checkpoint are reported as DUPLICATE but do NOT add another row.
    if (isFirst) {
        await supabaseAdmin.from('checkins').insert({ registration_id: id, checkpoint_id: checkpointId, manual: !!manual });
        return NextResponse.json({ status: 'NEW', reg, band });
    }
    return NextResponse.json({ status: 'DUPLICATE', reg, band, count: existingCount });
}
