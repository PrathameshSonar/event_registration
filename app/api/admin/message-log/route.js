// app/api/admin/message-log/route.js
//
// The outbound-message delivery log — "did they actually get it?".
//
//   GET  ?channel=&kind=&status=&q=&registrationId=&limit=
//        → recent messages, newest first.  Requires `audit:view` (this is a
//          delivery audit trail, so it rides the same permission as the audit log).
//
//   POST { id }  → RE-SEND that message.  Requires `reminders:send` (it puts a real
//        message in front of a real person, which is a send, not a read).
//
// Resend replays the STORED payload rather than re-deriving the message from its
// original business context — the rendered body / template+params were captured at
// send time precisely so a retry can't accidentally produce different content (a
// stale price, a rotated link) than what the failure was about. It always writes a
// NEW log row (linked to the original via metadata.resend_of), so the history shows
// the attempt and its outcome instead of silently mutating the failed row.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { logMessage } from '@/lib/messageLog';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppTemplate, sendWhatsAppText, sendWhatsAppImage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 500;

export async function GET(request) {
    const { response } = await authorize({ requirePermission: 'audit:view' });
    if (response) return response;

    const sp = request.nextUrl.searchParams;
    const channel = sp.get('channel');
    const kind = sp.get('kind');
    const status = sp.get('status');
    const registrationId = sp.get('registrationId');
    const q = (sp.get('q') || '').trim();
    const limit = Math.min(Number(sp.get('limit')) || 200, MAX_LIMIT);

    let query = supabaseAdmin
        .from('message_log')
        .select('id, created_at, channel, kind, recipient, subject, template, status, error, registration_id, metadata')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (channel) query = query.eq('channel', channel);
    if (kind) query = query.eq('kind', kind);
    if (status) query = query.eq('status', status);
    if (registrationId) query = query.eq('registration_id', registrationId);
    if (q) query = query.ilike('recipient', `%${q}%`);

    const { data, error } = await query;
    if (error) {
        console.error('message log read failed:', error.message);
        return NextResponse.json({ error: 'Failed to load the message log.' }, { status: 500 });
    }

    // Counts for the header strip — cheap HEAD queries, no rows pulled.
    const [{ count: total }, { count: failed }] = await Promise.all([
        supabaseAdmin.from('message_log').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('message_log').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    return NextResponse.json({ messages: data || [], total: total || 0, failed: failed || 0 });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'reminders:send' });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    // Pull the FULL row (the GET above omits body/template_params to keep the list light).
    const { data: msg, error } = await supabaseAdmin.from('message_log').select('*').eq('id', id).single();
    if (error || !msg) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

    let ok = false;
    // skipLog: true on every send — the helpers would otherwise log a row with no
    // link back to the original. We write that row ourselves, below.
    if (msg.channel === 'email') {
        if (!msg.recipient || !msg.body) {
            return NextResponse.json({ error: 'This email has no stored body to re-send.' }, { status: 400 });
        }
        ok = await sendEmail({ to: msg.recipient, subject: msg.subject, html: msg.body, skipLog: true });
    } else if (msg.channel === 'whatsapp') {
        if (msg.template) {
            ok = await sendWhatsAppTemplate(msg.recipient, msg.template, msg.template_params || [], null, true);
        } else if (msg.image_url) {
            ok = await sendWhatsAppImage(msg.recipient, msg.image_url, msg.body || '', null, true);
        } else if (msg.body) {
            const preview = msg.metadata?.preview_url ?? true;
            ok = await sendWhatsAppText(msg.recipient, msg.body, preview, null, true);
        } else {
            return NextResponse.json({ error: 'This WhatsApp message has no stored payload to re-send.' }, { status: 400 });
        }
    } else {
        return NextResponse.json({ error: `Unknown channel "${msg.channel}".` }, { status: 400 });
    }

    await logMessage({
        channel: msg.channel,
        recipient: msg.recipient,
        ok,
        kind: msg.kind,
        registrationId: msg.registration_id,
        subject: msg.subject,
        body: msg.body,
        template: msg.template,
        templateParams: msg.template_params,
        imageUrl: msg.image_url,
        error: ok ? null : 'Resend failed',
        metadata: { ...(msg.metadata || {}), resend_of: msg.id, resent_by: session?.username || session?.role || 'admin' },
    });

    await logAudit({
        session, request, action: 'message.resend', entity: 'message', entityId: String(id),
        summary: `Re-sent ${msg.kind || msg.channel} to ${msg.recipient} — ${ok ? 'delivered' : 'failed again'}`,
        metadata: { channel: msg.channel, kind: msg.kind, ok },
    });

    if (!ok) {
        return NextResponse.json({ error: 'The message failed again. Check the email / WhatsApp configuration and the recipient address.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
}
