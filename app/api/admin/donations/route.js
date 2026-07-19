// app/api/admin/donations/route.js
// Admin: list Seva/donations + totals. Requires settings:manage.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { data, error } = await supabaseAdmin
        .from('donations')
        .select('id, name, phone, email, amount, message, status, is_anonymous, razorpay_order_id, razorpay_payment_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
    if (error) return NextResponse.json({ error: 'Failed to load donations.' }, { status: 500 });

    const rows = data || [];
    const completed = rows.filter((d) => d.status === 'completed');
    const total = completed.reduce((s, d) => s + Number(d.amount || 0), 0);
    return NextResponse.json({ donations: rows, total, completedCount: completed.length });
}
