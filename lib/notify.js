// lib/notify.js
//
// Transactional notifications for the offline-payment flow (email + WhatsApp).
// Kept separate from lib/ticket.js (the "paid & confirmed" ticket) because these
// are status updates, not the entry ticket. All sends are best-effort (errors
// are logged, never thrown) so a notification failure can't break the flow.
import { sendTemplatedEmail } from '@/lib/email';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { getSiteName } from '@/lib/branding';

const METHOD_LABEL = {
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    cash: 'Cash',
    dd: 'Demand Draft',
};

async function sendWhatsApp(reg, body, kind) {
    if (reg.phone) await sendWhatsAppText(reg.phone, body, false, { kind, registrationId: reg.id });
}

// Sent when a user submits an offline payment claim — sets expectation that it's
// under manual verification.
export async function notifyOfflineSubmitted(reg) {
    const categoryTitle = reg.categories?.title || 'Registration';   // raw (for WhatsApp)
    const method = METHOD_LABEL[reg.payment_method] || 'Offline payment';
    if (reg.email) {
        await sendTemplatedEmail({
            to: reg.email,
            kind: 'offline_submitted',
            registrationId: reg.id,
            vars: {
                name: `${reg.first_name} ${reg.last_name}`,
                tier: categoryTitle,
                method,
                reference: reg.offline_reference || '',
            },
        });
    }
    await sendWhatsApp(reg, `🙏 *${await getSiteName()}* — we've received your ${method} payment details for *${categoryTitle}*${reg.offline_reference ? ` (Ref: ${reg.offline_reference})` : ''}.\n\nOur team will verify and confirm your registration shortly.`, 'offline_submitted');
}

// Sent when an admin cancels a registration. Cancelling never refunds, so the
// copy must not imply money is coming back — if a refund is owed it's issued
// separately via the Refund action, which sends its own Razorpay notification.
// `hadPaid` tells us whether to mention the payment at all (a cancelled *pending*
// checkout never paid anything, so the no-refund line would just be confusing).
export async function notifyCancelled(reg, reason, hadPaid) {
    const categoryTitle = reg.categories?.title || 'Registration';   // raw (for WhatsApp)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    if (reg.email) {
        await sendTemplatedEmail({
            to: reg.email,
            kind: 'cancellation',
            registrationId: reg.id,
            vars: {
                name: `${reg.first_name} ${reg.last_name}`,
                tier: categoryTitle,
                reason,
                hadPaid,
                refundPolicyUrl: `${siteUrl}/refund`,
            },
        });
    }
    await sendWhatsApp(reg, `🙏 *${await getSiteName()}* — your registration for *${categoryTitle}* has been cancelled.${reason ? `\n\nReason: ${reason}` : ''}${hadPaid ? '\n\nAs per our no-refund policy, no refund is issued on cancellation.' : ''}\n\nIf you believe this is a mistake, please contact us.`, 'cancellation');
}

// Sent when an admin rejects an offline proof — tells the user why + to resubmit.
export async function notifyOfflineRejected(reg, reason) {
    const categoryTitle = reg.categories?.title || 'Registration';   // raw (for WhatsApp)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    if (reg.email) {
        await sendTemplatedEmail({
            to: reg.email,
            kind: 'offline_rejected',
            registrationId: reg.id,
            vars: {
                name: `${reg.first_name} ${reg.last_name}`,
                tier: categoryTitle,
                reason,
                siteUrl,
            },
        });
    }
    await sendWhatsApp(reg, `⚠️ *${await getSiteName()}* — we couldn't verify your payment for *${categoryTitle}*.${reason ? `\n\nReason: ${reason}` : ''}\n\nPlease re-submit the correct payment details.`, 'offline_rejected');
}
