// app/api/admin/media/route.js
// Add / delete gallery media. Admin only.
import { NextResponse } from 'next/server';
import { authorize, verifyAdminPassword } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { media_type, url, caption, event_id } = await request.json();
    if (!url || !event_id) return NextResponse.json({ error: 'URL and event are required.' }, { status: 400 });
    let cleanUrl = url;
    if (media_type === 'youtube' && cleanUrl.includes('watch?v=')) {
        cleanUrl = cleanUrl.replace('watch?v=', 'embed/');
    }
    const { error } = await supabaseAdmin.from('event_media').insert([{
        media_type: media_type === 'youtube' ? 'youtube' : 'image',
        url: cleanUrl,
        caption: caption || null,
        event_id,
    }]);
    if (error) return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'media.create', entity: 'media', entityId: event_id,
        summary: `Added ${media_type === 'youtube' ? 'video' : 'image'} to gallery`,
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id, password } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    if (!verifyAdminPassword(password)) {
        return NextResponse.json({ error: 'Re-enter the admin password to authorize deletion.' }, { status: 403 });
    }
    const { error } = await supabaseAdmin.from('event_media').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'media.delete', entity: 'media', entityId: id,
        summary: 'Deleted gallery media',
    });
    return NextResponse.json({ ok: true });
}
