// app/api/webhook/razorpay/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Lazily initialized so missing RESEND_API_KEY during `next build` doesn't throw.
let _resend = null;
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

let _razorpay = null;
function getRazorpay() {
    if (!_razorpay) {
        _razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _razorpay;
}

// Sends the confirmation "ticket" email + WhatsApp once a registration is fully paid.
async function dispatchTicket(reg, paymentId) {
    const { data: activeEvent } = await supabaseAdmin
        .from('events').select('venue, date_time').eq('is_active', true).single();
    const eventVenue = activeEvent?.venue || null;
    const eventDate = activeEvent?.date_time || null;
    const firstName = reg.first_name, lastName = reg.last_name;
    const categoryTitle = reg.categories?.title || 'General Admission';
    const totalAmount = reg.total_amount;
    const attendeesCount = reg.attendees_count;

    if (reg.email) {
        try {
            await getResend().emails.send({
                from: process.env.RESEND_FROM || 'BaglaBhairav <onboarding@resend.dev>',
                to: [reg.email],
                subject: `✅ Confirmed: Your Ticket for BaglaBhairav`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
                    <div style="background-color: #171717; padding: 32px; text-align: center;">
                        <span style="color: #ea580c; font-size: 12px; font-weight: bold; text-transform: uppercase;">Registration Confirmed</span>
                        <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 28px; font-weight: 800;">BaglaBhairav</h1>
                    </div>
                    <div style="padding: 32px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #404040; margin-top: 0;">Namaste <strong>${firstName} ${lastName}</strong>,</p>
                        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Your contribution has been fully received. Below is your official digital entry pass registry. Please keep this email handy at the venue gateway.</p>
                        <div style="background-color: #f9fafb; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr><td style="padding: 6px 0; color: #6b7280;">Access Tier:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${categoryTitle}</td></tr>
                            <tr><td style="padding: 6px 0; color: #6b7280;">Total Attendees:</td><td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right;">${attendeesCount} Person(s)</td></tr>
                            <tr><td style="padding: 6px 0; color: #6b7280;">Payment Reference:</td><td style="padding: 6px 0; font-family: monospace; color: #ea580c; text-align: right; font-size: 12px;">${paymentId}</td></tr>
                            <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0 0 0; font-weight: bold; color: #111827;">Total Paid:</td><td style="padding: 12px 0 0 0; font-weight: 800; color: #16a34a; text-align: right; font-size: 18px;">₹${totalAmount}</td></tr>
                        </table>
                        </div>
                        ${eventVenue || eventDate ? `
                        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
                            ${eventDate ? `<div style="font-size: 13px; color: #9a3412; margin-bottom: 6px;">📅 <strong>Date:</strong> ${eventDate}</div>` : ''}
                            ${eventVenue ? `<div style="font-size: 13px; color: #9a3412;">📍 <strong>Venue:</strong> ${eventVenue}</div>` : ''}
                        </div>` : ''}
                    </div>
                    </div>`,
            });
        } catch (e) { console.error('🚨 Ticket email failed:', e); }
    }

    if (reg.phone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_ACCESS_TOKEN) {
        try {
            let cleanPhone = reg.phone.replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
            await fetch(process.env.WHATSAPP_API_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp', to: cleanPhone, type: 'template',
                    template: { name: 'ticket_confirmation', language: { code: 'en' }, components: [
                        { type: 'body', parameters: [
                            { type: 'text', text: `${firstName} ${lastName}` },
                            { type: 'text', text: categoryTitle },
                            { type: 'text', text: paymentId },
                        ] },
                    ] },
                }),
            });
        } catch (e) { console.error('🚨 Ticket WhatsApp failed:', e); }
    }
}

// Creates a Razorpay Payment Link for the outstanding balance and sends it
// to the registrant by email + WhatsApp. Returns the short URL (or null).
async function sendBalanceLink(reg) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');
    const categoryTitle = reg.categories?.title || 'Registration';
    const dueRupees = Number(reg.amount_due) || 0;
    if (dueRupees <= 0) return null;

    let shortUrl = null;
    try {
        let cleanPhone = String(reg.phone || '').replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        const link = await getRazorpay().paymentLink.create({
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
    } catch (e) {
        console.error('🚨 Balance payment link creation failed:', e);
        return null;
    }

    if (shortUrl) {
        await supabaseAdmin.from('registrations').update({ balance_link_url: shortUrl }).eq('id', reg.id);

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

// Constant-time comparison to avoid timing side-channels on the signature.
function safeEqual(a, b) {
    const bufA = Buffer.from(a || '', 'utf8');
    const bufB = Buffer.from(b || '', 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('🚨 RAZORPAY_WEBHOOK_SECRET is not configured.');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        // 1. Verify Cryptographic Signature
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (!safeEqual(expectedSignature, signature)) {
            console.error("🚨 SECURITY ALERT: Invalid Razorpay Signature!");
            return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
        }

        const event = JSON.parse(body);
        const eventType = event.event;
        console.log(`\n🔔 Webhook Received: [${eventType}]`);

        // ==========================================
        // SCENARIO A: PAYMENT CAPTURED (advance order OR full order)
        // ==========================================
        if (eventType === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            const { data: reg, error: fetchError } = await supabaseAdmin
                .from('registrations')
                .select('*, categories(title)')
                .eq('razorpay_order_id', orderId)
                .single();

            // No match here may mean it's a Payment-Link (balance) payment — those
            // are handled by the payment_link.paid event below. Acknowledge & exit.
            if (fetchError || !reg) {
                console.log(`ℹ️ payment.captured for order ${orderId} has no matching advance/full registration (likely a payment-link balance). Acknowledged.`);
                return NextResponse.json({ status: "no_order_match_acknowledged" }, { status: 200 });
            }

            // Idempotency
            if (reg.payment_status === 'completed' || reg.payment_status === 'advance_paid') {
                console.log(`✅ Idempotency: registration ${reg.id} already ${reg.payment_status}.`);
                return NextResponse.json({ status: "already_processed" }, { status: 200 });
            }

            const capturedRupees = payment.amount / 100;
            console.log(`💰 Captured ₹${capturedRupees.toFixed(2)} for order ${orderId} (plan: ${reg.payment_plan || 'full'})`);

            // ── PART PAYMENT: this was the advance ──────────────────────────
            if (reg.payment_plan === 'partial' && Number(reg.amount_due) > 0) {
                const { error: upErr } = await supabaseAdmin
                    .from('registrations')
                    .update({
                        payment_status: 'advance_paid',
                        amount_paid: capturedRupees,
                        razorpay_payment_id: paymentId,
                    })
                    .eq('id', reg.id);
                if (upErr) {
                    console.error('❌ DB update (advance) failed:', upErr);
                    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
                }
                console.log(`◐ Advance recorded for ${reg.id}. Generating balance link…`);
                // reg.amount_paid not yet reflecting capture in our local object — patch for the email
                await sendBalanceLink({ ...reg, amount_paid: capturedRupees });
                return NextResponse.json({ status: "advance_recorded" }, { status: 200 });
            }

            // ── FULL PAYMENT ────────────────────────────────────────────────
            const { error: updateError } = await supabaseAdmin
                .from('registrations')
                .update({
                    payment_status: 'completed',
                    razorpay_payment_id: paymentId,
                    amount_paid: reg.total_amount,
                    amount_due: 0,
                })
                .eq('id', reg.id);
            if (updateError) {
                console.error(`❌ DB Update Failed for Order ${orderId}:`, updateError);
                return NextResponse.json({ error: "Database update failed" }, { status: 500 });
            }
            console.log(`✅ Order ${orderId} marked COMPLETED.`);
            await dispatchTicket(reg, paymentId);
        }

        // ==========================================
        // SCENARIO A2: BALANCE PAID via Payment Link → fully paid
        // ==========================================
        else if (eventType === 'payment_link.paid') {
            const link = event.payload.payment_link?.entity || {};
            const linkPayment = event.payload.payment?.entity || {};
            const regId = link.notes?.registration_id
                || (typeof link.reference_id === 'string' ? link.reference_id.replace(/^bal_/, '') : null);

            if (!regId) {
                console.error('❌ payment_link.paid with no registration reference. Acknowledged.');
                return NextResponse.json({ status: "no_reference_acknowledged" }, { status: 200 });
            }

            const { data: reg, error } = await supabaseAdmin
                .from('registrations')
                .select('*, categories(title)')
                .eq('id', regId)
                .single();
            if (error || !reg) {
                console.error(`❌ payment_link.paid: registration ${regId} not found. Acknowledged.`);
                return NextResponse.json({ status: "record_not_found_acknowledged" }, { status: 200 });
            }
            if (reg.payment_status === 'completed') {
                return NextResponse.json({ status: "already_processed" }, { status: 200 });
            }

            const { error: upErr } = await supabaseAdmin
                .from('registrations')
                .update({
                    payment_status: 'completed',
                    amount_paid: reg.total_amount,
                    amount_due: 0,
                    razorpay_payment_id: linkPayment.id || reg.razorpay_payment_id,
                })
                .eq('id', reg.id);
            if (upErr) {
                console.error('❌ DB update (balance) failed:', upErr);
                return NextResponse.json({ error: "Database update failed" }, { status: 500 });
            }
            console.log(`✅ Balance cleared for ${reg.id} — registration COMPLETED.`);
            await dispatchTicket(reg, linkPayment.id || 'balance-paid');
        }

        // ==========================================
        // SCENARIO B & C: FAILURES & REFUNDS
        // ==========================================
        else if (eventType === 'payment.failed') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;
            console.log(`⚠️ Payment Failed for Order ${orderId}. Reason: ${payment.error_description}`);
            await supabaseAdmin.from('registrations').update({ payment_status: 'failed' }).eq('razorpay_order_id', orderId);
        } else if (eventType === 'refund.processed') {
            const refund = event.payload.refund.entity;
            console.log(`⏪ Refund Processed for Payment ${refund.payment_id}`);
            await supabaseAdmin.from('registrations').update({ payment_status: 'refunded' }).eq('razorpay_payment_id', refund.payment_id);
        }

        // Always return 200 OK so Razorpay knows we received the ping
        return NextResponse.json({ status: "success" }, { status: 200 });

    } catch (error) {
        console.error("❌ Fatal Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}