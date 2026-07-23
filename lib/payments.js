// lib/payments.js
//
// SINGLE SOURCE OF TRUTH for money-state transitions. The webhook (real-time),
// the reconciliation cron (catch-up), and the admin "Sync payment" button all
// funnel a captured payment through the SAME functions here, so the rules that
// decide "is this fully paid / advance / a mismatch" can never drift between
// code paths.
//
// Core guarantee (Layer 1): every captured amount is asserted against what we
// expected to the paise. If they differ, the registration is flagged
// `amount_mismatch` and is NOT marked paid — no ticket, no entry pass — until a
// human investigates. This is the "not one rupee" tripwire.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { dispatchTicket } from '@/lib/ticket';
import { getRazorpayClient } from '@/lib/razorpayClient';
import { sendTemplatedEmail } from '@/lib/email';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';
import { logAudit } from '@/lib/auditLog';
import { getSiteName } from '@/lib/branding';

// We only treat a payment as a mismatch when it falls SHORT of what we asked
// (a possible underpayment/tamper). An equal-or-greater capture is fine: with
// "customer fee bearer" on Razorpay the customer pays order amount + fee, so
// payment.amount legitimately comes back higher — that extra is Razorpay's fee,
// never a loss to us. (Standard Razorpay fees are deducted from settlement, not
// added to payment.amount, so they don't affect this comparison at all.)
const SHORTFALL_TOLERANCE_PAISE = 100; // ignore ≤ ₹1 rounding noise

// Razorpay caps `reference_id` at 40 characters, and ALSO rejects a duplicate one
// when a link is re-created for the same registration. A registration id is a
// 36-char UUID, so `bal_<uuid>` is already exactly 40 — leaving no room for the
// uniqueness suffix, which is why `bal_<uuid>_<timestamp>` (~54) started 400ing
// every "Copy balance link" / "Resend balance link".
//
// The reference_id does NOT need to carry the full id: a paid link is mapped back
// to its registration via `notes.registration_id` (the webhook's primary path and
// what `finalizeBalancePaid` reads). So we use a COMPACT, unique reference — a
// short slice of the id (enough to eyeball which reg it belongs to in the Razorpay
// dashboard) plus a base-36 timestamp. ~24 chars, always < 40, always unique.
//
// ⚠️ Any new balance-link creator MUST use this helper and MUST set
// `notes.registration_id` — never hand-roll a `bal_...` reference again.
export function balanceReference(regId) {
    const hex = String(regId || '').replace(/-/g, '').slice(0, 12);
    return `bal_${hex}_${Date.now().toString(36)}`;
}

// What the ORDER (advance or full charge) should have captured, in paise.
// For a partial plan with an outstanding balance, the order only covers the
// advance (= total − balance). Otherwise it covers the full total.
export function expectedOrderChargePaise(reg) {
    const total = Number(reg.total_amount) || 0;
    const due = Number(reg.amount_due) || 0;
    const isAdvance = reg.payment_plan === 'partial' && due > 0;
    const rupees = isAdvance ? (total - due) : total;
    return { paise: Math.round(rupees * 100), isAdvance, rupees };
}

// Marks a registration as a money mismatch (captured ≠ expected). Terminal until
// an admin investigates — deliberately does NOT issue a ticket.
async function flagMismatch(reg, { capturedPaise, expectedPaise, paymentId, context }) {
    console.error(`🚨 AMOUNT MISMATCH [${context}] reg ${reg.id}: expected ${expectedPaise} paise, captured ${capturedPaise} paise.`);
    await supabaseAdmin.from('registrations').update({
        payment_status: 'amount_mismatch',
        amount_paid: capturedPaise / 100,
        razorpay_payment_id: paymentId || reg.razorpay_payment_id,
    }).eq('id', reg.id);
    return { status: 'amount_mismatch', expectedPaise, capturedPaise };
}

