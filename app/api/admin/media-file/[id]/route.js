// app/api/admin/media-file/[id]/route.js
// Returns a short-lived signed URL for a PRIVATE media-library file (the internal
// documents — sponsor decks, contracts, invoices — which live in the private
// `admin-docs` bucket and have no public URL at all).
//
// This route is the ONLY way to read them, which is the point: hiding a contract in
// the UI while it sits behind a permanent public URL would not be privacy.
// Same shape as /api/admin/payment-proof/[id].
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { id } = await params;
    const { data: row } = await supabaseAdmin
        .from('media_library')
        .select('bucket, path, visibility, url, filename')
        .eq('id', id)
        .single();
    if (!row) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    // A public file already has a permanent URL — no need to sign anything.
    if (row.visibility === 'public' && row.url) return NextResponse.json({ url: row.url });

    const { data, error } = await supabaseAdmin.storage
        .from(row.bucket)
        .createSignedUrl(row.path, 300); // 5 minutes
    if (error || !data?.signedUrl) {
        console.error('signed url failed:', error?.message);
        return NextResponse.json({ error: 'Could not open the file.' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl, filename: row.filename });
}
