// Public: capture a reminder opt-in (email and/or phone) for an event.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const { eventId, email, phone } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').replace(/\D/g, '');

    if (!cleanEmail && !cleanPhone) {
        return NextResponse.json({ error: 'Enter an email or phone number.' }, { status: 400 });
    }
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
        return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('event_reminders').insert({
        event_id: eventId || null,
        email: cleanEmail || null,
        phone: cleanPhone || null,
    });
    if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
