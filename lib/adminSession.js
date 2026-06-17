// lib/adminSession.js
//
// SERVER-ONLY admin session helpers. Signs a small JWT (role only — no PII,
// no password) and stores it in an httpOnly cookie. Used by the admin login
// route and every protected admin Route Handler.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

// Set the session cookie. role is 'admin' or 'viewer'.
export async function createAdminSession(role) {
    const token = await encryptSession({ role });
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

// Returns { role } or null. Read this in protected routes / server components.
export async function getAdminSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const payload = await decryptSession(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'viewer')) return null;
    return { role: payload.role };
}
