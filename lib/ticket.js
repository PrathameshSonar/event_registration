// lib/ticket.js
//
// Sends the "registration confirmed" ticket email + WhatsApp once a registration
// is fully paid. Shared by the Razorpay webhook (auto, on payment_link.paid /
// payment.captured) and the admin "Sync payment" reconcile route (manual catch-up
// when a webhook was missed). The QR entry pass is sent separately, closer to the
// event.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/escape';

let _resend = null;
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

// Sends the ticket and RECORDS the delivery outcome on the registration
// (ticket_email_status / ticket_wa_status: 'sent' | 'failed' | 'skipped'),
// so the admin ledger can flag failures and offer a retry instead of the
// send silently dying in the server log.
export async function dispatchTicket(reg, paymentId) {
    let emailStatus = 'skipped', waStatus = 'skipped';
    const { data: activeEvent } = await supabaseAdmin
        .from('events').select('venue, date_time').eq('is_active', true).single();
    const eventVenue = activeEvent?.venue || null;
    const eventDate = activeEvent?.date_time || null;
    const firstName = reg.first_name, lastName = reg.last_name;
    const categoryTitle = reg.categories?.title || 'General Admission';
    const totalAmount = reg.total_amount;
    const attendeesCount = reg.attendees_count;
    // HTML-escaped copies for the email body (user/admin-supplied text).
    const eFirst = escapeHtml(firstName), eLast = escapeHtml(lastName);
    const eCat = escapeHtml(categoryTitle), ePay = escapeHtml(paymentId);
    const eDate = escapeHtml(eventDate), eVenue = escapeHtml(eventVenue);

    if (reg.email) {
        try {
            const { error: sendErr } = await getResend().emails.send({
                from: process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>',
                to: [reg.email],
                subject: `✅ Confirmed: Your Ticket for BaglaBhairav`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
                    <div style="background-color: #171717; padding: 32px; text-align: center;">
                        <span style="color: #ea580c; font-size: 12px; font-weight: bold; text-transform: uppercase;">Registration Confirmed</span>
                        <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 28px; font-weight: 800;">BaglaBhairav</h1>
                    </div>
                    <div style="padding: 32px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #404040; margin-top: 0;">Namaste <strong>${eFirst} ${eLast}</strong>,</p>
                        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Your registration is confirmed and your payment has been fully received. Below are your registration details. Your QR entry pass will be sent separately a few days before the event — please carry it at the venue gateway.</p>
                        <div style="background-color: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr><td style="padding: 6px 0; color: #6b7280;">Access Tier:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${eCat}</td></tr>
                            <tr><td style="padding: 6px 0; color: #6b7280;">Total Attendees:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${attendeesCount} Person(s)</td></tr>
                            <tr><td style="padding: 6px 0; color: #6b7280;">Payment Reference:</td><td style="padding: 6px 0; font-family: monospace; color: #ea580c; text-align: right; font-size: 12px;">${ePay}</td></tr>
                            <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0 0 0; font-weight: bold; color: #111827;">Total Paid:</td><td style="padding: 12px 0 0 0; font-weight: 800; color: #16a34a; text-align: right; font-size: 18px;">₹${totalAmount}</td></tr>
                        </table>
                        </div>
                        ${eventVenue || eventDate ? `
                        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                            ${eventDate ? `<div style="font-size: 13px; color: #9a3412; margin-bottom: 6px;">📅 <strong>Date:</strong> ${eDate}</div>` : ''}
                            ${eventVenue ? `<div style="font-size: 13px; color: #9a3412;">📍 <strong>Venue:</strong> ${eVenue}</div>` : ''}
                        </div>` : ''}
                    </div>
                    </div>`,
            });
            emailStatus = sendErr ? 'failed' : 'sent';
            if (sendErr) console.error('🚨 Ticket email failed:', sendErr);
        } catch (e) { emailStatus = 'failed'; console.error('🚨 Ticket email failed:', e); }
    }

    if (reg.phone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
        try {
            let cleanPhone = reg.phone.replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
            const waRes = await fetch(process.env.WHATSAPP_API_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp', to: cleanPhone, type: 'template',
                    template: { name: 'ticket_confirmation', language: { code: 'en' }, components: [
                        { type: 'body', parameters: [
                            { type: 'text', text: `${firstName} ${lastName}` },
                            { type: 'text', text: categoryTitle },
                            { type: 'text', text: paymentId },
                        ] },
                    ] },
                }),
            });
            // fetch() does not throw on HTTP errors — check the status explicitly.
            waStatus = waRes.ok ? 'sent' : 'failed';
            if (!waRes.ok) console.error('🚨 Ticket WhatsApp failed:', waRes.status, await waRes.text().catch(() => ''));
        } catch (e) { waStatus = 'failed'; console.error('🚨 Ticket WhatsApp failed:', e); }
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
