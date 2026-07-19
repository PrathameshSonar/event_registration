// app/api/contact/route.js — public contact-form submissions → contact_messages.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const clean = (s, max) => String(s || '').replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim().slice(0, max);

export async function POST(request) {
  try {
    const { name, email, subject, message } = await request.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('contact_messages').insert({
      name: clean(name, 120),
      email: clean(email, 200),
      subject: clean(subject, 200),
      message: clean(message, 4000),
    });
    if (error) return NextResponse.json({ error: 'Could not send your message.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
