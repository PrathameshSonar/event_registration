// app/api/checkin/verify-pin/route.js
// Validates the scanner PIN without exposing it to the client.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { pin } = await request.json().catch(() => ({}));
    const pinEnv = process.env.SCANNER_PIN;

    if (!pinEnv) {
        return NextResponse.json({ error: 'No SCANNER_PIN configured on the server.' }, { status: 503 });
    }
    if (!pin || pin !== pinEnv) {
        return NextResponse.json({ error: 'Invalid PIN.' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
}
