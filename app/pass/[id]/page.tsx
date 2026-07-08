// app/pass/[id]/page.tsx
// Public "my entry pass" page. The link is sent ONLY to the registrant's own
// email/WhatsApp by the self-service lookup, so anyone opening it already
// controls that contact. Shows the scannable QR for a paid registration, or the
// status + a "complete payment" link for an unpaid one. The id is an unguessable
// UUID, so the page isn't discoverable.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

export default async function PassPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, total_amount, amount_due, payment_status, phone, gotra, balance_link_url, categories(title)')
        .eq('id', id)
        .single();

    if (!reg) notFound();

    const isPaid = reg.payment_status === 'completed';
    const fullName = [reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(' ');
    const category = (reg as { categories?: { title?: string } }).categories?.title || '—';
    const shortId = reg.id.split('-')[0].toUpperCase();

    // Scannable QR encodes the same /entry/<id> verification URL the emailed pass uses.
    const qrDataUrl = isPaid ? await QRCode.toDataURL(`${siteUrl}/entry/${reg.id}`, { width: 320, margin: 1, color: { dark: '#171717', light: '#ffffff' } }) : null;

    return (
        <main className="min-h-screen bg-ivory flex items-center justify-center p-4 [color-scheme:light]">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-gold-100">
                <div className={`p-5 text-center ${isPaid ? 'bg-gradient-to-b from-orange-700 to-amber-700' : 'bg-neutral-800'} text-white`}>
                    <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest">BaglaBhairav Mahotsav</p>
                    <p className="font-serif text-2xl font-black mt-1">{isPaid ? 'Entry Pass' : 'Registration'}</p>
                    <p className="text-white/70 text-xs mt-1">{isPaid ? '✓ Paid — show this at the gate' : `Status: ${reg.payment_status.replace('_', ' ')}`}</p>
                </div>

                <div className="p-6">
                    {isPaid && qrDataUrl && (
                        <div className="text-center mb-5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrDataUrl} alt="Entry QR code" className="w-56 h-56 mx-auto rounded-xl border-2 border-dashed border-neutral-200 p-2" />
                            <p className="text-xs text-neutral-400 mt-2">Our team will scan this to admit you.</p>
                        </div>
                    )}

                    <div className="text-center pb-4 border-b border-neutral-100">
                        <p className="text-lg font-bold text-neutral-900">{fullName}</p>
                        {reg.gotra && <p className="text-sm text-neutral-500 mt-0.5">Gotra: {reg.gotra}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                        <div><p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Tier</p><p className="font-semibold text-neutral-900">{category}</p></div>
                        <div><p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Attendees</p><p className="font-semibold text-neutral-900">{reg.attendees_count} Person(s)</p></div>
                    </div>

                    {!isPaid && (
                        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <p className="text-sm text-amber-900 mb-3">
                                {Number(reg.amount_due) > 0
                                    ? `A payment of ₹${Number(reg.amount_due).toLocaleString('en-IN')} is pending to confirm your registration.`
                                    : 'Your registration is not yet confirmed.'}
                            </p>
                            {reg.balance_link_url && (
                                <a href={reg.balance_link_url} className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition">Complete payment</a>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-3 flex items-center justify-between">
                    <p className="text-[10px] text-neutral-400 font-mono">REG #{shortId}</p>
                    <Link href="/" className="text-[11px] text-neutral-400 hover:text-orange-600">BaglaBhairav →</Link>
                </div>
            </div>
        </main>
    );
}
