// app/api/general-enquiry/route.js
//
// A GENERAL enquiry from the homepage — not tied to any Seva/tier. Its whole
// purpose is to collect interest BEFORE any Seva exists or is live, so it is
// deliberately NOT gated by `isRegistrationOpen` or by a category. It is gated
// only by the `general_enquiry.enabled` setting (checked server-side, so a
// crafted request can't create leads while the feature is switched off).
//
// The lead is stored as a category-less `enquired` registration, so it flows into
// the existing Enquiries pipeline (New → Contacted → notes → Close). Everything in
// that pipeline is already null-category-safe.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertProfile } from '@/lib/profiles';
import { normalizePhone } from '@/lib/phone';
import { withDefaults } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';

const bad = (m) => NextResponse.json({ error: m }, { status: 400 });
const clean = (s, max) => String(s || '').replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim().slice(0, max);

export async function POST(request) {
    try {
        // Feature must be on. Read straight from the row (not the cached reader) so
        // a just-flipped toggle is honoured immediately on the write path.
        const { data: setRow } = await supabaseAdmin
            .from('app_settings').select('value').eq('key', 'general_enquiry').single();
        const cfg = withDefaults('general_enquiry', setRow?.value);
        if (!cfg.enabled) return bad('Enquiries are not being accepted right now.');

        const body = await request.json().catch(() => ({}));
        const { firstName, lastName, phone, email, message, agreedToTerms } = body || {};

        if (!agreedToTerms) return bad('You must agree to the Terms & Conditions.');
        const fn = clean(firstName, 80);
        const ln = clean(lastName, 80);
        if (!fn || !ln) return bad('Enter your first and last name.');

        const cleanPhone = String(phone || '').replace(/\s+/g, '').replace(/^(\+91|0091|91|0)/, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) return bad('Enter a valid 10-digit Indian mobile number.');

        const cleanEmail = String(email || '').toLowerCase().trim();
        if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return bad('Enter a valid email address.');

        const msg = clean(message, 1000);

        // Light idempotency: the same phone already has an OPEN general enquiry in
        // the last 10 minutes → treat a re-submit as success (double-tap / retry),
        // rather than piling duplicate leads into the pipeline.
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: recent } = await supabaseAdmin
            .from('registrations')
            .select('id')
            .is('category_id', null)
            .eq('phone', normalizePhone(cleanPhone) || cleanPhone)
            .eq('payment_status', 'enquired')
            .gte('created_at', tenMinAgo)
            .limit(1);
        if (recent && recent.length) return NextResponse.json({ status: 'ok', already: true });

        const attendee = { firstName: fn, lastName: ln, phone: cleanPhone, email: cleanEmail };
        const profileId = await upsertProfile(supabaseAdmin, attendee);

        const { error } = await supabaseAdmin.from('registrations').insert([{
            category_id: null,
            profile_id: profileId,
            full_name: `${fn} ${ln}`.trim(),
            first_name: fn,
            last_name: ln,
            email: cleanEmail,
            phone: normalizePhone(cleanPhone) || cleanPhone,
            problem_samasya: msg || null,
            custom_fields: {},
            attendees_count: 1,
            donation_amount: 0,
            total_amount: 0,
            payment_status: 'enquired',
        }]);

        if (error) {
            console.error('General enquiry insert failed:', error.message);
            return NextResponse.json({ error: 'Could not submit your enquiry. Please try again.' }, { status: 500 });
        }

        return NextResponse.json({ status: 'ok' }, { status: 200 });
    } catch (e) {
        console.error('🚨 General enquiry error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
