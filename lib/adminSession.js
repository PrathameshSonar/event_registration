// lib/adminSession.js
//
// SERVER-ONLY admin session helpers. Signs a small JWT (role only — no PII,
// no password) and stores it in an httpOnly cookie. Used by the admin login
// route and every protected admin Route Handler.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { effectivePermissions } from '@/lib/permissions';

const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function getKey() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error('SESSION_SECRET is not configured.');
    }
    return new TextEncoder().encode(secret);
}

export async function encryptSession(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${MAX_AGE_SECONDS}s`)
        .sign(getKey());
}

export async function decryptSession(token) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] });
        return payload;
    } catch {
        return null;
    }
}

// Set the session cookie. Accepts a bare role string ('admin'|'viewer') for the
// legacy shared-password login, or an object { role, username, name, uid } for a
// named admin account (so the audit log can record WHO acted).
export async function createAdminSession(roleOrPayload) {
    const payload = typeof roleOrPayload === 'string' ? { role: roleOrPayload } : (roleOrPayload || {});
    const token = await encryptSession({
        role: payload.role,
        username: payload.username || null,
        name: payload.name || null,
        uid: payload.uid || null,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : null,
    });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: MAX_AGE_SECONDS,
    });
}

export async function destroyAdminSession() {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

// Returns { role, username, name, uid } or null. username/name/uid are null for
// the legacy shared-password login. Read this in protected routes / server comps.
export async function getAdminSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const payload = await decryptSession(token);
    if (!payload || !['admin', 'volunteer'].includes(payload.role)) return null;
    return {
        role: payload.role,
        username: payload.username || null,
        name: payload.name || null,
        uid: payload.uid || null,
        // Effective permissions: admin → all, volunteer → their granted set.
        permissions: effectivePermissions(payload.role, payload.permissions),
    };
}
