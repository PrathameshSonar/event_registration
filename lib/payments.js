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
import { Resend } from 'resend';
import { dispatchTicket } from '@/lib/ticket';
import { getRazorpayClient } from '@/lib/razorpayClient';

let _resend = null;
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
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

    if (Math.round(capturedPaise) !== expectedPaise) {
        return flagMismatch(reg, { capturedPaise, expectedPaise, paymentId, context: 'order' });
    }

    if (isAdvance) {
        const { error } = await supabaseAdmin.from('registrations').update({
            payment_status: 'advance_paid',
            amount_paid: capturedRupees,
            razorpay_payment_id: paymentId,
        }).eq('id', reg.id);
        if (error) throw new Error('DB update (advance) failed: ' + error.message);
        // amount_paid not yet reflected on our local object — patch for the email.
        await sendBalanceLink({ ...reg, amount_paid: capturedRupees });
        return { status: 'advance_recorded' };
    }

    const { error } = await supabaseAdmin.from('registrations').update({
        payment_status: 'completed',
        amount_paid: capturedRupees,
        amount_due: 0,
        razorpay_payment_id: paymentId,
    }).eq('id', reg.id);
    if (error) throw new Error('DB update (full) failed: ' + error.message);
    await dispatchTicket(reg, paymentId);
    return { status: 'completed' };
}

// Apply a captured BALANCE payment (Payment Link for the outstanding due).
// capturedPaise = amount actually paid on the link. Returns the same status set.
export async function finalizeBalancePaid({ reg, capturedPaise, paymentId }) {
    if (reg.payment_status === 'completed') return { status: 'already_processed' };

    const expectedPaise = Math.round((Number(reg.amount_due) || 0) * 100);

    // Assert only when we actually know the captured figure (> 0). Some callers
    // (legacy links) may not surface the paid amount; in that case we trust the
    // link's "paid" status, having already confirmed it server-side.
    if (capturedPaise > 0 && expectedPaise > 0 && Math.round(capturedPaise) !== expectedPaise) {
        return flagMismatch(reg, { capturedPaise, expectedPaise, paymentId, context: 'balance' });
    }

    const { error } = await supabaseAdmin.from('registrations').update({
        payment_status: 'completed',
        amount_paid: Number(reg.total_amount) || 0,
        amount_due: 0,
        razorpay_payment_id: paymentId || reg.razorpay_payment_id,
    }).eq('id', reg.id);
    if (error) throw new Error('DB update (balance) failed: ' + error.message);
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

    // PENDING → check the order's payments for a capture (missed advance/full).
    if (reg.payment_status === 'pending') {
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

    // ADVANCE_PAID → check the balance payment link (missed payment_link.paid).
    if (reg.payment_status === 'advance_paid') {
        let link = null;
        try {
            if (reg.balance_link_id) {
                link = await rzp.paymentLink.fetch(reg.balance_link_id);
            } else {
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

// Creates a Razorpay Payment Link for the outstanding balance and notifies the
// registrant by email + WhatsApp. Stores the link's url + id for later "Sync".
// Returns the short URL (or null). Moved here so the webhook and cron share it.
export async function sendBalanceLink(reg) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
    const categoryTitle = reg.categories?.title || 'Registration';
    const dueRupees = Number(reg.amount_due) || 0;
    if (dueRupees <= 0) return null;

    let shortUrl = null;
    try {
        let cleanPhone = String(reg.phone || '').replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        const link = await getRazorpayClient().paymentLink.create({
            amount: Math.round(dueRupees * 100),
            currency: 'INR',
            accept_partial: false,
            description: `Balance payment — ${categoryTitle} (BaglaBhairav)`,
            reference_id: `bal_${reg.id}`,
            customer: { name: `${reg.first_name} ${reg.last_name}`.trim(), email: reg.email || undefined, contact: cleanPhone || undefined },
            notify: { sms: false, email: false }, // we notify ourselves below
            reminder_enable: true,
            notes: { registration_id: reg.id, kind: 'balance' },
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
        console.error('🚨 Balance payment link creation failed:', e);
        return null;
    }

    if (shortUrl) {
        if (reg.email) {
            try {
                await getResend().emails.send({
                    from: process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>',
                    to: [reg.email],
                    subject: '⏳ Pay your balance — BaglaBhairav registration',
                    html: `
                        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
                          <div style="background:#171717;padding:28px;text-align:center;"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">BaglaBhairav</h1></div>
                          <div style="padding:32px;background:#fff;">
                            <p style="font-size:16px;color:#404040;margin-top:0;">Namaste <strong>${reg.first_name} ${reg.last_name}</strong>,</p>
                            <p style="font-size:14px;color:#6b7280;line-height:1.6;">Thank you — your advance of <strong>₹${Number(reg.amount_paid).toLocaleString('en-IN')}</strong> for <strong>${categoryTitle}</strong> is received. To confirm your registration and receive your entry pass, please clear the remaining balance:</p>
                            <div style="text-align:center;margin:24px 0;">
                              <div style="font-size:13px;color:#6b7280;">Balance due</div>
                              <div style="font-size:28px;font-weight:800;color:#ea580c;margin:4px 0 16px;">₹${dueRupees.toLocaleString('en-IN')}</div>
                              <a href="${shortUrl}" style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">Pay Balance Now</a>
                            </div>
                            <p style="font-size:12px;color:#9ca3af;">Your entry pass is issued only after the full amount is paid. This is a No-Refund registration.</p>
                          </div>
                        </div>`,
                });
            } catch (e) { console.error('🚨 Balance email failed:', e); }
        }

        if (reg.phone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
            try {
                let cleanPhone = String(reg.phone).replace(/\D/g, '');
                if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
                const text = `🙏 *BaglaBhairav* — advance received for *${categoryTitle}*.\n\n*Balance due: ₹${dueRupees.toLocaleString('en-IN')}*\nPay here to confirm your registration:\n${shortUrl}\n\nYour entry pass is issued only after full payment.`;
                await fetch(process.env.WHATSAPP_API_URL, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { preview_url: true, body: text } }),
                });
            } catch (e) { console.error('🚨 Balance WhatsApp failed:', e); }
        }
    }
    return shortUrl;
}
