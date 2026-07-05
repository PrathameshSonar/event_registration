// app/api/admin/registration-activity/route.js
//   GET ?registrationId=<id> → a single merged timeline for one registration:
//   every admin_audit_logs row for that entity + every contact note, newest first.
// Read-only, any admin/viewer role.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { response } = await authorize();
    if (response) return response;

    const id = new URL(request.url).searchParams.get('registrationId');
    if (!id) return NextResponse.json({ events: [] });

    const [auditRes, notesRes] = await Promise.all([
        supabaseAdmin
            .from('admin_audit_logs')
            .select('id, created_at, action, summary, actor_role, actor_label, metadata')
            .eq('entity', 'registration')
            .eq('entity_id', id)
            .order('created_at', { ascending: false })
            .limit(200),
        supabaseAdmin
            .from('registration_notes')
            .select('id, created_at, note, actor_role')
            .eq('registration_id', id)
            .order('created_at', { ascending: false }),
    ]);

    const audit = (auditRes.data || []).map((a) => ({
        kind: 'audit',
        id: `a-${a.id}`,
        at: a.created_at,
        action: a.action,
        text: a.summary || a.action,
        actor: a.actor_label || a.actor_role || 'admin',
    }));
    const notes = (notesRes.data || []).map((n) => ({
        kind: 'note',
        id: `n-${n.id}`,
        at: n.created_at,
        action: 'note',
        text: n.note,
        actor: n.actor_role || 'admin',
    }));

    const events = [...audit, ...notes].sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    return NextResponse.json({ events });
}
