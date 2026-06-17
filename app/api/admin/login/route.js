// app/api/admin/login/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSession } from '@/lib/adminSession';

export const dynamic = 'force-dynamic';

function safeEqual(a, b) {
    const bufA = Buffer.from(a || '', 'utf8');
    const bufB = Buffer.from(b || '', 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
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

        let role = null;
        if (safeEqual(password, adminPassword)) role = 'admin';
        else if (viewerPassword && safeEqual(password, viewerPassword)) role = 'viewer';

        if (!role) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
        }

        await createAdminSession(role);
        return NextResponse.json({ role }, { status: 200 });
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
