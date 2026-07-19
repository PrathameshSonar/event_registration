// app/api/razorpay/route.js
//
// Creates a Razorpay order AND the pending registration row server-side.
// Pricing is looked up from the database here — the client never gets to
// decide how much it pays. The browser only sends WHO is registering and
// WHICH category; the server decides the amount.
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSubmission } from '@/lib/formFieldsServer';
import { upsertProfile } from '@/lib/profiles';
import { ageError } from '@/lib/age';
import { sanitizeAttendees } from '@/lib/attendees';
import { isRegistrationOpen } from '@/lib/registrationStatus';

export const dynamic = 'force-dynamic';

const MAX_DONATION = 1_000_000; // ₹10,00,000 sanity cap
const GLOBAL_MAX_ATTENDEES = 20; // absolute ceiling regardless of category setting

function badRequest(message) {
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request) {
    try {
        // 0. Credentials present?
        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Missing Razorpay keys in server environment.');
            return NextResponse.json({ error: 'Server missing payment gateway credentials.' }, { status: 500 });
        }

        const body = await request.json();
        const { categoryId, donation, attendeesCount, agreedToTerms, attendee, attendees, customFields, paymentPlan } = body || {};

        // 1. Basic validation
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

        // Mobile: Indian 10-digit starting with 6-9
        const cleanPhone = String(attendee.phone).replace(/\s+/g, '').replace(/^(\+91|0091|91|0)/, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            return badRequest('Invalid mobile number. Enter a valid 10-digit Indian number.');
        }

        // DOB: cannot be in the future
        if (attendee.dob) {
            const dob = new Date(String(attendee.dob));
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (dob > today) return badRequest('Date of birth cannot be a future date.');
        }

        // Samasya: strip HTML tags before storing (XSS prevention)
        const sanitizedProblem = String(attendee.problem || '')
            .replace(/<[^>]*>/g, '')
            .replace(/javascript:/gi, '')
            .trim();

        const donationValue = Math.min(MAX_DONATION, Math.max(0, parseFloat(donation) || 0));

        // 1b. Rate limit: prevent duplicate pending orders for the same email+category within 3 minutes.
        // This stops spam without requiring Redis — pending orders older than 3 min are expired naturally.
        const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        const { data: recentPending } = await supabaseAdmin
            .from('registrations')
            .select('id')
            .eq('email', String(attendee.email).toLowerCase().trim())
            .eq('category_id', categoryId)
            .eq('payment_status', 'pending')
            .gte('created_at', threeMinAgo)
            .limit(1);

        if (recentPending && recentPending.length > 0) {
            return NextResponse.json(
                { error: 'A checkout is already in progress for this email and category. Please complete or wait 3 minutes before trying again.' },
                { status: 429 }
            );
        }

        // 2. Authoritative category lookup (price comes from the DB, never the client)
        const { data: category, error: catError } = await supabaseAdmin
            .from('categories')
            .select('id, title, price, is_enquiry_only, is_full, max_capacity, max_attendees_per_reg, allow_part_payment, advance_percent, min_age, max_age, events(registration_open, end_at)')
            .eq('id', categoryId)
            .single();

        if (catError || !category) return badRequest('Selected category does not exist.');
        // Master gate: registration stopped by admin, or the event has ended.
        if (!isRegistrationOpen(category.events)) return badRequest('Registrations are now closed.');
        if (category.is_enquiry_only) return badRequest('This category is enquiry-only and cannot be paid for.');
        if (category.is_full) return badRequest('Registrations for this category are full.');
        const ageErr = ageError(category, attendee.dob);
        if (ageErr) return badRequest(ageErr);

        // Clamp seats to the per-category limit set by admin (default 5, hard ceiling 20).
        const maxPerReg = Math.min(GLOBAL_MAX_ATTENDEES, category.max_attendees_per_reg || 5);
        const seats = Math.min(maxPerReg, Math.max(1, parseInt(attendeesCount, 10) || 1));

        // 3. Server-side capacity enforcement (prevents overselling)
        if (category.max_capacity && category.max_capacity > 0) {
            const { data: takenRows, error: takenError } = await supabaseAdmin
                .from('registrations')
                .select('attendees_count')
                .eq('category_id', category.id)
                // Only Paid + Partial Paid hold a seat. Open enquiries (enquired/
                // contacted/awaiting_payment) do NOT reserve capacity.
                .in('payment_status', ['completed', 'advance_paid']);

            if (takenError) {
                console.error('Capacity check failed — code:', takenError.code, '| message:', takenError.message, '| hint:', takenError.hint);
                console.error('supabaseUrl in use:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING', '| serviceKey:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING');
                return NextResponse.json({ error: 'Could not verify availability. Please try again.' }, { status: 500 });
            }
            const taken = (takenRows || []).reduce((sum, r) => sum + (r.attendees_count || 1), 0);
            const remaining = category.max_capacity - taken;
            if (remaining < seats) {
                return NextResponse.json(
                    { error: remaining <= 0 ? 'Registrations are full.' : `Only ${remaining} seat(s) left.` },
                    { status: 409 }
                );
            }
        }

        // 4. Authoritative amount
        const totalAmount = Number(category.price) + donationValue;
        if (!(totalAmount > 0)) return badRequest('Computed amount is invalid.');

        // Part payment: charge an advance now (% of PRICE only, never the donation).
        // The remaining balance (rest of price + full donation) is collected later
        // via a Razorpay Payment Link created in the webhook on advance capture.
        const isPartial = paymentPlan === 'partial' && category.allow_part_payment === true;
        const advancePct = Math.min(100, Math.max(1, Number(category.advance_percent) || 25));
        const advanceAmount = isPartial ? Math.round(Number(category.price) * advancePct / 100) : totalAmount;
        const chargeNow = isPartial ? advanceAmount : totalAmount;
        const amountInPaise = Math.round(chargeNow * 100);
        if (!(amountInPaise > 0)) return badRequest('Computed amount is invalid.');

        // 5. Create the Razorpay order
        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
        });

        // 6. Upsert the canonical user profile (keyed by phone) and link it.
        const profileId = await upsertProfile(supabaseAdmin, attendee);

        // 7. Insert the pending registration server-side (single source of truth)
        const fullName = `${attendee.salutation || ''} ${attendee.firstName} ${attendee.lastName}`.trim();
        const { error: dbError } = await supabaseAdmin.from('registrations').insert([
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
                email: String(attendee.email).toLowerCase().trim(),
                phone: attendee.phone,
                pincode: attendee.pincode || null,
                taluka: attendee.taluka || null,
                state: attendee.state || null,
                problem_samasya: sanitizedProblem || null,
                custom_fields: cleanCustom || {},
                attendees_count: seats,
                attendees: sanitizeAttendees(attendees, seats),
                donation_amount: donationValue,
                total_amount: totalAmount,
                amount_paid: 0,
                amount_due: isPartial ? (totalAmount - advanceAmount) : 0,
                payment_plan: isPartial ? 'partial' : 'full',
                razorpay_order_id: order.id,
                payment_status: 'pending',
            },
        ]);

        if (dbError) {
            console.error('Failed to persist pending registration:', dbError);
            return NextResponse.json({ error: 'Failed to initialize registration. Please try again.' }, { status: 500 });
        }

        // 7. Return only what the browser needs to open checkout
        return NextResponse.json(
            {
                orderId: order.id,
                amount: order.amount, // paise, echoed from Razorpay
                currency: order.currency,
                keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                partial: isPartial,
                advanceAmount: isPartial ? advanceAmount : null,
                balanceAmount: isPartial ? (totalAmount - advanceAmount) : 0,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('🚨 Razorpay order error:', error);
        return NextResponse.json(
            { error: error?.error?.description || error?.message || 'Failed to create order.' },
            { status: 500 }
        );
    }
}
