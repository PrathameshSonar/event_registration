// lib/messageLog.js
//
// SERVER-ONLY delivery log for every outbound transactional message (email +
// WhatsApp). Like lib/auditLog.js this is deliberately FIRE-AND-FORGET: a logging
// failure must never break — or change the return value of — the send it is
// recording. All errors are swallowed to the console.
//
// This is called from inside lib/email.js and lib/whatsapp.js rather than at each
// call site, so the log is complete BY CONSTRUCTION: a new send site is recorded
// automatically, and can never silently skip the log by forgetting to call this.
//
// The rendered payload (subject/body for email; template + params, text, or image
// for WhatsApp) is stored so a failed message can be RE-SENT verbatim from the
// admin panel without having to re-derive it from the original business context.
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// The kind catalog lives in lib/messageKinds.js so CLIENT components can import it
// without dragging supabaseAdmin (and the service-role key) into the browser bundle.
export { MESSAGE_KINDS } from '@/lib/messageKinds';

/**
 * Record one send attempt. Never throws.
 *
 * @param {object}  m
 * @param {'email'|'whatsapp'} m.channel
 * @param {string}  m.recipient         email address or phone
 * @param {boolean} m.ok                did the send succeed?
 * @param {string} [m.kind]             a MESSAGE_KINDS key
 * @param {string} [m.registrationId]   links the message to a person's timeline
 * @param {string} [m.subject]          email subject
 * @param {string} [m.body]             rendered HTML (email) or text (WhatsApp)
 * @param {string} [m.template]         WhatsApp template name
 * @param {any[]}  [m.templateParams]   WhatsApp template body params
 * @param {string} [m.imageUrl]         WhatsApp image link
 * @param {string} [m.error]            failure reason
 * @param {object} [m.metadata]
 */
export async function logMessage({
    channel,
    recipient,
    ok,
    kind = null,
    registrationId = null,
    subject = null,
    body = null,
    template = null,
    templateParams = null,
    imageUrl = null,
    error = null,
    metadata = null,
}) {
    try {
        if (!channel || !recipient) return;
        await supabaseAdmin.from('message_log').insert([{
            channel,
            kind,
            recipient: String(recipient),
            subject,
            body,
            template,
            template_params: templateParams,
            image_url: imageUrl,
            status: ok ? 'sent' : 'failed',
            error: ok ? null : (error || 'Send failed'),
            registration_id: registrationId,
            metadata,
        }]);
    } catch (e) {
        console.error('message log failed:', e?.message);
    }
}
