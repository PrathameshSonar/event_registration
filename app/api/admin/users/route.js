// app/api/admin/users/route.js
// Manage named admin/viewer accounts. Admin only. Passwords are scrypt-hashed and
// never returned. The audit log records who created/changed/removed an account.
//   GET                                   → list users (no hashes)
//   POST   { username, name, password, role }              → create
//   PATCH  { id, name?, role?, active?, password? }         → update (password optional)
//   DELETE { id }                                           → remove
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { hashPassword } from '@/lib/passwordHash';
import { PERMISSION_KEYS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const PUBLIC_COLS = 'id, username, name, role, permissions, active, created_at, last_login_at';
const ROLES = ['admin', 'volunteer'];
const bad = (m) => NextResponse.json({ error: m }, { status: 400 });

// Keep only known permission keys; volunteers carry a list, others carry [].
const cleanPerms = (role, perms) =>
    role === 'volunteer' ? (Array.isArray(perms) ? perms.filter((p) => PERMISSION_KEYS.includes(p)) : []) : [];

export async function GET() {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { data, error } = await supabaseAdmin.from('admin_users').select(PUBLIC_COLS).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: 'Could not load users.' }, { status: 500 });
    return NextResponse.json({ users: data || [] });
}

export async function POST(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { username, name, password, role = 'admin', permissions } = await request.json();
    const uname = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(uname)) return bad('Username: 3–32 chars, letters/numbers/._- only.');
    if (!password || String(password).length < 8) return bad('Password must be at least 8 characters.');
    if (!ROLES.includes(role)) return bad('Invalid role.');
    const perms = cleanPerms(role, permissions);
    if (role === 'volunteer' && perms.length === 0) return bad('Select at least one permission for a volunteer.');

    const { data, error } = await supabaseAdmin
        .from('admin_users')
        .insert({ username: uname, name: (name || '').trim() || uname, password_hash: hashPassword(password), role, permissions: perms })
        .select(PUBLIC_COLS)
        .single();
    if (error) {
        if (error.code === '23505') return bad('That username already exists.');
        return NextResponse.json({ error: 'Could not create the user.' }, { status: 500 });
    }

    await logAudit({ session, request, action: 'admin_user.create', entity: 'admin_user', entityId: data.id, summary: `Created ${role} account "${uname}"`, metadata: { role, permissions: perms } });
    return NextResponse.json({ ok: true, user: data });
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id, name, role, active, password, permissions } = await request.json();
    if (!id) return bad('Missing id.');

    // Need the current role to correctly clean permissions when only one changes.
    const { data: current } = await supabaseAdmin.from('admin_users').select('role').eq('id', id).single();
    const effectiveRole = role !== undefined ? role : current?.role;

    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (role !== undefined) { if (!ROLES.includes(role)) return bad('Invalid role.'); patch.role = role; }
    if (active !== undefined) patch.active = !!active;
    if (password) { if (String(password).length < 8) return bad('Password must be at least 8 characters.'); patch.password_hash = hashPassword(password); }
    // Recompute permissions whenever role or permissions change.
    if (role !== undefined || permissions !== undefined) {
        const perms = cleanPerms(effectiveRole, permissions !== undefined ? permissions : undefined);
        if (effectiveRole === 'volunteer' && permissions !== undefined && perms.length === 0) return bad('Select at least one permission for a volunteer.');
        patch.permissions = perms;
    }
    if (Object.keys(patch).length === 0) return bad('Nothing to update.');

    const { data, error } = await supabaseAdmin.from('admin_users').update(patch).eq('id', id).select(PUBLIC_COLS).single();
    if (error || !data) return NextResponse.json({ error: 'Could not update the user.' }, { status: 500 });

    const changed = Object.keys(patch).map((k) => (k === 'password_hash' ? 'password' : k)).join(', ');
    await logAudit({ session, request, action: 'admin_user.update', entity: 'admin_user', entityId: id, summary: `Updated account "${data.username}" (${changed})`, metadata: { changed } });
    return NextResponse.json({ ok: true, user: data });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requireAdmin: true });
    if (response) return response;

    const { id } = await request.json();
    if (!id) return bad('Missing id.');
    // Don't allow deleting the account you're currently signed in as.
    if (session?.uid && session.uid === id) return bad('You cannot delete the account you are signed in with.');

    const { data: victim } = await supabaseAdmin.from('admin_users').select('username').eq('id', id).single();
    const { error } = await supabaseAdmin.from('admin_users').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Could not remove the user.' }, { status: 500 });

    await logAudit({ session, request, action: 'admin_user.delete', entity: 'admin_user', entityId: id, summary: `Removed account "${victim?.username || id}"` });
    return NextResponse.json({ ok: true });
}
