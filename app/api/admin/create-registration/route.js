// app/api/admin/create-registration/route.js
// Admin-only: create a registration from scratch for a walk-in who never used the
// public form. Price is looked up from the DB (admin never sets it); the admin
// only chooses WHO, WHICH tier, and the payment outcome.
//   POST {
//     categoryId, attendee:{salutation,firstName,lastName,gotra,gender,dob,
//       email,phone,pincode,taluka,state,problem}, attendeesCount, donation,
//     status:'completed'|'advance_paid'|'pending', method, reference, amountPaid
//   }
// completed → ticket dispatched (offline/cash). advance_paid → amount_due set.
// pending → just recorded. Audited as registration.create.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { upsertProfile } from '@/lib/profiles';
import { ageError } from '@/lib/age';
import { dispatchTicket } from '@/lib/ticket';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const MAX_DONATION = 1_000_000;
const OFFLINE_METHODS = ['bank_transfer', 'cheque', 'cash', 'dd'];
const CREATE_STATUSES = ['completed', 'advance_paid', 'pending'];

const bad = (m) => NextResponse.json({ error: m }, { status: 400 });

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const { categoryId, attendee = {}, attendeesCount, donation, status = 'completed', method = 'cash', reference, amountPaid } = body;

    if (!categoryId) return bad('Choose a category.');
    if (!CREATE_STATUSES.includes(status)) return bad('Invalid status.');

    // Core identity validation (mirrors the public form).
    const lettersOnly = /^[\p{L}\s.'-]+$/u;
    const firstName = String(attendee.firstName || '').trim();
    const lastName = String(attendee.lastName || '').trim();
    const email = String(attendee.email || '').toLowerCase().trim();
    if (!firstName || !lastName) return bad('First and last name are required.');
    if (!lettersOnly.test(firstName) || !lettersOnly.test(lastName)) return bad('Names may contain letters only.');
    if (attendee.gotra && !lettersOnly.test(String(attendee.gotra).trim())) return bad('Gotra may contain letters only.');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return bad('Enter a valid email address.');
    const cleanPhone = String(attendee.phone || '').replace(/\s+/g, '').replace(/^(\+91|0091|91|0)/, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) return bad('Enter a valid 10-digit Indian mobile number.');
    if (!/^\d{6}$/.test(String(attendee.pincode || '').trim())) return bad('A valid 6-digit pincode is required.');
    if (attendee.dob) {
        const dob = new Date(String(attendee.dob));
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (dob > today) return bad('Date of birth cannot be in the future.');
    }

    // Authoritative category + price.
    const { data: category, error: catErr } = await supabaseAdmin
        .from('categories')
        .select('id, title, price, is_enquiry_only, max_attendees_per_reg, min_age, max_age')
        .eq('id', categoryId)
        .single();
    if (catErr || !category) return bad('Selected category does not exist.');
    if (category.is_enquiry_only) return bad('This category is enquiry-only — it has no price.');
    const ageErr = ageError(category, attendee.dob);
    if (ageErr) return bad(ageErr);

    if (status !== 'pending' && !OFFLINE_METHODS.includes(method)) return bad('Choose a payment method.');

    const seats = Math.min(20, Math.max(1, parseInt(attendeesCount, 10) || 1));
    const donationValue = Math.min(MAX_DONATION, Math.max(0, parseFloat(donation) || 0));
    const total = Number(category.price) + donationValue;

    // Money by outcome.
    let paid = 0, due = 0, plan = 'full';
    if (status === 'completed') { paid = total; due = 0; }
    else if (status === 'advance_paid') {
        paid = Math.max(0, Math.min(total, Number(amountPaid) || 0));
        if (!(paid > 0)) return bad('Enter the advance amount received.');
        if (paid >= total) return bad('Advance equals the full amount — use "Paid" instead.');
        due = total - paid; plan = 'partial';
    }

    const profileId = await upsertProfile(supabaseAdmin, { ...attendee, firstName, lastName, email, phone: cleanPhone });
    const fullName = `${attendee.salutation || ''} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
    const sanitizedProblem = String(attendee.problem || '').replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();

    const row = {
        category_id: category.id,
        profile_id: profileId,
        full_name: fullName,
        salutation: attendee.salutation || null,
        first_name: firstName,
        last_name: lastName,
        gotra: attendee.gotra || null,
        gender: attendee.gender || null,
        date_of_birth: attendee.dob || null,
        email,
        phone: cleanPhone,
        pincode: attendee.pincode || null,
        taluka: attendee.taluka || null,
        state: attendee.state || null,
        problem_samasya: sanitizedProblem || null,
        custom_fields: {},
        attendees_count: seats,
        donation_amount: donationValue,
        total_amount: total,
        amount_paid: paid,
        amount_due: due,
        payment_plan: plan,
        payment_status: status,
        payment_method: status === 'pending' ? null : method,
        offline_reference: reference || null,
        created_by_admin: true,
    };
    if (status !== 'pending') { row.verified_by = session?.role || 'admin'; row.verified_at = new Date().toISOString(); }

    const { data: inserted, error: insErr } = await supabaseAdmin.from('registrations').insert(row).select('*, categories(title)').single();
    if (insErr) {
        console.error('Manual create failed:', insErr);
        return NextResponse.json({ error: 'Could not create the registration.' }, { status: 500 });
    }

    if (status === 'completed') {
        await dispatchTicket(inserted, reference || `offline-${method}`);
    }

    await logAudit({
        session, request,
        action: 'registration.create',
        entity: 'registration', entityId: inserted.id,
        summary: `Manually added ${status === 'completed' ? 'Paid' : status === 'advance_paid' ? 'Advance-Paid' : 'Pending'} registration — ${fullName} (${cleanPhone}) · ${category.title}${status !== 'pending' ? ` · ${method} ₹${paid.toLocaleString('en-IN')}` : ''}`,
        metadata: { status, method: status === 'pending' ? null : method, total, paid, due, seats },
    });

    return NextResponse.json({ ok: true, id: inserted.id, status });
}
