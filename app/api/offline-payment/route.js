// app/api/offline-payment/route.js
//
// Public submission of an OFFLINE payment (bank transfer / cheque / cash / DD).
// Creates the registration server-side at status 'payment_review' with the tier's
// authoritative price, stores the uploaded proof in the private payment-proofs
// bucket, and notifies the user it's under verification. No Razorpay order is
// created and no seat is held until an admin verifies it.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateSubmission } from '@/lib/formFieldsServer';
import { upsertProfile } from '@/lib/profiles';
import { normalizePhone } from '@/lib/phone';
import { notifyOfflineSubmitted } from '@/lib/notify';
import { ageError } from '@/lib/age';
import { sanitizeAttendees } from '@/lib/attendees';
import { isRegistrationOpen } from '@/lib/registrationStatus';
import { recordConsent } from '@/lib/consent';

export const dynamic = 'force-dynamic';

const MAX_DONATION = 1_000_000;
const MAX_ATTENDEES = 20;
const OFFLINE_METHODS = ['bank_transfer', 'cheque', 'cash', 'dd'];
const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB
const OK_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

function bad(message) { return NextResponse.json({ error: message }, { status: 400 }); }

export async function POST(request) {
    try {
        const form = await request.formData();
        const categoryId = form.get('categoryId');
        const paymentMethod = String(form.get('paymentMethod') || '');
        const offlineReference = String(form.get('offlineReference') || '').trim();
        const paymentPlan = String(form.get('paymentPlan') || 'full');
        const agreedToTerms = form.get('agreedToTerms') === 'true';
        const attendee = JSON.parse(form.get('attendee') || '{}');
        const attendeesRaw = (() => { try { return JSON.parse(form.get('attendees') || 'null'); } catch { return null; } })();
        const customFields = JSON.parse(form.get('customFields') || '{}');
        const donation = form.get('donation');
        const attendeesCount = form.get('attendeesCount');
        const proof = form.get('proof'); // File | null

        if (!agreedToTerms) return bad('You must agree to the Terms & Conditions.');
        if (!categoryId) return bad('Missing category.');
        if (!OFFLINE_METHODS.includes(paymentMethod)) return bad('Invalid payment method.');
        if (!attendee || typeof attendee !== 'object') return bad('Missing attendee details.');

        // Core fields only — everything else (incl. pincode) is decided per
        // category by validateSubmission. See the note in /api/razorpay.
        for (const f of ['firstName', 'lastName', 'email', 'phone']) {
            if (!attendee[f] || String(attendee[f]).trim() === '') return bad(`Missing required field: ${f}.`);
        }
        if (!/^\S+@\S+\.\S+$/.test(String(attendee.email))) return bad('Invalid email address.');
        const pincodeIn = String(attendee.pincode ?? '').trim();
        if (pincodeIn && !/^\d{6}$/.test(pincodeIn)) return bad('Enter a valid 6-digit pincode.');
        const cleanPhone = String(attendee.phone).replace(/\s+/g, '').replace(/^(\+91|0091|91|0)/, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) return bad('Invalid mobile number.');

        // Offline must be enabled + this method allowed (server-side; never trust client).
        const { data: settingRow } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'bank_details').single();
        const settings = settingRow?.value || {};
        if (!settings.offline_enabled) return bad('Offline payment is currently unavailable.');
        const allowed = Array.isArray(settings.methods) ? settings.methods : OFFLINE_METHODS;
        if (!allowed.includes(paymentMethod)) return bad('This payment method is not available.');

        // Reference + proof requirements: strict for transfer/cheque, optional for cash.
        if ((paymentMethod === 'bank_transfer' || paymentMethod === 'cheque') && !offlineReference) {
            return bad(paymentMethod === 'cheque' ? 'Cheque number is required.' : 'Transaction/UTR reference is required.');
        }

        const { error: fieldErr, customFields: cleanCustom } = await validateSubmission(supabaseAdmin, categoryId, attendee, customFields);
        if (fieldErr) return bad(fieldErr);

        const sanitizedProblem = String(attendee.problem || '').replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
        const donationValue = Math.min(MAX_DONATION, Math.max(0, parseFloat(donation) || 0));

        const { data: category, error: catError } = await supabaseAdmin
            .from('categories')
            .select('id, title, price, is_enquiry_only, is_full, max_attendees_per_reg, min_age, max_age, allow_part_payment, advance_percent, events(registration_open, end_at)')
            .eq('id', categoryId)
            .single();
        if (catError || !category) return bad('Selected category does not exist.');
        if (!isRegistrationOpen(category.events)) return bad('Registrations are now closed.');
        if (category.is_enquiry_only) return bad('This category is enquiry-only.');
        if (category.is_full) return bad('Registrations for this category are full.');
        const ageErr = ageError(category, attendee.dob);
        if (ageErr) return bad(ageErr);

        // Part payment: the advance is a % of the tier PRICE only. A part payment
        // NEVER carries a donation (it could only sit unpaid in the balance) —
        // part-payers are pointed at /donate instead. Enforced server-side.
        const isPartial = paymentPlan === 'partial' && category.allow_part_payment === true && Number(category.price) > 0;
        const effectiveDonation = isPartial ? 0 : donationValue;
        const advancePct = Math.min(100, Math.max(1, Number(category.advance_percent) || 25));
        const advanceAmount = isPartial ? Math.round(Number(category.price) * (advancePct / 100)) : 0;

        const totalAmount = Number(category.price) + effectiveDonation;
        if (!(totalAmount > 0)) return bad('This tier has no price set; offline payment is unavailable.');

        const maxPerReg = Math.min(MAX_ATTENDEES, category.max_attendees_per_reg || 5);
        const seats = Math.min(maxPerReg, Math.max(1, parseInt(attendeesCount, 10) || 1));

        // Validate the proof file (if provided).
        let ext = null;
        if (proof && typeof proof === 'object' && proof.size) {
            if (proof.size > MAX_PROOF_BYTES) return bad('Proof file too large (max 5 MB).');
            if (!OK_MIME.includes(proof.type)) return bad('Proof must be an image or PDF.');
            ext = proof.type === 'application/pdf' ? 'pdf' : (proof.type.split('/')[1] || 'jpg');
        } else if (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque') {
            return bad('Please attach a payment screenshot/photo.');
        }

        const profileId = await upsertProfile(supabaseAdmin, attendee);
        const fullName = `${attendee.salutation || ''} ${attendee.firstName} ${attendee.lastName}`.trim();

        const { data: inserted, error: dbError } = await supabaseAdmin.from('registrations').insert([{
            category_id: category.id, profile_id: profileId, full_name: fullName,
            salutation: attendee.salutation || null, first_name: attendee.firstName, last_name: attendee.lastName,
            gotra: attendee.gotra || null, gender: attendee.gender || null, date_of_birth: attendee.dob || null,
            email: String(attendee.email).toLowerCase().trim(),
            // Stored E.164 to match profiles.phone -- one identity per person.
            phone: normalizePhone(attendee.phone) || attendee.phone,
            pincode: attendee.pincode || null, taluka: attendee.taluka || null, state: attendee.state || null,
            problem_samasya: sanitizedProblem || null, custom_fields: cleanCustom || {},
            attendees_count: seats, attendees: sanitizeAttendees(attendeesRaw, seats),
            donation_amount: effectiveDonation, total_amount: totalAmount,
            amount_paid: 0,
            amount_due: isPartial ? (totalAmount - advanceAmount) : totalAmount,
            payment_plan: isPartial ? 'partial' : 'full',
            payment_method: paymentMethod, offline_reference: offlineReference || null,
            payment_status: 'payment_review',
        }]).select('id').single();

        if (dbError || !inserted) {
            console.error('Offline registration insert failed:', dbError);
            return NextResponse.json({ error: 'Could not submit. Please try again.' }, { status: 500 });
        }

        // Upload the proof under the registration id, then link it.
        let proofPath = null;
        if (ext) {
            const buf = Buffer.from(await proof.arrayBuffer());
            proofPath = `${inserted.id}.${ext}`;
            const { error: upErr } = await supabaseAdmin.storage
                .from('payment-proofs')
                .upload(proofPath, buf, { contentType: proof.type, upsert: true });
            if (upErr) { console.warn('Proof upload failed:', upErr.message); proofPath = null; }
            else await supabaseAdmin.from('registrations').update({ offline_proof_path: proofPath }).eq('id', inserted.id);
        }

        // Record the declaration/Samanti Patra acceptance (no-op if disabled).
        await recordConsent({ kind: 'registration', registrationId: inserted.id, name: fullName, phone: attendee.phone, email: String(attendee.email).toLowerCase().trim(), dob: attendee.dob || null, request });

        notifyOfflineSubmitted({
            first_name: attendee.firstName, last_name: attendee.lastName,
            email: attendee.email, phone: attendee.phone,
            payment_method: paymentMethod, offline_reference: offlineReference,
            categories: { title: category.title },
        });

        return NextResponse.json({ status: 'ok', id: inserted.id }, { status: 200 });
    } catch (error) {
        console.error('🚨 Offline payment error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
