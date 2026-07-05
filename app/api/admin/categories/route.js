// app/api/admin/categories/route.js
// Create / update / delete ticket categories. Admin only.
// DELETE requires re-authentication with the admin password.
import { NextResponse } from 'next/server';
import { authorize, verifyAdminPassword } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

// Whitelist of columns the dashboard is allowed to write.
function sanitize(input = {}) {
    const out = {};
    const allowed = ['title', 'price', 'description', 'detailed_description', 'media_url',
        'is_full', 'is_enquiry_only', 'max_capacity', 'show_availability',
        'title_hi', 'description_hi', 'detailed_description_hi', 'max_attendees_per_reg',
        'event_id', 'show_emi_badge', 'allow_part_payment', 'advance_percent', 'allow_enquiry',
        'min_age', 'max_age'];
    for (const key of allowed) {
        if (input[key] !== undefined) out[key] = input[key];
    }
    // Age limits: blank/0/invalid → null (open to all).
    for (const k of ['min_age', 'max_age']) {
        if (out[k] !== undefined) { const n = parseInt(out[k], 10); out[k] = Number.isFinite(n) && n > 0 ? n : null; }
    }
    if (out.price !== undefined) out.price = Number(out.price) || 0;
    if (out.max_capacity !== undefined) out.max_capacity = Number(out.max_capacity) || 0;
    if (out.max_attendees_per_reg !== undefined) out.max_attendees_per_reg = Math.max(1, Number(out.max_attendees_per_reg) || 5);
    if (out.advance_percent !== undefined) out.advance_percent = Math.min(100, Math.max(1, Number(out.advance_percent) || 25));
    return out;
}

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;
    const body = await request.json();
    const values = sanitize(body);
    if (!values.title) return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    const { data: created, error } = await supabaseAdmin.from('categories').insert([values]).select('id').single();
    if (error) {
        console.error('Category create error:', error.code, error.message);
        return NextResponse.json({ error: 'Create failed.', detail: error.message }, { status: 500 });
    }
    await logAudit({
        session, request,
        action: 'category.create', entity: 'category', entityId: created?.id,
        summary: `Created tier "${values.title}" (₹${values.price ?? 0})`,
    });
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const clean = sanitize(updates);
    const { error } = await supabaseAdmin.from('categories').update(clean).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'category.update', entity: 'category', entityId: id,
        summary: `Updated tier${clean.title ? ` "${clean.title}"` : ''}`,
        metadata: { fields: Object.keys(clean) },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, password, force } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    if (!verifyAdminPassword(password)) {
        return NextResponse.json({ error: 'Re-enter the admin password to authorize deletion.' }, { status: 403 });
    }
    if (!force) {
        const { count } = await supabaseAdmin
            .from('registrations')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', id)
            .eq('payment_status', 'completed');
        if (count && count > 0) {
            return NextResponse.json(
                { error: `This category has ${count} paid registration(s). Deleting it will orphan those records.`, hasPaid: true, count },
                { status: 409 }
            );
        }
    }
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'category.delete', entity: 'category', entityId: id,
        summary: `Deleted tier${force ? ' (forced, had paid registrations)' : ''}`,
        metadata: { force: !!force },
    });
    return NextResponse.json({ ok: true });
}
