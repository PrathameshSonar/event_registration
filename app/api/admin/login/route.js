// app/api/admin/login/route.js
import { NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/adminSession';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword } from '@/lib/passwordHash';
import { effectivePermissions } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const MAX_FAILS = 5;            // consecutive failures before lockout
const LOCK_MINUTES = 15;       // cooldown once locked

function clientIp(request) {
    const fwd = request.headers.get('x-forwarded-for');
    return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
}

// All throttle DB calls are best-effort: if the table is missing or the DB
// errors, we FAIL OPEN (allow the attempt) so login can never be bricked.
async function getThrottle(ip) {
    try {
        const { data } = await supabaseAdmin.from('admin_login_attempts').select('*').eq('ip', ip).single();
        return data || null;
    } catch { return null; }
}
async function recordFail(ip, prev) {
    try {
        const now = Date.now();
        // Reset the counter if a previous lock has already expired.
        const base = (prev?.locked_until && new Date(prev.locked_until).getTime() < now) ? 0 : (prev?.fail_count || 0);
        const fail_count = base + 1;
        const locked_until = fail_count >= MAX_FAILS ? new Date(now + LOCK_MINUTES * 60_000).toISOString() : null;
        await supabaseAdmin.from('admin_login_attempts').upsert({ ip, fail_count, locked_until, updated_at: new Date().toISOString() }, { onConflict: 'ip' });
    } catch { /* fail open */ }
}
async function clearThrottle(ip) {
    try { await supabaseAdmin.from('admin_login_attempts').delete().eq('ip', ip); } catch { /* ignore */ }
}

export async function POST(request) {
    try {
        const { username, password } = await request.json();
        if (!username || !String(username).trim() || !password) {
            return NextResponse.json({ error: 'Username and password required.' }, { status: 400 });
        }

        const ip = clientIp(request);
        const throttle = await getThrottle(ip);

        // Locked out? (throttle keyed by IP, so it protects both login paths)
        if (throttle?.locked_until && new Date(throttle.locked_until).getTime() > Date.now()) {
            const mins = Math.ceil((new Date(throttle.locked_until).getTime() - Date.now()) / 60_000);
            return NextResponse.json({ error: `Too many attempts. Try again in ${mins} minute(s).` }, { status: 429 });
        }

        // ── Named account login (the only path) ──────────────────────────────
        // Every admin/volunteer is a row in `admin_users` with a scrypt-hashed
        // password. There is deliberately NO shared env-password fallback: a
        // shared secret in env can't be attributed to a person or rotated per
        // user. Bootstrap / recover the first account with `npm run create-admin`.
        let user = null;
        try {
            const { data } = await supabaseAdmin
                .from('admin_users')
                .select('id, username, name, password_hash, role, active, permissions')
                .eq('username', String(username).trim().toLowerCase())
                .single();
            user = data || null;
        } catch { user = null; }

        if (!user || user.active === false || !verifyPassword(password, user.password_hash)) {
            await recordFail(ip, throttle);
            return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
        }

        await clearThrottle(ip);
        try { await supabaseAdmin.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id); } catch { /* best effort */ }
        const permissions = effectivePermissions(user.role, user.permissions);
        await createAdminSession({ role: user.role, username: user.username, name: user.name || user.username, uid: user.id, permissions });
        return NextResponse.json({ role: user.role, name: user.name || user.username, permissions }, { status: 200 });
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
