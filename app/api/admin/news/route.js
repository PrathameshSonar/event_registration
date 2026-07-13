// Admin CRUD for an event's news / announcements.
// Same shape as highlights & faqs: per-event rows, English in the base columns,
// other languages in `translations`. `is_published` lets an item be drafted before
// it shows publicly.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const COLS = ['title', 'body', 'image_url', 'attachment_url', 'attachment_name', 'sort_order', 'translations'];
function pick(input = {}) {
    const out = {};
    for (const k of COLS) if (input[k] !== undefined) out[k] = input[k] === '' ? null : input[k];
    if (out.sort_order !== undefined) out.sort_order = Number(out.sort_order) || 0;
    // Boolean, so keep it out of the loop above (which nulls falsy values).
    if (input.is_published !== undefined) out.is_published = !!input.is_published;
    return out;
}

export async function GET(request) {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ items: [] });
    const { data, error } = await supabaseAdmin
        .from('event_news')
        .select('*')
        .eq('event_id', eventId)
        .order('published_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const body = await request.json();
    if (!body.event_id) return NextResponse.json({ error: 'Missing event.' }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title required.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('event_news').insert({
        event_id: body.event_id,
        ...pick(body),
        title: body.title.trim(),
    });
    if (error) return NextResponse.json({ error: 'Create failed.' }, { status: 500 });

    await logAudit({
        session, request,
        action: 'news.create', entity: 'news', entityId: body.event_id,
        summary: `Published announcement "${body.title.trim()}"`,
    });
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('event_news').update(pick(updates)).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'news.update', entity: 'news', entityId: id,
        summary: updates.is_published === false ? 'Unpublished announcement' : 'Updated announcement',
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('event_news').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'news.delete', entity: 'news', entityId: id,
        summary: 'Deleted announcement',
    });
    return NextResponse.json({ ok: true });
}
