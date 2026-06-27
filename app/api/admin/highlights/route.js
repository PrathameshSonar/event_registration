// Admin CRUD for an event's ritual / highlight cards.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const COLS = ['icon', 'title', 'title_hi', 'description', 'description_hi', 'sort_order'];
function pick(input = {}) {
    const out = {};
    for (const k of COLS) if (input[k] !== undefined) out[k] = input[k] === '' ? null : input[k];
    if (out.sort_order !== undefined) out.sort_order = Number(out.sort_order) || 0;
    return out;
}

export async function GET(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ items: [] });
    const { data, error } = await supabaseAdmin.from('event_highlights').select('*').eq('event_id', eventId).order('sort_order');
    if (error) return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const body = await request.json();
    if (!body.event_id) return NextResponse.json({ error: 'Missing event.' }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    const { data: cnt } = await supabaseAdmin.from('event_highlights').select('id', { count: 'exact', head: true }).eq('event_id', body.event_id);
    const { error } = await supabaseAdmin.from('event_highlights').insert({ event_id: body.event_id, ...pick(body), icon: body.icon || '🪔', sort_order: body.sort_order ?? (cnt ?? 0) });
    if (error) return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('event_highlights').update(pick(updates)).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('event_highlights').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
