// app/api/admin/data/route.js
// Returns all dashboard data. Any authenticated role (admin or volunteer).
//
// The `stats` block carries the figures the Dashboard tiles need that aren't
// derivable from the registrations array (donations live in their own table;
// check-ins live in `checkins`). Each is scoped to the permission that already
// guards its own panel, so a volunteer never sees a total they couldn't reach
// via Settings → Donations (`settings:manage`) or the Scan Log (`scanlog:view`).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { hasPermission } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response, session } = await authorize();
    if (response) return response;

    const canSeeDonations = hasPermission(session, 'settings:manage');
    const canSeeCheckins = hasPermission(session, 'scanlog:view');

    const [regRes, catRes, evRes, mediaRes, donRes, chkRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('*, categories(title)').order('created_at', { ascending: false }),
        supabaseAdmin.from('categories').select('*').order('price', { ascending: true }),
        supabaseAdmin.from('events').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('event_media').select('*, events(title)').order('created_at', { ascending: false }),
        // Only the completed ones are money in the bank — the charts and the tile
        // both want the same set, so filter here rather than in two places.
        canSeeDonations
            ? supabaseAdmin.from('donations').select('amount, created_at').eq('status', 'completed')
            : Promise.resolve({ data: [] }),
        canSeeCheckins
            ? supabaseAdmin.from('checkins').select('registration_id')
            : Promise.resolve({ data: [] }),
    ]);

    const donations = donRes.data || [];
    // A person can be scanned at several checkpoints; the tile counts people, not scans.
    const checkedInRegs = new Set((chkRes.data || []).map((c) => c.registration_id)).size;

    return NextResponse.json({
        registrations: regRes.data || [],
        categories: catRes.data || [],
        events: evRes.data || [],
        media: mediaRes.data || [],
        stats: {
            donations: canSeeDonations ? donations : null,
            donationsTotal: canSeeDonations ? donations.reduce((s, d) => s + Number(d.amount || 0), 0) : null,
            checkedInRegs: canSeeCheckins ? checkedInRegs : null,
        },
    });
}
