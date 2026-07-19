// app/api/admin/health/route.js
// One-click "0 errors" audit. Admin only (exposes env/config state).
//   GET → { issues: [...], launch: [...] }
// issues = data anomalies in registrations (each with severity + affected rows).
// launch = pre-event readiness checks (env vars, active event, tiers, buckets).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { waConfigured } from '@/lib/whatsapp';
import { emailConfigured } from '@/lib/email';

export const dynamic = 'force-dynamic';

const HELD = ['completed', 'advance_paid'];

export async function GET() {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;

    const [regRes, catRes, evRes, cpRes, adminRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('id, first_name, last_name, phone, payment_status, amount_paid, amount_due, total_amount, category_id, attendees_count, balance_link_url, qr_sent_at, ticket_email_status, ticket_wa_status, created_at, payment_method, razorpay_payment_id'),
        supabaseAdmin.from('categories').select('id, title, price, max_capacity, is_enquiry_only'),
        supabaseAdmin.from('events').select('id, title, is_active'),
        supabaseAdmin.from('checkpoints').select('id, name'),
        supabaseAdmin.from('admin_users').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true),
    ]);
    const regs = regRes.data || [];
    const cats = catRes.data || [];
    const catTitle = Object.fromEntries(cats.map((c) => [c.id, c.title]));
    const label = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() + (r.phone ? ` (${r.phone})` : '');

    // ── DATA ANOMALIES ──────────────────────────────────────────────────────
    const issues = [];
    const add = (severity, title, detail, rows) => { if (rows.length) issues.push({ severity, title, detail, count: rows.length, examples: rows.slice(0, 5) }); };

    // Paid but no money recorded — should never happen.
    add('error', 'Paid with ₹0 recorded',
        'These rows are marked Paid but amount_paid is 0 — verify against Razorpay/receipts.',
        regs.filter((r) => r.payment_status === 'completed' && !(Number(r.amount_paid) > 0)).map(label));

    // Paid but recorded less than the total (beyond ₹1 fee tolerance).
    add('warn', 'Paid but recorded amount is short',
        'amount_paid is less than total_amount on a Paid row — check for missed part-payments.',
        regs.filter((r) => r.payment_status === 'completed' && Number(r.amount_paid) > 0 && Number(r.amount_paid) < Number(r.total_amount) - 1).map(label));

    // Advance-paid with no balance link to collect the rest.
    add('warn', 'Advance-paid without a balance link',
        'No payment link is stored to collect the remaining balance — use "Send balance link".',
        regs.filter((r) => r.payment_status === 'advance_paid' && !r.balance_link_url).map(label));

    // Same phone paid twice in the SAME category (cross-category is fine).
    const seen = new Map();
    const dupes = [];
    for (const r of regs) {
        if (!HELD.includes(r.payment_status) || !r.phone || !r.category_id) continue;
        const key = `${String(r.phone).replace(/\D/g, '').slice(-10)}|${r.category_id}`;
        if (seen.has(key)) dupes.push(`${label(r)} — ${catTitle[r.category_id] || 'tier'} (twice)`);
        else seen.set(key, r.id);
    }
    add('warn', 'Same phone paid twice in one category', 'Possible accidental double payment (multiple categories per person is fine).', dupes);

    // Ticket delivery failures.
    add('error', 'Ticket delivery failed',
        'The confirmation email/WhatsApp failed to send — open the row and use Resend confirmation.',
        regs.filter((r) => r.payment_status === 'completed' && (r.ticket_email_status === 'failed' || r.ticket_wa_status === 'failed')).map(label));

    // Paid but QR never sent.
    add('info', 'Paid but QR pass not sent yet',
        'Select these rows in the ledger and use Send QR before the event.',
        regs.filter((r) => r.payment_status === 'completed' && !r.qr_sent_at).map(label));

    // Offline verification queue sitting > 48h.
    const twoDaysAgo = Date.now() - 48 * 3600_000;
    add('warn', 'Offline payments waiting > 48h',
        'Proofs submitted more than 2 days ago are still unverified.',
        regs.filter((r) => r.payment_status === 'payment_review' && new Date(r.created_at).getTime() < twoDaysAgo).map(label));

    // Oversold tiers (seats held, counting group size, vs. max_capacity).
    const seatsTaken = {};
    for (const r of regs) {
        if (!HELD.includes(r.payment_status) || !r.category_id) continue;
        seatsTaken[r.category_id] = (seatsTaken[r.category_id] || 0) + (Number(r.attendees_count) || 1);
    }
    add('error', 'Tier oversold past capacity',
        'Seats held exceed max_capacity — review before more sales.',
        cats.filter((c) => Number(c.max_capacity) > 0 && (seatsTaken[c.id] || 0) > Number(c.max_capacity))
            .map((c) => `${c.title} — ${seatsTaken[c.id]} / ${c.max_capacity}`));

    // ── LAUNCH CHECKS ───────────────────────────────────────────────────────
    const launch = [];
    const check = (ok, name, detail) => launch.push({ ok: !!ok, name, detail });

    check(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET, 'Razorpay keys', 'NEXT_PUBLIC_RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET set');
    check(process.env.RAZORPAY_WEBHOOK_SECRET, 'Razorpay webhook secret', 'RAZORPAY_WEBHOOK_SECRET set (webhook events must also be enabled in the Razorpay dashboard)');
    check(process.env.SESSION_SECRET, 'Session secret', 'SESSION_SECRET set');
    // Login is now database-only (no shared env password). At least one active
    // admin account must exist, or nobody can get in — create one with
    // `npm run create-admin`.
    check((adminRes.count || 0) > 0, 'Admin account', `${adminRes.count || 0} active admin account(s) — create with \`npm run create-admin\``);
    // Provider-neutral on purpose: ask lib/email.js whether email is configured
    // rather than naming a vendor's env var here, so swapping provider can't leave
    // this check falsely red. (EMAIL_* is preferred; RESEND_* still works.)
    check(emailConfigured(), 'Email API key', 'EMAIL_API_KEY set (or the legacy RESEND_API_KEY)');
    check(process.env.EMAIL_FROM || process.env.RESEND_FROM, 'Email sender', 'EMAIL_FROM set (must be a verified domain sender)');
    check(waConfigured(), 'WhatsApp API', 'WHATSAPP_API_URL + WHATSAPP_ACCESS_TOKEN set');
    check(process.env.SCANNER_PIN, 'Scanner PIN', 'SCANNER_PIN set for gate staff');
    check(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL, 'Site URL', 'NEXT_PUBLIC_SITE_URL set (used in payment links)');

    const activeEvent = (evRes.data || []).find((e) => e.is_active);
    check(activeEvent, 'Active event', activeEvent ? `"${activeEvent.title}" is live` : 'No event is marked active');
    check(cats.some((c) => !c.is_enquiry_only && Number(c.price) > 0), 'Payable tiers', 'At least one paid tier exists');
    check((cpRes.data || []).length > 0, 'Entry checkpoints', 'At least one checkpoint for scanning');

    try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const names = new Set((buckets || []).map((b) => b.name));
        check(names.has('qr-codes'), 'qr-codes bucket', 'Private bucket for QR passes');
        check(names.has('payment-proofs'), 'payment-proofs bucket', 'Private bucket for offline proofs');
    } catch {
        check(false, 'Storage buckets', 'Could not list buckets — check the service-role key');
    }

    return NextResponse.json({ issues, launch, checkedAt: new Date().toISOString() });
}
