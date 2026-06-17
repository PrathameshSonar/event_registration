// lib/supabaseAdmin.js
//
// SERVER-ONLY Supabase client using the service_role key.
// This bypasses Row Level Security, so it must NEVER be imported into a
// Client Component or any code that ships to the browser. Only import it
// from Route Handlers (app/api/.../route.js) or other server-only modules.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    // Logged at startup so a misconfigured deploy is obvious immediately.
    // Using placeholder strings below so the module loads during `next build`
    // without throwing; real requests will fail with a clear auth error.
    console.error('🚨 Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in server environment.');
}

export const supabaseAdmin = createClient(
    supabaseUrl ?? 'https://build-placeholder.supabase.co',
    serviceRoleKey ?? 'build-placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
