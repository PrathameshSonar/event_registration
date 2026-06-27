// Public: returns the visible registration-form fields for a given category
// (built-in + custom), ordered, with required flags. The checkout form fetches
// this on mount using ?categoryId=<id>.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getActiveFields } from '@/lib/formFieldsServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    const fields = await getActiveFields(supabaseAdmin, categoryId);
    return NextResponse.json({ fields });
}
