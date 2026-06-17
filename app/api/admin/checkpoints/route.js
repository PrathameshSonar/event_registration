// Admin CRUD for entry checkpoints (GET / POST / PATCH / DELETE).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { data, error } = await supabaseAdmin
        .from('checkpoints')
        .select('*')
        .order('sort_order');
    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json({ checkpoints: data || [] });
}

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { name, sort_order } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const { data, error } = await supabaseAdmin
        .from('checkpoints')
        .insert({ name: name.trim(), sort_order: Number(sort_order) || 0 })
        .select()
        .single();
    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json({ checkpoint: data });
}

export async function PATCH(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const allowed = {};
    if (updates.name !== undefined) allowed.name = String(updates.name).trim();
    if (updates.sort_order !== undefined) allowed.sort_order = Number(updates.sort_order);
    if (updates.is_active !== undefined) allowed.is_active = Boolean(updates.is_active);
    const { data, error } = await supabaseAdmin
        .from('checkpoints')
        .update(allowed)
        .eq('id', id)
        .select()
        .single();
    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json({ checkpoint: data });
}

export async function DELETE(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const { error } = await supabaseAdmin.from('checkpoints').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
