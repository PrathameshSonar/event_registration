// app/api/admin/app-settings/route.js
// Global key/value app settings, driven by the registry in lib/appSettings.js.
//
//   GET               → every known setting, merged over its defaults (any role)
//   PATCH { <key>: {…} } → save one or more settings (needs settings:manage)
//
// The response still contains `bank_details` at the top level, so the existing
// PaymentSettingsManager keeps working unchanged — new keys (branding, seo) simply
// appear alongside it.
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { SETTINGS, SETTING_KEYS, withDefaults } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { response } = await authorize();
    if (response) return response;

    const { data } = await supabaseAdmin
        .from('app_settings')
        .select('key, value')
        .in('key', SETTING_KEYS);

    const stored = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    const out = {};
    for (const key of SETTING_KEYS) out[key] = withDefaults(key, stored[key]);
    return NextResponse.json(out);
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const body = await request.json();
    const keys = SETTING_KEYS.filter((k) => body[k] && typeof body[k] === 'object');
    if (!keys.length) return NextResponse.json({ error: 'No known settings supplied.' }, { status: 400 });

    const saved = {};
    for (const key of keys) {
        const value = SETTINGS[key].sanitize(body[key]);
        const { error } = await supabaseAdmin
            .from('app_settings')
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) {
            console.error('settings save failed:', key, error.message);
            return NextResponse.json({ error: 'Save failed.' }, { status: 500 });
        }
        saved[key] = value;

        // These are read through unstable_cache (so a layout/page can use them
        // without going dynamic). Without busting the tag here, a save wouldn't
        // reach the public site until the cache revalidates on its own.
        if (['branding', 'seo', 'page_heroes'].includes(key)) revalidateTag(key);

        await logAudit({
            session, request,
            action: `settings.${key}`, entity: 'settings', entityId: key,
            summary: `Updated ${key.replace(/_/g, ' ')}`,
            metadata: { key },
        });
    }

    return NextResponse.json({ ok: true, ...saved });
}
