// lib/adminGuard.js
//
// SERVER-ONLY authorization helpers for admin Route Handlers.
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminSession';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword } from '@/lib/passwordHash';
import { hasPermission } from '@/lib/permissions';

// Returns { session } on success, or { response } with a 401/403 to return.
//   requireAdmin      = true  → only the 'admin' role passes (viewers/volunteers rejected).
//   requirePermission = 'key' → admin passes always; others need that permission.
// Admin always satisfies requirePermission, so gating a route by permission never
// removes admin access — it only *adds* the ability to delegate to a volunteer.
export async function authorize({ requireAdmin = false, requirePermission = null } = {}) {
    const session = await getAdminSession();
    if (!session) {
        return { response: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) };
    }
    if (requireAdmin && session.role !== 'admin') {
        return { response: NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 }) };
    }
    if (requirePermission && !hasPermission(session, requirePermission)) {
        return { response: NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 }) };
    }
    return { session };
}

// Re-authentication for destructive actions: the signed-in user must resend
// THEIR OWN account password (verified against their admin_users hash). No env
// secret is involved, so the confirmation is attributable to a real person and
// works for any account that reached the route (admin, or a volunteer with the
// required permission). Returns true only if the password matches.
export async function verifyAdminPassword(session, password) {
    if (!session?.uid || !password) return false;
    let user = null;
    try {
        const { data } = await supabaseAdmin
            .from('admin_users')
            .select('password_hash, active')
            .eq('id', session.uid)
            .single();
        user = data || null;
    } catch { return false; }
    if (!user || user.active === false) return false;
    return verifyPassword(password, user.password_hash);
}
