// Public read-only endpoint — scan page fetches active checkpoints after PIN auth.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('checkpoints')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order');
    if (error) return NextResponse.json({ error: 'Failed to fetch checkpoints' }, { status: 500 });
    return NextResponse.json({ checkpoints: data || [] });
}
