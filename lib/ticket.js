// lib/ticket.js
//
// Sends the "registration confirmed" ticket email + WhatsApp once a registration
// is fully paid. Shared by the Razorpay webhook (auto, on payment_link.paid /
// payment.captured) and the admin "Sync payment" reconcile route (manual catch-up
// when a webhook was missed). The QR entry pass is sent separately, closer to the
// event.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendTemplatedEmail } from '@/lib/email';
import { sendWhatsAppTemplate, waConfigured } from '@/lib/whatsapp';

// Sends the ticket and RECORDS the delivery outcome on the registration
// (ticket_email_status / ticket_wa_status: 'sent' | 'failed' | 'skipped'),
// so the admin ledger can flag failures and offer a retry instead of the
// send silently dying in the server log.
export async function dispatchTicket(reg, paymentId) {
    let emailStatus = 'skipped', waStatus = 'skipped';
    const { data: activeEvent } = await supabaseAdmin
        .from('events').select('venue, date_time').eq('is_active', true).single();

    // Documents an admin flagged "attach to ticket email" in the media library
    // (e.g. the event brochure). Public + document + size-capped, all enforced when
    // the flag is set — see /api/admin/media-library PATCH. Best-effort: if the
    // lookup fails we still send the ticket, just without the attachment.
    let attachments = null;
    try {
        const { data: docs } = await supabaseAdmin
            .from('media_library')
            .select('url, filename, title')
            .eq('attach_to_ticket', true)
            .eq('visibility', 'public')
            .order('sort_order');
        attachments = (docs || [])
            .filter((d) => d.url)
            .map((d) => ({ url: d.url, filename: d.filename || d.title || 'attachment' }));
        if (!attachments.length) attachments = null;
    } catch (e) {
        console.error('ticket attachment lookup failed (sending without):', e?.message);
    }
    const eventVenue = activeEvent?.venue || null;
    const eventDate = activeEvent?.date_time || null;
    const firstName = reg.first_name, lastName = reg.last_name;
    const categoryTitle = reg.categories?.title || 'General Admission';
    const totalAmount = reg.total_amount;
    const attendeesCount = reg.attendees_count;

    if (reg.email) {
        // Copy lives in lib/emailTemplates.js (and is admin-overridable in Settings).
        // We pass DATA only — the renderer HTML-escapes every value.
        const ok = await sendTemplatedEmail({
            to: reg.email,
            kind: 'ticket',
            registrationId: reg.id,
            attachments,
            vars: {
                name: `${firstName} ${lastName}`,
                tier: categoryTitle,
                attendees: attendeesCount,
                total: totalAmount,
                paymentRef: paymentId,
                eventDate: eventDate || '',
                eventVenue: eventVenue || '',
            },
        });
        emailStatus = ok ? 'sent' : 'failed';
    }

    if (reg.phone && waConfigured()) {
        const ok = await sendWhatsAppTemplate(
            reg.phone, 'ticketConfirmation',
            [`${firstName} ${lastName}`, categoryTitle, paymentId],
            { kind: 'ticket', registrationId: reg.id },
        );
        waStatus = ok ? 'sent' : 'failed';
    }

    // Record the delivery outcome (best-effort — never breaks the payment flow).
    try {
        await supabaseAdmin.from('registrations').update({
            ticket_email_status: emailStatus,
            ticket_wa_status: waStatus,
            ticket_sent_at: new Date().toISOString(),
        }).eq('id', reg.id);
    } catch (e) { console.error('ticket delivery-status write failed:', e?.message); }

    return { emailStatus, waStatus };
}
