// app/api/waitlist/route.js
// Public: join the waitlist for a full tier. No auth. When a seat later frees,
// an admin notifies the next person from the admin waitlist view.
//   POST { categoryId, name, phone, email? }
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const bad = (m) => NextResponse.json({ error: m }, { status: 400 });

export async function POST(request) {
    const { categoryId, name, phone, email } = await request.json().catch(() => ({}));
    const cleanName = String(name || '').replace(/<[^>]*>/g, '').trim();
    const cleanPhone = String(phone || '').replace(/\s+/g, '').replace(/^(\+91|0091|91|0)/, '');

    if (!categoryId) return bad('Missing tier.');
    if (!cleanName) return bad('Name is required.');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) return bad('Enter a valid 10-digit Indian mobile number.');
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) return bad('Enter a valid email address.');

    const { data: category, error: catErr } = await supabaseAdmin
        .from('categories').select('id, event_id').eq('id', categoryId).single();
    if (catErr || !category) return bad('That tier does not exist.');

    // Idempotent: same phone already waiting for this tier → treat as success.
    const { data: existing } = await supabaseAdmin
        .from('waitlist').select('id').eq('category_id', categoryId).eq('phone', cleanPhone).eq('status', 'waiting').limit(1);
    if (existing && existing.length) return NextResponse.json({ ok: true, already: true });

    const { error } = await supabaseAdmin.from('waitlist').insert({
        category_id: categoryId, event_id: category.event_id || null,
        name: cleanName, phone: cleanPhone, email: cleanEmail || null,
    });
    if (error) return NextResponse.json({ error: 'Could not join the waitlist. Try again.' }, { status: 500 });

    return NextResponse.json({ ok: true });
}