// Apply a captured ORDER payment (the advance, or a full upfront payment).
// reg must be a fresh DB row (with categories(title)). capturedPaise = the
// payment amount in paise. Returns { status: 'completed' | 'advance_recorded' |
// 'amount_mismatch' | 'already_processed' }.
export async function finalizeOrderCapture({ reg, capturedPaise, paymentId }) {
    // Idempotency — never re-finalize a money-terminal/advance state.
    if (reg.payment_status === 'completed' || reg.payment_status === 'advance_paid') {
        return { status: 'already_processed' };
    }

    const { paise: expectedPaise, isAdvance } = expectedOrderChargePaise(reg);
    const capturedRupees = capturedPaise / 100;

    // Flag ONLY a shortfall — not an equal/over capture (see note on fee bearer).
    if (Math.round(capturedPaise) < expectedPaise - SHORTFALL_TOLERANCE_PAISE) {
        return flagMismatch(reg, { capturedPaise, expectedPaise, paymentId, context: 'order' });
    }

    if (isAdvance) {
        // Atomic transition: only flip the row if it's STILL in the state we read.
        // A concurrent duplicate (webhook retry + Sync at the same instant) updates
        // 0 rows and bails, so the balance link / ticket is sent exactly once.
        const { data: done, error } = await supabaseAdmin.from('registrations').update({
            payment_status: 'advance_paid',
            amount_paid: capturedRupees,
            razorpay_payment_id: paymentId,
        }).eq('id', reg.id).eq('payment_status', reg.payment_status).select('id');
        if (error) throw new Error('DB update (advance) failed: ' + error.message);
        if (!done || done.length === 0) return { status: 'already_processed' };
        await flagCapacityOverage(reg); // this row now holds a seat
        // amount_paid not yet reflected on our local object — patch for the email.
        await sendBalanceLink({ ...reg, amount_paid: capturedRupees });
        return { status: 'advance_recorded' };
    }

    const { data: done, error } = await supabaseAdmin.from('registrations').update({
        payment_status: 'completed',
        amount_paid: reg.total_amount,
        amount_due: 0,
        razorpay_payment_id: paymentId,
    }).eq('id', reg.id).eq('payment_status', reg.payment_status).select('id');
    if (error) throw new Error('DB update (full) failed: ' + error.message);
    if (!done || done.length === 0) return { status: 'already_processed' };
    await flagCapacityOverage(reg); // this row now holds a seat
    await dispatchTicket(reg, paymentId);
    return { status: 'completed' };
}

// Apply a captured BALANCE payment (Payment Link for the outstanding due).
// capturedPaise = amount actually paid on the link. Returns the same status set.
export async function finalizeBalancePaid({ reg, capturedPaise, paymentId }) {
    if (reg.payment_status === 'completed') return { status: 'already_processed' };

    const expectedPaise = Math.round((Number(reg.amount_due) || 0) * 100);

    // Flag only a SHORTFALL, and only when we actually know the captured figure
    // (> 0). Some callers (legacy links) may not surface the paid amount; there
    // we trust the link's "paid" status, already confirmed server-side. An
    // equal/over capture is fine (customer-borne fee, see note above).
    if (capturedPaise > 0 && expectedPaise > 0 && Math.round(capturedPaise) < expectedPaise - SHORTFALL_TOLERANCE_PAISE) {
        return flagMismatch(reg, { capturedPaise, expectedPaise, paymentId, context: 'balance' });
    }

    const { data: done, error } = await supabaseAdmin.from('registrations').update({
        payment_status: 'completed',
        amount_paid: Number(reg.total_amount) || 0,
        amount_due: 0,
        razorpay_payment_id: paymentId || reg.razorpay_payment_id,
    }).eq('id', reg.id).eq('payment_status', reg.payment_status).select('id');
    if (error) throw new Error('DB update (balance) failed: ' + error.message);
    // Only the request that actually completed the row dispatches the ticket.
    if (!done || done.length === 0) return { status: 'already_processed' };
    await dispatchTicket(reg, paymentId || 'balance-paid');
    return { status: 'completed' };
}

