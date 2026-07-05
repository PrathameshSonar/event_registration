// app/api/admin/payment-proof/[id]/route.js
// Returns a short-lived signed URL to an offline payment's proof file so admins
// can view it. Admin/viewer session required (bucket is private).
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
    const { response } = await authorize();
    if (response) return response;

    const { id } = await params;
    const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('offline_proof_path')
        .eq('id', id)
        .single();
    if (!reg?.offline_proof_path) return NextResponse.json({ error: 'No proof on file.' }, { status: 404 });

    const { data, error } = await supabaseAdmin.storage
        .from('payment-proofs')
        .createSignedUrl(reg.offline_proof_path, 300); // 5 minutes
    if (error || !data?.signedUrl) return NextResponse.json({ error: 'Could not load proof.' }, { status: 500 });

    return NextResponse.json({ url: data.signedUrl });
}
