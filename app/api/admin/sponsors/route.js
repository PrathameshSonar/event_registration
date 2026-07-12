// app/api/admin/sponsors/route.js
// Admin CRUD for event sponsors.
//
// Sponsorship deals are negotiated OFFLINE and recorded here by an admin — there
// is no public sponsor form and no Razorpay flow, because a company committing a
// large sponsorship does not self-serve through a checkout. Sponsors are also NOT
// rendered on the public site today; this is the internal record of who sponsored,
// at what level, for how much, and who to call.
//
//   GET                  → all sponsors (newest first), + the total committed
//   POST   { name, … }   → create
//   PATCH  { id, … }     → update
//   DELETE { id }        → remove
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const COLS = ['event_id', 'name', 'tier', 'amount', 'logo_url', 'contact_name', 'contact_phone', 'contact_email', 'notes', 'sort_order'];

function pick(input = {}) {
    const out = {};
    for (const k of COLS) if (input[k] !== undefined) out[k] = input[k] === '' ? null : input[k];
    if (out.amount !== undefined) out.amount = Number(out.amount) || 0;
    if (out.sort_order !== undefined) out.sort_order = Number(out.sort_order) || 0;
    return out;
}

export async function GET() {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { data, error } = await supabaseAdmin
        .from('sponsors')
        .select('*, events(title)')
        .order('amount', { ascending: false });
    if (error) return NextResponse.json({ error: 'Failed to load sponsors.' }, { status: 500 });

    const sponsors = data || [];
    const total = sponsors.reduce((s, r) => s + Number(r.amount || 0), 0);
    return NextResponse.json({ sponsors, total });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Sponsor name is required.' }, { status: 400 });

    const row = { ...pick(body), name: body.name.trim() };
    const { error } = await supabaseAdmin.from('sponsors').insert(row);
    if (error) return NextResponse.json({ error: 'Could not add the sponsor.' }, { status: 500 });

    await logAudit({
        session, request, action: 'sponsor.create', entity: 'sponsor', entityId: null,
        summary: `Added sponsor "${row.name}"${row.tier ? ` (${row.tier})` : ''}${row.amount ? ` — ₹${Number(row.amount).toLocaleString('en-IN')}` : ''}`,
        metadata: { tier: row.tier || null, amount: row.amount || 0 },
    });
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('sponsors').update(pick(updates)).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

    await logAudit({
        session, request, action: 'sponsor.update', entity: 'sponsor', entityId: id,
        summary: `Updated sponsor${updates.name ? ` "${updates.name}"` : ''}`,
        metadata: { updates: pick(updates) },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: row } = await supabaseAdmin.from('sponsors').select('name, amount').eq('id', id).single();
    const { error } = await supabaseAdmin.from('sponsors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });

    await logAudit({
        session, request, action: 'sponsor.delete', entity: 'sponsor', entityId: id,
        summary: `Removed sponsor "${row?.name || 'unknown'}"`,
        metadata: { amount: row?.amount || 0 },
    });
    return NextResponse.json({ ok: true });
}