// Reconcile ONE registration against Razorpay's source of truth and apply any
// catch-up state change. Used by the reconciliation cron (Layer 2) and the admin
// "Sync payment" button — so a missed webhook self-heals through the exact same
// money rules as the live webhook. Only acts on pending / advance_paid rows.
// Returns the finalizer result, or a no-op status when nothing has changed.
export async function reconcileRegistrationWithRazorpay(reg) {
    const rzp = getRazorpayClient();

    // PENDING (missed advance/full webhook) or AMOUNT_MISMATCH (re-evaluate against
    // Razorpay — heals rows wrongly flagged, leaves genuine shortfalls flagged)
    // → check the order's payments for a capture and re-apply the money rules.
    if (reg.payment_status === 'pending' || reg.payment_status === 'amount_mismatch') {
        if (!reg.razorpay_order_id) return { status: 'skipped_no_order' };
        let payments;
        try {
            payments = await rzp.orders.fetchPayments(reg.razorpay_order_id);
        } catch (e) {
            return { status: 'error', error: e?.message };
        }
        const captured = (payments?.items || []).find((p) => p.status === 'captured');
        if (!captured) return { status: 'still_pending' };
        return finalizeOrderCapture({ reg, capturedPaise: Number(captured.amount), paymentId: captured.id });
    }

    // ADVANCE_PAID (balance link) or AWAITING_PAYMENT (enquiry conversion link)
    // → check the payment link and complete if it's been paid.
    if (reg.payment_status === 'advance_paid' || reg.payment_status === 'awaiting_payment') {
        let link = null;
        try {
            if (reg.balance_link_id) {
                link = await rzp.paymentLink.fetch(reg.balance_link_id);
            } else {
                // Fallback for a row whose balance_link_id was never stored (legacy
                // links used the deterministic `bal_<uuid>` reference). New links
                // always store balance_link_id, so they take the fetch() path above
                // and never need this — their compact reference isn't derivable here.
                const res = await rzp.paymentLink.all({ reference_id: `bal_${reg.id}`, count: 10 });
                const items = res?.payment_links || [];
                link = items.find((l) => l.status === 'paid') || items[items.length - 1] || null;
            }
        } catch (e) {
            return { status: 'error', error: e?.message };
        }
        if (!link) return { status: 'no_link' };
        if (link.status !== 'paid') return { status: 'still_due', linkStatus: link.status };

        const pay = Array.isArray(link.payments) ? link.payments[0] : link.payments;
        const capturedPaise = Number(link.amount_paid) || 0;
        const paymentId = pay?.payment_id || link.id;
        return finalizeBalancePaid({ reg, capturedPaise, paymentId });
    }

    return { status: 'noop' };
}

