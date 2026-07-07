// lib/notify.js
//
// Transactional notifications for the offline-payment flow (email + WhatsApp).
// Kept separate from lib/ticket.js (the "paid & confirmed" ticket) because these
// are status updates, not the entry ticket. All sends are best-effort (errors
// are logged, never thrown) so a notification failure can't break the flow.
import { escapeHtml } from '@/lib/escape';
import { sendEmail, emailShell as shell } from '@/lib/email';
import { sendWhatsAppText } from '@/lib/whatsapp';

const METHOD_LABEL = {
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    cash: 'Cash',
    dd: 'Demand Draft',
};

async function sendWhatsApp(reg, body) {
    if (reg.phone) await sendWhatsAppText(reg.phone, body, false);
}

// Sent when a user submits an offline payment claim — sets expectation that it's
// under manual verification.
export async function notifyOfflineSubmitted(reg) {
    const categoryTitle = reg.categories?.title || 'Registration';   // raw (for WhatsApp)
    const method = METHOD_LABEL[reg.payment_method] || 'Offline payment';
    const eName = `${escapeHtml(reg.first_name)} ${escapeHtml(reg.last_name)}`;
    const eCat = escapeHtml(categoryTitle), eRef = escapeHtml(reg.offline_reference);
    if (reg.email) {
        await sendEmail({
            to: reg.email,
            subject: '⏳ Payment received — under verification (BaglaBhairav)',
            html: shell(`
                <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${eName}</strong>,</p>
                <p style="font-size:14px;color:#6b7280;line-height:1.6;">We've received your <strong>${method}</strong> payment details for <strong>${eCat}</strong>${eRef ? ` (Ref: ${eRef})` : ''}. Our team will verify it and confirm your registration shortly. Your entry pass is issued once the payment is verified.</p>
            `),
        });
    }
    await sendWhatsApp(reg, `🙏 *BaglaBhairav* — we've received your ${method} payment details for *${categoryTitle}*${reg.offline_reference ? ` (Ref: ${reg.offline_reference})` : ''}.\n\nOur team will verify and confirm your registration shortly.`);
}

// Sent when an admin rejects an offline proof — tells the user why + to resubmit.
export async function notifyOfflineRejected(reg, reason) {
    const categoryTitle = reg.categories?.title || 'Registration';   // raw (for WhatsApp)
    const eName = `${escapeHtml(reg.first_name)} ${escapeHtml(reg.last_name)}`;
    const eCat = escapeHtml(categoryTitle), eReason = escapeHtml(reason);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    if (reg.email) {
        await sendEmail({
            to: reg.email,
            subject: '⚠️ Action needed: payment could not be verified (BaglaBhairav)',
            html: shell(`
                <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${eName}</strong>,</p>
                <p style="font-size:14px;color:#6b7280;line-height:1.6;">We couldn't verify your payment for <strong>${eCat}</strong>.</p>
                ${reason ? `<p style="font-size:14px;color:#b91c1c;line-height:1.6;"><strong>Reason:</strong> ${eReason}</p>` : ''}
                <p style="font-size:14px;color:#6b7280;line-height:1.6;">Please re-submit the correct payment details${siteUrl ? ` at <a href="${siteUrl}" style="color:#ea580c;">${siteUrl}</a>` : ''} or reply to this email.</p>
            `),
        });
    }
    await sendWhatsApp(reg, `⚠️ *BaglaBhairav* — we couldn't verify your payment for *${categoryTitle}*.${reason ? `\n\nReason: ${reason}` : ''}\n\nPlease re-submit the correct payment details.`);
}
