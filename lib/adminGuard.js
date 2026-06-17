// lib/adminGuard.js
//
// SERVER-ONLY authorization helpers for admin Route Handlers.
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminSession';

function safeEqual(a, b) {
    const bufA = Buffer.from(a || '', 'utf8');
    const bufB = Buffer.from(b || '', 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// Returns { session } on success, or { response } with a 401/403 to return.
// requireAdmin = true means viewer role is rejected.
export async function authorize({ requireAdmin = false } = {}) {
    const session = await getAdminSession();
    if (!session) {
        return { response: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) };
    }
    if (requireAdmin && session.role !== 'admin') {
        return { response: NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 }) };
    }
    return { session };
}

// Re-authentication for destructive actions: the caller must resend the admin
// password. Returns true only if it matches ADMIN_PASSWORD.
export function verifyAdminPassword(password) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return false;
    return safeEqual(password, adminPassword);
}
