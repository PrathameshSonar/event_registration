// app/api/admin/app-settings/route.js
// Global key/value app settings. Currently the `bank_details` block shown to
// users for offline payments.
//   GET  → { bank_details }        (any authenticated role)
//   PATCH { bank_details }         (admin only)
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const DEFAULT_BANK = {
    offline_enabled: false,
    methods: ['bank_transfer', 'cheque', 'cash'],
    account_name: '', account_number: '', ifsc: '', bank: '',
    upi_id: '', cheque_payee: '', instructions: '',
};

export async function GET() {
    const { response } = await authorize();
    if (response) return response;
    const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'bank_details').single();
    return NextResponse.json({ bank_details: { ...DEFAULT_BANK, ...(data?.value || {}) } });
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { bank_details } = await request.json();
    if (!bank_details || typeof bank_details !== 'object') {
        return NextResponse.json({ error: 'Missing settings.' }, { status: 400 });
    }
    const value = { ...DEFAULT_BANK, ...bank_details };
    value.methods = Array.isArray(value.methods) ? value.methods.filter((m) => ['bank_transfer', 'cheque', 'cash', 'dd'].includes(m)) : DEFAULT_BANK.methods;

    const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert({ key: 'bank_details', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) return NextResponse.json({ error: 'Save failed.' }, { status: 500 });

    await logAudit({ session, request, action: 'settings.payment_details', entity: 'settings', entityId: 'bank_details', summary: 'Updated offline payment details', metadata: { offline_enabled: value.offline_enabled, methods: value.methods } });
    return NextResponse.json({ ok: true, bank_details: value });
}
