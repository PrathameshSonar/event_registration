// app/api/feedback/route.js
// Public: submit post-event feedback (rating 1-5 + optional comment/name).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { rating, comment, name, phone } = await request.json().catch(() => ({}));
    const r = parseInt(rating, 10);
    if (!(r >= 1 && r <= 5)) return NextResponse.json({ error: 'Please give a rating from 1 to 5.' }, { status: 400 });

    // Attach to the currently active event (if any).
    const { data: ev } = await supabaseAdmin.from('events').select('id').eq('is_active', true).single();

    const { error } = await supabaseAdmin.from('feedback').insert({
        event_id: ev?.id || null,
        rating: r,
        comment: String(comment || '').replace(/<[^>]*>/g, '').slice(0, 1000).trim() || null,
        name: String(name || '').replace(/<[^>]*>/g, '').slice(0, 100).trim() || null,
        phone: String(phone || '').replace(/\D/g, '').slice(-10) || null,
    });
    if (error) return NextResponse.json({ error: 'Could not save your feedback. Try again.' }, { status: 500 });

    return NextResponse.json({ ok: true });
}
