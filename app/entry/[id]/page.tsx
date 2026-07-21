// app/entry/[id]/page.tsx
// Public entry-pass verification page — shown to event STAFF when they scan a
// registrant's QR. Laid out for a volunteer standing at a gate: the verdict, then
// the Seva name and its wristband colour LARGE (so they grab the right band without
// reading fine print), then how many bands to hand over. Personal details sit below.
// The wristband mapping is set in Settings → Entry Checkpoints (app_settings.entry_bands).
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import { getEntryBands } from '@/lib/settingsServer';
import { BAND_COLORS } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, total_amount, payment_status, phone, gotra, category_id, razorpay_payment_id, payment_method, offline_reference, categories(title)')
        .eq('id', id)
        .single();

    if (!reg) notFound();

    const isPaid = reg.payment_status === 'completed';
    const fullName = [reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(' ');
    const shortId = reg.id.split('-')[0].toUpperCase();
    const categoryTitle = (reg as { categories?: { title?: string } }).categories?.title || '—';

    // Wristband colour for this Seva (unmapped Sevas simply show no band).
    const bands = await getEntryBands();
    const bandKey = reg.category_id ? (bands as Record<string, string>)[reg.category_id] : null;
    const band = bandKey ? BAND_COLORS[bandKey as keyof typeof BAND_COLORS] : null;

    return (
        <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden">
                {/* Verdict */}
                <div className={`p-6 text-center ${isPaid ? 'bg-green-600' : 'bg-red-600'}`}>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">BaglaBhairav Mahotsav</p>
                    <p className="text-white text-3xl font-black">{isPaid ? '✓ VALID' : '✗ INVALID'}</p>
                    <p className="text-white/70 text-xs mt-1">{isPaid ? 'Entry Permitted' : `Status: ${reg.payment_status}`}</p>
                </div>

                {/* What the volunteer acts on: Seva, band colour, how many */}
                {isPaid && (
                    <div className="px-5 pt-5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Seva</p>
                        <p className="text-2xl font-black text-neutral-900 leading-tight mt-1 break-words">{categoryTitle}</p>

                        {band ? (
                            <div
                                className="mt-4 rounded-2xl px-4 py-4 ring-2 ring-black/10"
                                style={{ backgroundColor: band.hex, color: band.text }}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-75">Wristband</p>
                                <p className="text-3xl font-black leading-none mt-1">{band.label}</p>
                            </div>
                        ) : (
                            <p className="mt-3 text-[11px] text-neutral-400">No wristband set for this Seva</p>
                        )}

                        <div className="mt-3 bg-neutral-100 rounded-xl py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Bands to give</p>
                            <p className="text-3xl font-black text-neutral-900 leading-none mt-1">{reg.attendees_count}</p>
                        </div>
                    </div>
                )}

                {/* Details */}
                <div className="p-5 space-y-4">
                    <div className="text-center pb-4 border-b border-neutral-100">
                        <p className="text-xl font-bold text-neutral-900">{fullName}</p>
                        {reg.gotra && <p className="text-sm text-neutral-500 mt-0.5">Gotra: {reg.gotra}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {!isPaid && (
                            <div>
                                <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Category</p>
                                <p className="font-semibold text-neutral-900">{categoryTitle}</p>
                            </div>
                        )}
                        {!isPaid && (
                            <div>
                                <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Attendees</p>
                                <p className="font-semibold text-neutral-900">{reg.attendees_count} Person(s)</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Amount Paid</p>
                            <p className="font-bold text-green-700">₹{reg.total_amount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Phone</p>
                            <p className="font-semibold text-neutral-900">{reg.phone}</p>
                        </div>
                    </div>
                    {reg.razorpay_payment_id ? (
                        <div className="pt-3 border-t border-neutral-100">
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Payment Ref</p>
                            <p className="text-xs font-mono text-neutral-500 break-all">{reg.razorpay_payment_id}</p>
                        </div>
                    ) : reg.payment_method && reg.payment_method !== 'razorpay' ? (
                        <div className="pt-3 border-t border-neutral-100">
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Payment</p>
                            <p className="text-xs text-neutral-600 capitalize">{reg.payment_method.replace('_', ' ')}{reg.offline_reference ? ` · ${reg.offline_reference}` : ''}</p>
                        </div>
                    ) : null}
                </div>

                <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-3 text-center">
                    <p className="text-[10px] text-neutral-400 font-mono">REG #{shortId}</p>
                </div>
            </div>
        </main>
    );
}
