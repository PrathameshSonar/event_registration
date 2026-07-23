// app/api/contact/route.js — public contact-form submissions → contact_messages.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const clean = (s, max) => String(s || '').replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim().slice(0, max);

export async function POST(request) {
  try {
    const { name, email, phone, subject, message } = await request.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    // Mobile: required, Indian 10-digit (accepts +91/0/91 prefixes, stored as the
    // bare 10 digits) so the admin can call/WhatsApp back.
    const cleanPhone = String(phone || '').replace(/\s+/g, '').replace(/^(\+91|0091|91|0)/, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('contact_messages').insert({
      name: clean(name, 120),
      email: clean(email, 200),
      phone: cleanPhone,
      subject: clean(subject, 200),
      message: clean(message, 4000),
    });
    if (error) return NextResponse.json({ error: 'Could not send your message.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
