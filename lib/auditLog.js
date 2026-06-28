// lib/auditLog.js
//
// SERVER-ONLY audit trail writer. Every mutating admin Route Handler calls this
// after a successful change so we have a record of who did what. It is
// deliberately fire-and-forget: a logging failure must NEVER break or roll back
// the underlying admin action, so all errors are swallowed (logged to console).
//
// actor_id / actor_label are left null today (auth is role-only). When RBAC adds
// real per-user identities, populate them from the session here — no call sites
// need to change.
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function logAudit({
    session,
    request,
    action,
    entity = null,
    entityId = null,
    summary = null,
    metadata = null,
}) {
    try {
        const fwd = request?.headers?.get('x-forwarded-for');
        const ip = (fwd ? fwd.split(',')[0].trim() : request?.headers?.get('x-real-ip')) || null;

        await supabaseAdmin.from('admin_audit_logs').insert([{
            actor_role: session?.role || 'unknown',
            actor_id: null,        // reserved for RBAC
            actor_label: null,     // reserved for RBAC
            action,
            entity,
            entity_id: entityId != null ? String(entityId) : null,
            summary,
            metadata,
            ip,
        }]);
    } catch (e) {
        console.error('audit log failed:', e?.message);
    }
}
