// app/api/declaration/route.js
// Public read of the admin-configured declaration (Samanti Patra) for the
// blocking consent modal on the register + donate pages.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withDefaults } from '@/lib/appSettings';

export const revalidate = 300;

export async function GET() {
    try {
        const { data } = await supabaseAdmin
            .from('app_settings').select('value').eq('key', 'declaration').single();
        return NextResponse.json({ declaration: withDefaults('declaration', data?.value) });
    } catch {
        return NextResponse.json({ declaration: withDefaults('declaration', null) });
    }
}
