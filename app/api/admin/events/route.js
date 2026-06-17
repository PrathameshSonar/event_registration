// app/api/admin/events/route.js
// Create / set-active / delete events. Admin only.
// DELETE requires re-authentication with the admin password.
import { NextResponse } from 'next/server';
import { authorize, verifyAdminPassword } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { title, short_description, long_description, title_hi, short_description_hi, long_description_hi, date_time, date_time_hi, venue, venue_hi, map_url, makeActive } = await request.json();
    if (!title) return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    // Build insert payload — only include _hi fields when present so the insert
    // works even if add_hindi_columns.sql hasn't been run yet.
    const insertData = {
        title,
        short_description: short_description || null,
        long_description: long_description || null,
        is_active: !!makeActive,
    };
    if (title_hi) insertData.title_hi = title_hi;
    if (short_description_hi) insertData.short_description_hi = short_description_hi;
    if (long_description_hi) insertData.long_description_hi = long_description_hi;
    if (date_time) insertData.date_time = date_time;
    if (date_time_hi) insertData.date_time_hi = date_time_hi;
    if (venue) insertData.venue = venue;
    if (venue_hi) insertData.venue_hi = venue_hi;
    if (map_url) insertData.map_url = map_url;
    const { error } = await supabaseAdmin.from('events').insert([insertData]);
    if (error) {
        console.error('Event create error:', error.code, error.message);
        return NextResponse.json({ error: 'Create failed.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, setActive, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    if (setActive) {
        // Set one event active (and deactivate the rest).
        const off = await supabaseAdmin.from('events').update({ is_active: false }).neq('id', id);
        if (off.error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        const { error } = await supabaseAdmin.from('events').update({ is_active: true }).eq('id', id);
        if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    } else if (updates) {
        // Update event content fields.
        const allowed = [
            'title', 'short_description', 'long_description',
            'title_hi', 'short_description_hi', 'long_description_hi',
            'date_time', 'date_time_hi', 'venue', 'venue_hi', 'map_url',
        ];
        const sanitized = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) sanitized[key] = updates[key] || null;
        }
        const { error } = await supabaseAdmin.from('events').update(sanitized).eq('id', id);
        if (error) {
            console.error('Event update error:', error.code, error.message);
            return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        }
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, password } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    if (!verifyAdminPassword(password)) {
        return NextResponse.json({ error: 'Re-enter the admin password to authorize deletion.' }, { status: 403 });
    }
    const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
