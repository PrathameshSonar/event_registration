// lib/settingsServer.js
// SERVER-ONLY. Cached readers for the app_settings rows that runtime code needs.
//
// Kept apart from lib/appSettings.js (which is client-safe and holds the defaults +
// sanitisers) because this file imports the service-role Supabase client — the same
// split as messageKinds/messageLog and formFields/formFieldsServer.
//
// Every reader is cached and TAGGED. /api/admin/app-settings calls revalidateTag()
// on save, so an edit takes effect immediately instead of waiting out the TTL.
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withDefaults } from '@/lib/appSettings';

function reader(key) {
    return unstable_cache(
        async () => {
            try {
                const { data } = await supabaseAdmin
                    .from('app_settings').select('value').eq('key', key).single();
                return withDefaults(key, data?.value);
            } catch {
                // A settings read must never break a send / a page render.
                return withDefaults(key, null);
            }
        },
        [`settings:${key}`],
        { revalidate: 300, tags: [key] },
    );
}

export const getEmailTemplates = reader('email_templates');
export const getWhatsAppTemplateNames = reader('whatsapp_templates');
export const getQrConfig = reader('qr');
