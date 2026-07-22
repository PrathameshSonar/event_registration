// app/api/admin/send-qr/route.js
// Generates QR entry passes and sends them via email + WhatsApp.
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { sendTemplatedEmail } from '@/lib/email';
import { sendWhatsAppText, sendWhatsAppImage, waConfigured } from '@/lib/whatsapp';
import { getQrConfig } from '@/lib/settingsServer';
import { getSiteName } from '@/lib/branding';

export const dynamic = 'force-dynamic';

const BATCH_LIMIT = 100;

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'qr:send' });
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
    const siteName = await getSiteName();

    const { data: allRegs, error } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, total_amount, payment_status, email, phone, categories(title)')
        .in('id', registrationIds);

    if (error || !allRegs) {
        return NextResponse.json({ error: 'Failed to fetch registrations.' }, { status: 500 });
    }

    // QR entry passes are only valid for fully-paid registrations. Anything else
    // (advance_paid, pending, enquired, failed, …) is skipped server-side so a QR
    // can never go out for an unpaid seat, regardless of what the UI sent.
    const regs = allRegs.filter((r) => r.payment_status === 'completed');
    const skippedNotPaid = allRegs.length - regs.length;

    let emailSent = 0, emailFailed = 0, waSent = 0, waFailed = 0;
    const sentIds = [];

    // Size / margin / colours / signed-URL lifetime — Settings → Templates & Config.
    // Fetched once for the whole batch, not per registration.
    const qrCfg = await getQrConfig();

    for (const reg of regs) {
        // verifyUrl = what the QR encodes → the STAFF scan-verify screen (VALID/INVALID).
        // passUrl   = the ATTENDEE'S own pass page (shows the QR to be scanned). The
        // attendee must only ever get passUrl — never the verify URL, or they could
        // just flash the green "VALID" screen at the gate without being scanned.
        const verifyUrl = `${siteUrl}/entry/${reg.id}`;
        const passUrl = `${siteUrl}/pass/${reg.id}`;
        const salutation = reg.salutation ? `${reg.salutation} ` : '';
        const fullName = `${salutation}${reg.first_name} ${reg.last_name}`;
        const categoryTitle = reg.categories?.title || 'General Admission';
        const shortId = reg.id.split('-')[0].toUpperCase();

        // Generate QR as PNG buffer (used for email + storage upload)
        let qrBuffer;
        try {
            qrBuffer = await QRCode.toBuffer(verifyUrl, {
                width: qrCfg.size,
                margin: qrCfg.margin,
                color: { dark: qrCfg.dark, light: qrCfg.light },
            });
        } catch (e) {
            console.error('QR generation failed for', reg.id, e);
            continue;
        }
        const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;
        let delivered = false;

        // Upload to a PRIVATE Supabase Storage bucket named "qr-codes", then generate a
        // 30-day signed URL for WhatsApp (WhatsApp servers need a public URL to fetch the image).
        // Create the bucket once: Supabase Dashboard → Storage → New Bucket → "qr-codes" (private).
        let qrPublicUrl = null;
        const { error: upErr } = await supabaseAdmin.storage
            .from('qr-codes')
            .upload(`${reg.id}.png`, qrBuffer, { contentType: 'image/png', upsert: true });
        if (!upErr) {
            const { data: signedData } = await supabaseAdmin.storage
                .from('qr-codes')
                .createSignedUrl(`${reg.id}.png`, qrCfg.link_expiry_days * 24 * 60 * 60);
            qrPublicUrl = signedData?.signedUrl || null;
        } else {
            console.warn('QR storage upload failed (bucket may not exist yet):', upErr.message);
        }

        // ── EMAIL ─────────────────────────────────────────────
        if (reg.email) {
            // Copy lives in lib/emailTemplates.js (admin-overridable in Settings) — we
            // pass DATA only; the renderer HTML-escapes every value.
            const ok = await sendTemplatedEmail({
                to: reg.email,
                kind: 'qr',
                registrationId: reg.id,
                vars: {
                    name: fullName,
                    tier: categoryTitle,
                    attendees: reg.attendees_count,
                    total: reg.total_amount,
                    // Hosted URL first: Gmail (and most clients) STRIP inline data: URIs,
                    // so the data URI showed as a broken image. The signed bucket URL
                    // renders everywhere; data URI is only a fallback if the upload failed.
                    qrImage: qrPublicUrl || qrDataUrl,
                    passUrl,
                    verifyUrl,
                    shortId,
                },
            });
            if (ok) { emailSent++; delivered = true; } else { emailFailed++; }
        }

        // ── WHATSAPP ──────────────────────────────────────────
        if (reg.phone && waConfigured()) {
            try {
                const caption = `🎟️ *${siteName} Entry Pass*\n\n👤 *Name:* ${fullName}\n🏷️ *Category:* ${categoryTitle}\n👥 *Attendees:* ${reg.attendees_count}\n💰 *Paid:* ₹${reg.total_amount}\n\n📲 *View your pass:*\n${passUrl}`;

                // Send as image if we have a public URL; otherwise fall back to text with link.
                const ok = qrPublicUrl
                    ? await sendWhatsAppImage(reg.phone, qrPublicUrl, caption, { kind: 'qr', registrationId: reg.id })
                    : await sendWhatsAppText(reg.phone, caption, true, { kind: 'qr', registrationId: reg.id });
                if (ok) { waSent++; delivered = true; } else { waFailed++; }
            } catch (e) {
                console.error('WhatsApp QR failed for', reg.id, e);
                waFailed++;
            }
        }

        if (delivered) sentIds.push(reg.id);
    }

    // Stamp the QR-sent timestamp on every registration we successfully reached,
    // so the admin UI can mark them as "Sent" and skip them on the next batch.
    if (sentIds.length > 0) {
        const { error: stampErr } = await supabaseAdmin
            .from('registrations')
            .update({ qr_sent_at: new Date().toISOString() })
            .in('id', sentIds);
        if (stampErr) console.error('Failed to stamp qr_sent_at:', stampErr.message);
    }

    await logAudit({
        session, request,
        action: 'qr.send',
        entity: 'registration',
        entityId: sentIds.length === 1 ? sentIds[0] : null,
        summary: `Sent QR to ${sentIds.length} registration(s)${skippedNotPaid ? ` (skipped ${skippedNotPaid} not Paid)` : ''}`,
        metadata: { requested: registrationIds.length, sent: sentIds.length, emailSent, waSent, emailFailed, waFailed, skippedNotPaid, ids: sentIds },
    });

    return NextResponse.json({
        ok: true,
        emailSent, emailFailed, waSent, waFailed,
        total: regs.length,
        sent: sentIds.length,
        skippedNotPaid,
    });
}
