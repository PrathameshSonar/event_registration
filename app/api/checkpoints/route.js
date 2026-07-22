// Active checkpoints for the gate scanner (/scan). Read-only.
// Gated on `checkin:scan` — the only consumer is the scanner, which now requires
// a signed-in account, so this no longer needs to be a public endpoint. (Admin
// CRUD lives at /api/admin/checkpoints under `settings:manage`.)
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize({ requirePermission: 'checkin:scan' });
    if (response) return response;

    const { data, error } = await supabaseAdmin
        .from('checkpoints')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order');
    if (error) return NextResponse.json({ error: 'Failed to fetch checkpoints' }, { status: 500 });
    return NextResponse.json({ checkpoints: data || [] });
}
