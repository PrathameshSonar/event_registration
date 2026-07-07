// app/api/admin/waitlist/route.js
// Admin waitlist management (Settings). Requires settings:manage.
//   GET                      → all entries with tier title, newest first
//   POST { id, action }      → action ∈ 'notify' | 'remove'
//     notify → email + WhatsApp the person a registration link, mark 'notified'
//     remove → delete the entry
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { escapeHtml } from '@/lib/escape';
import { sendEmail, emailShell } from '@/lib/email';
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

export async function GET() {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { data, error } = await supabaseAdmin
        .from('waitlist')
        .select('id, name, phone, email, status, created_at, notified_at, category_id, categories(title)')
        .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: 'Failed to load waitlist.' }, { status: 500 });
    return NextResponse.json({ waitlist: data || [] });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { id, action } = await request.json();
    if (!id || !['notify', 'remove'].includes(action)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

    const { data: row } = await supabaseAdmin
        .from('waitlist').select('*, categories(title)').eq('id', id).single();
    if (!row) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });

    if (action === 'remove') {
        await supabaseAdmin.from('waitlist').delete().eq('id', id);
        await logAudit({ session, request, action: 'waitlist.remove', entity: 'waitlist', entityId: id, summary: `Removed ${row.name} from the ${row.categories?.title || 'tier'} waitlist` });
        return NextResponse.json({ ok: true });
    }

    // notify → send a registration link (a seat opened up).
    const tier = row.categories?.title || 'the event';
    const link = `${siteUrl()}/register/${row.category_id}`;
    let emailed = false, waSent = false;

    if (row.email) {
        emailed = await sendEmail({
            to: row.email,
            subject: `🎉 A spot opened up — ${tier}`,
            html: emailShell(`
                <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${escapeHtml(row.name)}</strong>,</p>
                <p style="font-size:14px;color:#6b7280;line-height:1.6;">Good news — a spot has opened up for <strong>${escapeHtml(tier)}</strong>. Register now before it fills again:</p>
                <p><a href="${link}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Register now</a></p>
                <p style="font-size:12px;color:#9ca3af;">This spot is first-come — the link may stop working once seats fill.</p>
            `),
        });
    }
    if (row.phone) {
        // Params: [name, tier, registerLink]
        waSent = await sendWhatsAppTemplate(row.phone, WHATSAPP_TEMPLATES.waitlistOpen, [row.name, tier, link]);
    }

    await supabaseAdmin.from('waitlist').update({ status: 'notified', notified_at: new Date().toISOString() }).eq('id', id);
    await logAudit({ session, request, action: 'waitlist.notify', entity: 'waitlist', entityId: id, summary: `Notified ${row.name} — spot open for ${tier}`, metadata: { emailed, waSent } });
    return NextResponse.json({ ok: true, emailed, waSent });
}
