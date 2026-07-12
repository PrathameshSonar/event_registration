// app/api/my-registration/route.js
// Public self-service: a registrant enters their phone and we RE-SEND their pass
// link (and status) to the email/WhatsApp ALREADY ON FILE — never to whoever typed
// the number, and never shown on screen. So it's safe without OTP: an attacker
// can't receive someone else's pass. Rate-limited to prevent inbox/cost abuse.
//   POST { phone } → always { ok: true } (generic, no enumeration)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail, emailShell } from '@/lib/email';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { escapeHtml } from '@/lib/escape';

export const dynamic = 'force-dynamic';

const WINDOW_MIN = 60;
const MAX_PER_WINDOW = 5;        // per phone per hour
const ACTIONABLE = ['completed', 'advance_paid', 'pending', 'awaiting_payment', 'amount_mismatch', 'cheque_received', 'payment_review'];

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

const STATUS_LABEL = {
    completed: 'Paid — entry pass ready', advance_paid: 'Advance paid — balance pending',
    pending: 'Payment pending', awaiting_payment: 'Payment link sent',
    amount_mismatch: 'Under review', cheque_received: 'Cheque received', payment_review: 'Under verification',
};

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const last10 = String(body.phone || '').replace(/\D/g, '').slice(-10);
    // Generic response regardless — no enumeration, no leak.
    const generic = NextResponse.json({ ok: true });
    if (last10.length !== 10) return generic;

    const fwd = request.headers.get('x-forwarded-for');
    const ip = (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || null;

    // Rate limit (best-effort; fail open on DB error).
    try {
        const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
        const { count } = await supabaseAdmin.from('self_service_requests')
            .select('id', { count: 'exact', head: true }).eq('phone', last10).gte('created_at', since);
        await supabaseAdmin.from('self_service_requests').insert({ phone: last10, ip });
        if ((count || 0) >= MAX_PER_WINDOW) return generic; // silently drop excess
    } catch { /* fail open */ }

    // Find this person's actionable registrations (match the last 10 digits).
    const { data: regs } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, email, phone, payment_status, amount_due, categories(title)')
        .ilike('phone', `%${last10}`)
        .in('payment_status', ACTIONABLE)
        .order('created_at', { ascending: false });

    const matched = (regs || []).filter((r) => String(r.phone || '').replace(/\D/g, '').slice(-10) === last10);
    if (matched.length === 0) return generic; // nothing to send, but stay generic

    const base = siteUrl();
    const firstName = matched[0].first_name || 'devotee';
    const rows = matched.map((r) => {
        const label = STATUS_LABEL[r.payment_status] || r.payment_status;
        return { link: `${base}/pass/${r.id}`, tier: r.categories?.title || 'Registration', label };
    });

    // Email — one per distinct registered address.
    const emails = [...new Set(matched.map((r) => r.email).filter(Boolean))];
    for (const to of emails) {
        await sendEmail({
            to,
            subject: '🎟️ Your BaglaBhairav registration',
            html: emailShell(`
                <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${escapeHtml(firstName)}</strong>,</p>
                <p style="font-size:14px;color:#6b7280;line-height:1.6;">Here ${rows.length > 1 ? 'are your registrations' : 'is your registration'}. Open the link to view your entry pass (or complete payment if pending):</p>
                ${rows.map((r) => `
                    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin:10px 0;">
                        <div style="font-weight:700;color:#111827;">${escapeHtml(r.tier)}</div>
                        <div style="font-size:12px;color:#6b7280;margin:2px 0 8px;">${escapeHtml(r.label)}</div>
                        <a href="${r.link}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;">Open my pass</a>
                    </div>`).join('')}
                <p style="font-size:12px;color:#9ca3af;">Didn't request this? You can ignore this email.</p>
            `),
            // The email lists every matched registration, so it's only tied to one when there is one.
            log: matched.length === 1 ? { kind: 'self_service', registrationId: matched[0].id } : { kind: 'self_service' },
        });
    }

    // WhatsApp — free-form to the number on file (best-effort; delivers inside the
    // 24h window). Email is the guaranteed channel.
    const waText = `🙏 *BaglaBhairav* — here ${rows.length > 1 ? 'are your registrations' : 'is your registration'}:\n\n${rows.map((r) => `*${r.tier}* — ${r.label}\n${r.link}`).join('\n\n')}`;
    await sendWhatsAppText(matched[0].phone, waText, true, { kind: 'self_service' });

    return generic;
}
