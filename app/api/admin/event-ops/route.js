// app/api/admin/event-ops/route.js
// Live event-day operations summary: how many paid attendees have arrived (been
// scanned), how many haven't, per-checkpoint counts, and the recent arrival rate.
// Read-only. Requires the scanlog:view permission (admin always passes).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize({ requirePermission: 'scanlog:view' });
    if (response) return response;

    const [paidRes, cpRes, ciRes] = await Promise.all([
        supabaseAdmin.from('registrations').select('id, attendees_count').eq('payment_status', 'completed'),
        supabaseAdmin.from('checkpoints').select('id, name').order('created_at', { ascending: true }),
        supabaseAdmin.from('checkins').select('registration_id, checkpoint_id, scanned_at'),
    ]);

    const paid = paidRes.data || [];
    const checkpoints = cpRes.data || [];
    const checkins = ciRes.data || [];

    // headcount per paid registration (a scan checks in the whole group).
    const seatsByReg = new Map();
    let paidAttendees = 0;
    for (const r of paid) {
        const seats = Number(r.attendees_count) || 1;
        seatsByReg.set(r.id, seats);
        paidAttendees += seats;
    }
    const paidRegs = paid.length;

    // A registration counts as "arrived" once it has ≥1 check-in (any checkpoint).
    const arrivedRegIds = new Set();
    for (const c of checkins) if (seatsByReg.has(c.registration_id)) arrivedRegIds.add(c.registration_id);
    let arrivedAttendees = 0;
    for (const id of arrivedRegIds) arrivedAttendees += seatsByReg.get(id) || 1;
    const arrivedRegs = arrivedRegIds.size;

    // Per-checkpoint: distinct paid registrations scanned there + their headcount.
    const cpMap = new Map(checkpoints.map((cp) => [cp.id, { id: cp.id, name: cp.name, regIds: new Set() }]));
    for (const c of checkins) {
        if (!seatsByReg.has(c.registration_id)) continue;
        const entry = cpMap.get(c.checkpoint_id);
        if (entry) entry.regIds.add(c.registration_id);
    }
    const perCheckpoint = [...cpMap.values()].map((e) => {
        let attendees = 0;
        for (const id of e.regIds) attendees += seatsByReg.get(id) || 1;
        return { id: e.id, name: e.name, regs: e.regIds.size, attendees };
    });

    // Recent arrival rate (scan events, not unique) + last scan time.
    const now = Date.now();
    let last15 = 0, last30 = 0, lastScanAt = null;
    for (const c of checkins) {
        const t = new Date(c.scanned_at).getTime();
        if (t >= now - 15 * 60_000) last15 += 1;
        if (t >= now - 30 * 60_000) last30 += 1;
        if (!lastScanAt || t > new Date(lastScanAt).getTime()) lastScanAt = c.scanned_at;
    }

    return NextResponse.json({
        paidRegs,
        paidAttendees,
        arrivedRegs,
        arrivedAttendees,
        notArrivedRegs: Math.max(0, paidRegs - arrivedRegs),
        notArrivedAttendees: Math.max(0, paidAttendees - arrivedAttendees),
        pct: paidAttendees > 0 ? Math.round((arrivedAttendees / paidAttendees) * 100) : 0,
        perCheckpoint,
        recent: { last15, last30 },
        lastScanAt,
        totalScans: checkins.length,
    });
}
