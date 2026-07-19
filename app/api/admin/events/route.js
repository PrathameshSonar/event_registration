// app/api/admin/events/route.js
// Create / set-active / delete events. Admin only.
// DELETE requires re-authentication with the admin password.
import { NextResponse } from 'next/server';
import { authorize, verifyAdminPassword } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { title, short_description, long_description, translations, date_time, venue, map_url, makeActive } = await request.json();
    if (!title) return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    // English lives in the base columns; other languages in `translations` JSONB.
    const insertData = {
        title,
        short_description: short_description || null,
        long_description: long_description || null,
        is_active: !!makeActive,
    };
    if (date_time) insertData.date_time = date_time;
    if (venue) insertData.venue = venue;
    if (map_url) insertData.map_url = map_url;
    if (translations && typeof translations === 'object' && Object.keys(translations).length) insertData.translations = translations;
    const { data: created, error } = await supabaseAdmin.from('events').insert([insertData]).select('id').single();
    if (error) {
        console.error('Event create error:', error.code, error.message);
        return NextResponse.json({ error: 'Create failed.', detail: error.message }, { status: 500 });
    }
    await logAudit({
        session, request,
        action: 'event.create', entity: 'event', entityId: created?.id,
        summary: `Created event "${title}"${makeActive ? ' (set live)' : ''}`,
    });
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id, setActive, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    if (setActive) {
        // Set one event active (and deactivate the rest).
        const off = await supabaseAdmin.from('events').update({ is_active: false }).neq('id', id);
        if (off.error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        const { error } = await supabaseAdmin.from('events').update({ is_active: true }).eq('id', id);
        if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        await logAudit({
            session, request,
            action: 'event.activate', entity: 'event', entityId: id,
            summary: 'Set event as the live event',
        });
    } else if (updates) {
        // Update event content fields.
        // ⚠️ A field missing from this whitelist SILENTLY fails to save (this bit
        // hero_image_url once). Add new event columns here.
        const allowed = [
            'title', 'short_description', 'long_description',
            'date_time', 'venue', 'map_url',
            'start_at', 'end_at', 'hero_image_url',
            'travel_info',
            'livestream_url', 'livestream_banner',
            'stats', 'about_images',
            'peak_day_label', 'peak_day_note', 'schedule_intro', 'schedule_days',
            'translations',
        ];
        const sanitized = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) sanitized[key] = updates[key] || null;
        }
        // Boolean flags — handled separately because the loop above coerces every
        // falsy value to null, which would turn `false` (go offline / un-archive)
        // into null instead of an explicit false.
        if (updates.show_in_archive !== undefined) sanitized.show_in_archive = !!updates.show_in_archive;
        if (updates.livestream_is_live !== undefined) sanitized.livestream_is_live = !!updates.livestream_is_live;
        const { error } = await supabaseAdmin.from('events').update(sanitized).eq('id', id);
        if (error) {
            console.error('Event update error:', error.code, error.message);
            return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        }
        await logAudit({
            session, request,
            action: 'event.update', entity: 'event', entityId: id,
            summary: 'Updated event content',
            metadata: { fields: Object.keys(sanitized) },
        });
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id, password } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    if (!(await verifyAdminPassword(session, password))) {
        return NextResponse.json({ error: 'Re-enter your account password to authorize deletion.' }, { status: 403 });
    }
    const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'event.delete', entity: 'event', entityId: id,
        summary: 'Deleted event',
    });
    return NextResponse.json({ ok: true });
}
