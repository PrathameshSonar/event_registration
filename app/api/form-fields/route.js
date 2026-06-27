// Public: returns the visible registration-form fields (built-in + custom),
// ordered, with required flags. The checkout form fetches this on mount.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getActiveFields } from '@/lib/formFieldsServer';

export const dynamic = 'force-dynamic';

export async function GET() {
    const fields = await getActiveFields(supabaseAdmin);
    return NextResponse.json({ fields });
}
