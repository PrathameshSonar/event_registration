// app/api/enquiry/route.js
//
// Server-side handler for "enquiry only" (no payment) submissions.
// Inserts via the service-role client so the public anon key never needs
// write access to the registrations table.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSubmission } from '@/lib/formFieldsServer';

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

        const required = ['firstName', 'lastName', 'email', 'phone'];
        for (const field of required) {
            if (!attendee[field] || String(attendee[field]).trim() === '') {
                return badRequest(`Missing required field: ${field}.`);
            }
        }
        if (!/^\S+@\S+\.\S+$/.test(String(attendee.email))) return badRequest('Invalid email address.');

        // Validate admin-configured required fields + sanitize custom field answers.
        const { error: fieldErr, customFields: cleanCustom } = await validateSubmission(supabaseAdmin, attendee, customFields);
        if (fieldErr) return badRequest(fieldErr);

        const seats = Math.min(MAX_ATTENDEES, Math.max(1, parseInt(attendeesCount, 10) || 1));

        // Confirm the category exists and really is enquiry-only.
        const { data: category, error: catError } = await supabaseAdmin
            .from('categories')
            .select('id, is_enquiry_only')
            .eq('id', categoryId)
            .single();

        if (catError || !category) return badRequest('Selected category does not exist.');
        if (!category.is_enquiry_only) return badRequest('This category requires payment, not an enquiry.');

        const fullName = `${attendee.salutation || ''} ${attendee.firstName} ${attendee.lastName}`.trim();
        const { error: dbError } = await supabaseAdmin.from('registrations').insert([
            {
                category_id: category.id,
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
        ]);

        if (dbError) {
            console.error('Failed to persist enquiry:', dbError);
            return NextResponse.json({ error: 'Failed to submit enquiry. Please try again.' }, { status: 500 });
        }

        return NextResponse.json({ status: 'ok' }, { status: 200 });
    } catch (error) {
        console.error('🚨 Enquiry error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
