// app/api/admin/contact-messages/route.js
//   GET    → list contact-form submissions + unread count (settings:manage)
//   PATCH  → mark one read / unread (settings:manage)
//   DELETE → remove one message (settings:manage)
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { data, error } = await supabaseAdmin
        .from('contact_messages')
        .select('id, name, email, phone, subject, message, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
    if (error) return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 });
    const rows = data || [];
    const unread = rows.filter((r) => !r.is_read).length;
    return NextResponse.json({ messages: rows, count: rows.length, unread });
}

export async function PATCH(request) {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id, is_read } = await request.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin
        .from('contact_messages').update({ is_read: !!is_read }).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id } = await request.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('contact_messages').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    await logAudit({ session, request, action: 'contact.delete', entity: 'contact_message', entityId: id, summary: 'Deleted a contact message' });
    return NextResponse.json({ ok: true });
}
