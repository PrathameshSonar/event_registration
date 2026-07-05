// app/api/admin/login/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSession } from '@/lib/adminSession';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const MAX_FAILS = 5;            // consecutive failures before lockout
const LOCK_MINUTES = 15;       // cooldown once locked

function safeEqual(a, b) {
    const bufA = Buffer.from(a || '', 'utf8');
    const bufB = Buffer.from(b || '', 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

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
        const { password } = await request.json();
        if (!password) {
            return NextResponse.json({ error: 'Password required.' }, { status: 400 });
        }

        const adminPassword = process.env.ADMIN_PASSWORD;
        const viewerPassword = process.env.VIEWER_PASSWORD;
        if (!adminPassword) {
            console.error('ADMIN_PASSWORD is not configured.');
            return NextResponse.json({ error: 'Server auth not configured.' }, { status: 500 });
        }

        const ip = clientIp(request);
        const throttle = await getThrottle(ip);

        // Locked out?
        if (throttle?.locked_until && new Date(throttle.locked_until).getTime() > Date.now()) {
            const mins = Math.ceil((new Date(throttle.locked_until).getTime() - Date.now()) / 60_000);
            return NextResponse.json({ error: `Too many attempts. Try again in ${mins} minute(s).` }, { status: 429 });
        }

        let role = null;
        if (safeEqual(password, adminPassword)) role = 'admin';
        else if (viewerPassword && safeEqual(password, viewerPassword)) role = 'viewer';

        if (!role) {
            await recordFail(ip, throttle);
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        await clearThrottle(ip);
        await createAdminSession(role);
        return NextResponse.json({ role }, { status: 200 });
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
