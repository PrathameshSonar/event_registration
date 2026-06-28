// app/api/admin/audit-logs/route.js
// Reads the admin audit trail. Admin only.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');
    const q = searchParams.get('q');
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT));

    let query = supabaseAdmin
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (entity) query = query.eq('entity', entity);
    if (action) query = query.eq('action', action);
    if (q) query = query.ilike('summary', `%${q}%`);

    const { data, error } = await query;
    if (error) {
        console.error('audit-logs read error:', error.message);
        return NextResponse.json({ error: 'Failed to load audit logs.' }, { status: 500 });
    }

    return NextResponse.json({ logs: data || [] });
}
