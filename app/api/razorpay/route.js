// app/api/razorpay/route.js
//
// Creates a Razorpay order AND the pending registration row server-side.
// Pricing is looked up from the database here — the client never gets to
// decide how much it pays. The browser only sends WHO is registering and
// WHICH category; the server decides the amount.
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const MAX_DONATION = 1_000_000; // ₹10,00,000 sanity cap
const MAX_ATTENDEES = 5;

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
        const { categoryId, donation, attendeesCount, agreedToTerms, attendee } = body || {};

        // 1. Basic validation
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

        const seats = Math.min(MAX_ATTENDEES, Math.max(1, parseInt(attendeesCount, 10) || 1));
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
            .select('id, title, price, is_enquiry_only, is_full, max_capacity')
            .eq('id', categoryId)
            .single();

        if (catError || !category) return badRequest('Selected category does not exist.');
        if (category.is_enquiry_only) return badRequest('This category is enquiry-only and cannot be paid for.');
        if (category.is_full) return badRequest('Registrations for this category are full.');

        // 3. Server-side capacity enforcement (prevents overselling)
        if (category.max_capacity && category.max_capacity > 0) {
            const { data: takenRows, error: takenError } = await supabaseAdmin
                .from('registrations')
                .select('attendees_count')
                .eq('category_id', category.id)
                .in('payment_status', ['completed', 'contacted', 'enquired']);

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
        const amountInPaise = Math.round(totalAmount * 100);

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

        // 6. Insert the pending registration server-side (single source of truth)
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
                email: String(attendee.email).toLowerCase().trim(),
                phone: attendee.phone,
                pincode: attendee.pincode || null,
                taluka: attendee.taluka || null,
                state: attendee.state || null,
                problem_samasya: attendee.problem || null,
                attendees_count: seats,
                donation_amount: donationValue,
                total_amount: totalAmount,
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
