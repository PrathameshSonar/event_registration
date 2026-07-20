// app/api/enquiry/route.js
//
// Server-side handler for "enquiry only" (no payment) submissions.
// Inserts via the service-role client so the public anon key never needs
// write access to the registrations table.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSubmission } from '@/lib/formFieldsServer';
import { upsertProfile } from '@/lib/profiles';
import { ageError } from '@/lib/age';
import { isRegistrationOpen } from '@/lib/registrationStatus';
import { recordConsent } from '@/lib/consent';

export const dynamic = 'force-dynamic';

const MAX_ATTENDEES = 5;

function badRequest(message) {
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { categoryId, attendeesCount, agreedToTerms, attendee, customFields } = body || {};

        if (!agreedToTerms) return badRequest('You must agree to the Terms & Conditions.');
        if (!categoryId) return badRequest('Missing category.');
        if (!attendee || typeof attendee !== 'object') return badRequest('Missing attendee details.');

        const required = ['firstName', 'lastName', 'email', 'phone', 'pincode'];
        for (const field of required) {
            if (!attendee[field] || String(attendee[field]).trim() === '') {
                return badRequest(`Missing required field: ${field}.`);
            }
        }
        if (!/^\S+@\S+\.\S+$/.test(String(attendee.email))) return badRequest('Invalid email address.');
        if (!/^\d{6}$/.test(String(attendee.pincode).trim())) return badRequest('Enter a valid 6-digit pincode.');

        // Validate admin-configured required fields + sanitize custom field answers.
        const { error: fieldErr, customFields: cleanCustom } = await validateSubmission(supabaseAdmin, categoryId, attendee, customFields);
        if (fieldErr) return badRequest(fieldErr);

        const seats = Math.min(MAX_ATTENDEES, Math.max(1, parseInt(attendeesCount, 10) || 1));

        // Confirm the category exists and accepts enquiries (enquiry-only, or a
        // payable tier that also offers "Enquire Now").
        const { data: category, error: catError } = await supabaseAdmin
            .from('categories')
            .select('id, is_enquiry_only, allow_enquiry, min_age, max_age, events(registration_open, end_at)')
            .eq('id', categoryId)
            .single();

        if (catError || !category) return badRequest('Selected category does not exist.');
        if (!isRegistrationOpen(category.events)) return badRequest('Registrations are now closed.');
        if (!category.is_enquiry_only && !category.allow_enquiry) return badRequest('This category does not accept enquiries.');
        const ageErr = ageError(category, attendee.dob);
        if (ageErr) return badRequest(ageErr);

        const profileId = await upsertProfile(supabaseAdmin, attendee);

        const fullName = `${attendee.salutation || ''} ${attendee.firstName} ${attendee.lastName}`.trim();
        const { data: enqRow, error: dbError } = await supabaseAdmin.from('registrations').insert([
            {
                category_id: category.id,
                profile_id: profileId,
                full_name: fullName,
                salutation: attendee.salutation || null,
                first_name: attendee.firstName,
                last_name: attendee.lastName,
                gotra: attendee.gotra || null,
                gender: attendee.gender || null,
                date_of_birth: attendee.dob || null,
                email: attendee.email,
                phone: attendee.phone,
                pincode: attendee.pincode || null,
                taluka: attendee.taluka || null,
                state: attendee.state || null,
                problem_samasya: attendee.problem || null,
                custom_fields: cleanCustom || {},
                attendees_count: seats,
                donation_amount: 0,
                total_amount: 0,
                payment_status: 'enquired',
            },
        ]).select('id').single();

        if (dbError) {
            console.error('Failed to persist enquiry:', dbError);
            return NextResponse.json({ error: 'Failed to submit enquiry. Please try again.' }, { status: 500 });
        }

        // Record the declaration/Samanti Patra acceptance (no-op if disabled).
        await recordConsent({ kind: 'enquiry', registrationId: enqRow?.id, name: fullName, phone: attendee.phone, email: String(attendee.email || '').toLowerCase().trim() || null, dob: attendee.dob || null, request });

        return NextResponse.json({ status: 'ok' }, { status: 200 });
    } catch (error) {
        console.error('🚨 Enquiry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
