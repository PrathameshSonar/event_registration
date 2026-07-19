// app/api/admin/session/route.js
// Lightweight "who am I" check. The admin dashboard calls this on mount to
// rehydrate its session from the httpOnly cookie — so a page refresh keeps the
// admin logged in (instead of bouncing to the login screen) as long as the
// 8-hour session cookie is still valid.
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminSession';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({
        authenticated: true,
        role: session.role,
        name: session.name,
        permissions: session.permissions || [],
    });
}
