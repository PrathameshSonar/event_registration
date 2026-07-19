// app/api/admin/data/route.js
// Returns dashboard data, RBAC-scoped per the caller's permissions.
//
// ⚠️ PII boundary: the raw `registrations` rows (name/phone/email/DOB/address)
// are returned ONLY to a session that holds `registrations:view`. A volunteer
// without it (e.g. a gate scanner with only `scanlog:view`) gets `[]` — the UI
// hides the Registrations tab, but this is the real boundary: hiding a tab while
// the API still streamed every row would not be access control.
//
// The `stats` block carries figures the Dashboard tiles need. Each member is
// scoped to the permission that already guards its own surface, so a role never
// sees a total it couldn't otherwise reach:
//   - donations           → `settings:manage` (Settings → Donations)
//   - checkedInRegs        → `scanlog:view`    (Scan Log)
//   - dashboard aggregates → `dashboard:view`  (computed server-side so a
//     dashboard-only volunteer sees the summary NUMBERS without the PII rows).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { hasPermission } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Start of "today" in IST (the operators are India-based; matches the client's
// local-midnight tile). Returned as a UTC instant for comparison to created_at.
function istStartOfToday() {
    const OFFSET_MIN = 330; // UTC+5:30
    const ist = new Date(Date.now() + OFFSET_MIN * 60_000);
    return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - OFFSET_MIN * 60_000);
}

// Server-side equivalent of the client's dashboard tiles — numbers only, no PII.
function dashboardAggregates(rows) {
    const paid = rows.filter((r) => r.payment_status === 'completed');
    const revenue = paid.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const startOfToday = istStartOfToday();
    const today = rows.filter((r) => new Date(r.created_at) >= startOfToday);
    const todayPaid = today.filter((r) => r.payment_status === 'completed');
    return {
        completed: paid.length,
        revenue,
        total: rows.length,
        todayCount: today.length,
        todayPaid: todayPaid.length,
        todayRevenue: todayPaid.reduce((s, r) => s + Number(r.total_amount || 0), 0),
        toVerify: rows.filter((r) => r.payment_status === 'payment_review' || r.payment_status === 'cheque_received').length,
        newEnquiries: rows.filter((r) => r.payment_status === 'enquired').length,
    };
}

export async function GET() {
    const { response, session } = await authorize();
    if (response) return response;

    const canSeeRegs = hasPermission(session, 'registrations:view');
    const canSeeDashboard = hasPermission(session, 'dashboard:view');
    const canSeeDonations = hasPermission(session, 'settings:manage');
    const canSeeCheckins = hasPermission(session, 'scanlog:view');

    const [regRes, catRes, evRes, mediaRes, donRes, chkRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('*, categories(title)').order('created_at', { ascending: false }),
        supabaseAdmin.from('categories').select('*').order('price', { ascending: true }),
        supabaseAdmin.from('events').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('event_media').select('*, events(title)').order('created_at', { ascending: false }),
        canSeeDonations
            ? supabaseAdmin.from('donations').select('amount, created_at').eq('status', 'completed')
            : Promise.resolve({ data: [] }),
        canSeeCheckins
            ? supabaseAdmin.from('checkins').select('registration_id')
            : Promise.resolve({ data: [] }),
    ]);

    const rows = regRes.data || [];
    const donations = donRes.data || [];
    // A person can be scanned at several checkpoints; the tile counts people, not scans.
    const checkedInRegs = new Set((chkRes.data || []).map((c) => c.registration_id)).size;

    return NextResponse.json({
        // PII rows only for a caller allowed to see registrations.
        registrations: canSeeRegs ? rows : [],
        categories: catRes.data || [],
        events: evRes.data || [],
        media: mediaRes.data || [],
        stats: {
            donations: canSeeDonations ? donations : null,
            donationsTotal: canSeeDonations ? donations.reduce((s, d) => s + Number(d.amount || 0), 0) : null,
            checkedInRegs: canSeeCheckins ? checkedInRegs : null,
            // Summary numbers so a dashboard-only volunteer sees tiles without PII.
            dashboard: canSeeDashboard ? dashboardAggregates(rows) : null,
        },
    });
}
