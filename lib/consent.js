// lib/consent.js
// Records a consent (Samanti Patra) acceptance server-side whenever the declaration
// is enabled. Called from the registration / donation / enquiry creation routes,
// AFTER the row is inserted, so we have the person's details to attach. Best-effort:
// a consent-log failure must never fail the actual registration/donation.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withDefaults } from '@/lib/appSettings';

function firstNonEmpty(obj) {
    if (!obj) return '';
    return obj.en || obj.hi || obj.mr || Object.values(obj).find(Boolean) || '';
}

export function clientIp(request) {
    try {
        const fwd = request?.headers?.get('x-forwarded-for');
        return (fwd ? fwd.split(',')[0].trim() : request?.headers?.get('x-real-ip')) || null;
    } catch { return null; }
}

/**
 * @param {object} p
 * @param {'registration'|'donation'|'enquiry'} p.kind
 * @param {string|null} [p.registrationId]
 * @param {string|null} [p.donationId]
 * @param {string} [p.name] @param {string} [p.phone] @param {string} [p.email]
 * @param {Request} [p.request]  used only to derive the IP
 */
export async function recordConsent({ kind, registrationId = null, donationId = null, name = null, phone = null, email = null, dob = null, request = null }) {
    try {
        const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'declaration').single();
        const decl = withDefaults('declaration', data?.value);
        if (!decl?.enabled) return; // no declaration in effect → nothing to record

        await supabaseAdmin.from('consents').insert({
            kind,
            registration_id: registrationId,
            donation_id: donationId,
            name, phone, email, dob,
            declaration_title: firstNonEmpty(decl.title) || 'Declaration',
            declaration_body: firstNonEmpty(decl.body),
            ip: clientIp(request),
        });
    } catch (e) {
        console.error('consent record failed:', e?.message);
    }
}
