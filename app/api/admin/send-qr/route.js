// app/api/admin/send-qr/route.js
// Generates QR entry passes and sends them via email + WhatsApp.
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

let _resend = null;
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

const BATCH_LIMIT = 100;

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { registrationIds } = await request.json();
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        return NextResponse.json({ error: 'No registrations selected.' }, { status: 400 });
    }
    if (registrationIds.length > BATCH_LIMIT) {
        return NextResponse.json({ error: `Maximum ${BATCH_LIMIT} registrations per batch.` }, { status: 400 });
    }

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

    const { data: regs, error } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, total_amount, payment_status, email, phone, categories(title)')
        .in('id', registrationIds);

    if (error || !regs) {
        return NextResponse.json({ error: 'Failed to fetch registrations.' }, { status: 500 });
    }

    let emailSent = 0, emailFailed = 0, waSent = 0, waFailed = 0;

    for (const reg of regs) {
        const verifyUrl = `${siteUrl}/entry/${reg.id}`;
        const salutation = reg.salutation ? `${reg.salutation} ` : '';
        const fullName = `${salutation}${reg.first_name} ${reg.last_name}`;
        const categoryTitle = reg.categories?.title || 'General Admission';
        const shortId = reg.id.split('-')[0].toUpperCase();

        // Generate QR as PNG buffer (used for email + storage upload)
        let qrBuffer;
        try {
            qrBuffer = await QRCode.toBuffer(verifyUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#171717', light: '#ffffff' },
            });
        } catch (e) {
            console.error('QR generation failed for', reg.id, e);
            continue;
        }
        const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;

        // Upload to Supabase Storage to get a public URL for WhatsApp image.
        // Requires a public bucket named "qr-codes" — create it once in Supabase Dashboard → Storage.
        let qrPublicUrl = null;
        const { error: upErr } = await supabaseAdmin.storage
            .from('qr-codes')
            .upload(`${reg.id}.png`, qrBuffer, { contentType: 'image/png', upsert: true });
        if (!upErr) {
            const { data: urlData } = supabaseAdmin.storage.from('qr-codes').getPublicUrl(`${reg.id}.png`);
            qrPublicUrl = urlData?.publicUrl || null;
        } else {
            console.warn('QR storage upload failed (bucket may not exist yet):', upErr.message);
        }

        // ── EMAIL ─────────────────────────────────────────────
        if (reg.email && process.env.RESEND_API_KEY) {
            try {
                await getResend().emails.send({
                    from: process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>',
                    to: [reg.email],
                    subject: '🎟️ Your Entry QR Code — BaglaBhairav Mahotsav',
                    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
  <div style="background:#171717;padding:32px;text-align:center;">
    <span style="color:#ea580c;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:.1em;">Entry Pass</span>
    <h1 style="color:#fff;margin:8px 0 0;font-size:26px;font-weight:800;">BaglaBhairav Mahotsav</h1>
  </div>
  <div style="padding:32px;background:#fff;text-align:center;">
    <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${fullName}</strong>,</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;">Please show this QR code at the event entrance. Our team will scan it to verify your registration.</p>
    <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:16px;padding:24px;display:inline-block;margin:16px auto;">
      <img src="${qrDataUrl}" alt="Entry QR Code" width="220" height="220" style="display:block;border-radius:8px;" />
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0;text-align:left;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:40%;">Name:</td><td style="padding:6px 0;font-weight:bold;color:#111827;">${fullName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td style="padding:6px 0;font-weight:bold;color:#111827;">${categoryTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Attendees:</td><td style="padding:6px 0;font-weight:bold;color:#111827;">${reg.attendees_count} Person(s)</td></tr>
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:10px 0 0;color:#6b7280;">Amount Paid:</td>
          <td style="padding:10px 0 0;font-weight:800;color:#16a34a;font-size:16px;">₹${reg.total_amount}</td>
        </tr>
      </table>
    </div>
    <p style="font-size:12px;color:#9ca3af;">Can't scan? Open your pass: <a href="${verifyUrl}" style="color:#ea580c;">${verifyUrl}</a></p>
  </div>
  <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
    Ref: ${shortId} · Secured via Razorpay
  </div>
</div>`,
                });
                emailSent++;
            } catch (e) {
                console.error('Email QR failed for', reg.id, e);
                emailFailed++;
            }
        }

        // ── WHATSAPP ──────────────────────────────────────────
        if (reg.phone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
            try {
                let cleanPhone = reg.phone.replace(/\D/g, '');
                if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

                const caption = `🎟️ *BaglaBhairav Entry Pass*\n\n👤 *Name:* ${fullName}\n🏷️ *Category:* ${categoryTitle}\n👥 *Attendees:* ${reg.attendees_count}\n💰 *Paid:* ₹${reg.total_amount}\n\n📲 *Scan QR or open:*\n${verifyUrl}`;

                // Send as image if we have a public URL; otherwise fall back to text with link.
                const waBody = qrPublicUrl
                    ? { messaging_product: 'whatsapp', to: cleanPhone, type: 'image', image: { link: qrPublicUrl, caption } }
                    : { messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { preview_url: true, body: caption } };

                await fetch(process.env.WHATSAPP_API_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(waBody),
                });
                waSent++;
            } catch (e) {
                console.error('WhatsApp QR failed for', reg.id, e);
                waFailed++;
            }
        }
    }

    return NextResponse.json({ ok: true, emailSent, emailFailed, waSent, waFailed, total: regs.length });
}
