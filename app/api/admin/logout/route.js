// app/api/admin/logout/route.js
import { NextResponse } from 'next/server';
import { destroyAdminSession } from '@/lib/adminSession';

export const dynamic = 'force-dynamic';

export async function POST() {
    await destroyAdminSession();
    return NextResponse.json({ ok: true }, { status: 200 });
}