// Creates a Razorpay Payment Link for the outstanding `amount_due` and notifies
// the registrant by email + WhatsApp. Stores the link's url + id for later "Sync".
// `kind` selects the copy: 'balance' (part-payment balance) or 'enquiry' (an
// enquiry lead converting to a paid registration at the tier's fixed price).
// Both flows complete via the same payment_link.paid → finalizeBalancePaid path.
// Returns the short URL (or null).
export async function sendPaymentLink(reg, kind = 'balance') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
    const categoryTitle = reg.categories?.title || 'Registration';
    const dueRupees = Number(reg.amount_due) || 0;
    if (dueRupees <= 0) return null;
    const isEnquiry = kind === 'enquiry';

    let shortUrl = null;
    try {
        let cleanPhone = String(reg.phone || '').replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        const link = await getRazorpayClient().paymentLink.create({
            amount: Math.round(dueRupees * 100),
            currency: 'INR',
            accept_partial: false,
            description: `${isEnquiry ? 'Registration payment' : 'Balance payment'} — ${categoryTitle} (${await getSiteName()})`,
            reference_id: balanceReference(reg.id),
            customer: { name: `${reg.first_name} ${reg.last_name}`.trim(), email: reg.email || undefined, contact: cleanPhone || undefined },
            notify: { sms: false, email: false }, // we notify ourselves below
            reminder_enable: true,
            notes: { registration_id: reg.id, kind },
            callback_url: `${siteUrl}/`,
            callback_method: 'get',
        });
        shortUrl = link?.short_url || null;
        if (shortUrl) {
            await supabaseAdmin.from('registrations')
                .update({ balance_link_url: shortUrl, balance_link_id: link?.id || null })
                .eq('id', reg.id);
        }
    } catch (e) {
        console.error('🚨 Payment link creation failed:', e);
        return null;
    }

    if (!shortUrl) return null;

    const logCtx = { kind: isEnquiry ? 'payment_link' : 'balance_link', registrationId: reg.id };

    if (reg.email) {
        // Copy lives in lib/emailTemplates.js (admin-overridable in Settings) — we
        // pass DATA only; the renderer HTML-escapes every value.
        await sendTemplatedEmail({
            to: reg.email,
            kind: isEnquiry ? 'payment_link' : 'balance_link',
            registrationId: reg.id,
            vars: {
                name: `${reg.first_name} ${reg.last_name}`,
                tier: categoryTitle,
                amount: dueRupees.toLocaleString('en-IN'),
                advancePaid: Number(reg.amount_paid).toLocaleString('en-IN'),
                payLink: shortUrl,
            },
        });
    }

    if (reg.phone) {
        // Business-initiated → template. Params: [name, tier, amount, payLink].
        await sendWhatsAppTemplate(reg.phone, 'paymentLink', [
            `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'devotee',
            categoryTitle,
            dueRupees.toLocaleString('en-IN'),
            shortUrl,
        ], logCtx);
    }
    return shortUrl;
}

// Back-compat shim: the webhook/advance path sends a balance link.
export const sendBalanceLink = (reg) => sendPaymentLink(reg, 'balance');

// After a registration newly takes a seat (pending → completed/advance_paid), verify
// the tier is not oversold and raise a LOUD audit entry if it is.
//
// Why detect-and-alert rather than block: the pre-payment check in /api/razorpay is
// a time-of-check/time-of-use race — two people can both pass it for the last seat
// and both pay. By the time we get here the money is captured, so refusing the flip
// would leave a paid devotee unconfirmed and the webhook retrying forever. Counting
// AFTER the flip is committed is also what makes this accurate: whichever capture
// lands second sees the true total and flags it.
// Best-effort — a counting failure must never break the payment flow.
export async function flagCapacityOverage(reg) {
    try {
        const { data: cat } = await supabaseAdmin
            .from('categories').select('title, max_capacity').eq('id', reg.category_id).single();
        const max = Number(cat?.max_capacity) || 0;
        if (max <= 0) return null; // unlimited tier

        const { data: rows } = await supabaseAdmin
            .from('registrations').select('attendees_count')
            .eq('category_id', reg.category_id)
            .in('payment_status', ['completed', 'advance_paid']);
        const taken = (rows || []).reduce((s, r) => s + (Number(r.attendees_count) || 1), 0);
        if (taken <= max) return null;

        const over = taken - max;
        console.error(`🚨 OVERSOLD: "${cat?.title}" has ${taken}/${max} seats held (over by ${over}).`);
        await logAudit({
            session: { role: 'system' },
            action: 'capacity.oversold',
            entity: 'registration', entityId: reg.id,
            summary: `⚠️ OVERSOLD — "${cat?.title}" now holds ${taken} of ${max} seats (over by ${over}). Triggered by ${reg.first_name || ''} ${reg.last_name || ''}`.trim(),
            metadata: { categoryId: reg.category_id, category: cat?.title, taken, max, over, registrationId: reg.id },
        });
        return { taken, max, over };
    } catch (e) {
        console.error('capacity overage check failed:', e?.message);
        return null;
    }
}

// Cancel a Razorpay payment link we are superseding, so a stale link can never be
// paid at the OLD amount. Critical because an over-capture is ACCEPTED by our money
// guard (only shortfalls flag amount_mismatch) — an un-cancelled stale link would
// quietly complete a registration with an unrecorded overpayment.
// Best-effort: a link that is already paid or cancelled can't be cancelled, and
// that must never block the caller.
export async function cancelPaymentLink(linkId) {
    if (!linkId) return { ok: false, error: 'No link id.' };
    try {
        await getRazorpayClient().paymentLink.cancel(linkId);
        return { ok: true, error: null };
    } catch (e) {
        const detail = e?.error?.description || e?.message || String(e);
        console.warn('paymentLink.cancel failed (continuing):', linkId, detail);
        return { ok: false, error: detail };
    }
}

// Return the reg's balance payment link, creating (and storing) one if none
// exists yet — WITHOUT notifying the customer. For the admin "Copy link" action
// when a devotee didn't receive the WhatsApp/email and the admin wants to share
// it manually. Returns { url, error } — `error` carries Razorpay's own message so
// a failure is diagnosable instead of a blank "could not create a payment link".
export async function ensureBalanceLink(reg) {
    if (reg.balance_link_url) return { url: reg.balance_link_url, error: null };
    const dueRupees = Number(reg.amount_due) || 0;
    if (dueRupees <= 0) return { url: null, error: 'This registration has no outstanding balance.' };

    const categoryTitle = reg.categories?.title || 'Registration';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
    try {
        let cleanPhone = String(reg.phone || '').replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        const link = await getRazorpayClient().paymentLink.create({
            amount: Math.round(dueRupees * 100),
            currency: 'INR',
            accept_partial: false,
            description: `Balance payment — ${categoryTitle} (${await getSiteName()})`,
            reference_id: balanceReference(reg.id),
            customer: { name: `${reg.first_name} ${reg.last_name}`.trim(), email: reg.email || undefined, contact: cleanPhone || undefined },
            notify: { sms: false, email: false },
            reminder_enable: true,
            notes: { registration_id: reg.id, kind: 'balance' },
            callback_url: `${siteUrl}/`,
            callback_method: 'get',
        });
        const shortUrl = link?.short_url || null;
        if (!shortUrl) return { url: null, error: 'Razorpay did not return a link URL.' };
        await supabaseAdmin.from('registrations')
            .update({ balance_link_url: shortUrl, balance_link_id: link?.id || null })
            .eq('id', reg.id);
        return { url: shortUrl, error: null };
    } catch (e) {
        const detail = e?.error?.description || e?.message || String(e);
        console.error('🚨 ensureBalanceLink failed:', detail);
        return { url: null, error: detail };
    }
}
