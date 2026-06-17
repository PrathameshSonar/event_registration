// app/api/admin/categories/route.js
// Create / update / delete ticket categories. Admin only.
// DELETE requires re-authentication with the admin password.
import { NextResponse } from 'next/server';
import { authorize, verifyAdminPassword } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Whitelist of columns the dashboard is allowed to write.
function sanitize(input = {}) {
    const out = {};
    const allowed = ['title', 'price', 'description', 'detailed_description', 'media_url',
        'is_full', 'is_enquiry_only', 'max_capacity', 'show_availability',
        'title_hi', 'description_hi', 'detailed_description_hi'];
    for (const key of allowed) {
        if (input[key] !== undefined) out[key] = input[key];
    }
    if (out.price !== undefined) out.price = Number(out.price) || 0;
    if (out.max_capacity !== undefined) out.max_capacity = Number(out.max_capacity) || 0;
    return out;
}

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const body = await request.json();
    const values = sanitize(body);
    if (!values.title) return NextResponse.json({ error: 'Title required.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('categories').insert([values]);
    if (error) return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function PATCH(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('categories').update(sanitize(updates)).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
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
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
