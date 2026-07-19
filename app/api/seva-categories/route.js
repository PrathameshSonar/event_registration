// app/api/seva-categories/route.js
// Public read of the admin-configured Seva categories for the /donate page.
// Returns [] when none are set (the page falls back to plain amount presets).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withDefaults } from '@/lib/appSettings';

export const revalidate = 300;

export async function GET() {
    try {
        const { data } = await supabaseAdmin
            .from('app_settings').select('value').eq('key', 'seva_categories').single();
        return NextResponse.json({ categories: withDefaults('seva_categories', data?.value) });
    } catch {
        return NextResponse.json({ categories: [] });
    }
}
