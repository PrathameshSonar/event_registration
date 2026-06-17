// app/entry/[id]/page.tsx
// Public entry-pass verification page — shown to event staff when they scan a registrant's QR.
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EntryPage({ params }: { params: { id: string } }) {
    const { data: reg } = await supabaseAdmin
        .from('registrations')
        .select('id, first_name, last_name, salutation, attendees_count, total_amount, payment_status, phone, gotra, razorpay_payment_id, categories(title)')
        .eq('id', params.id)
        .single();

    if (!reg) notFound();

    const isPaid = reg.payment_status === 'completed';
    const fullName = [reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(' ');
    const shortId = reg.id.split('-')[0].toUpperCase();

    return (
        <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden">
                {/* Status header */}
                <div className={`p-6 text-center ${isPaid ? 'bg-green-600' : 'bg-red-600'}`}>
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">BaglaBhairav Mahotsav</p>
                    <p className="text-white text-3xl font-black">{isPaid ? '✓ VALID' : '✗ INVALID'}</p>
                    <p className="text-white/70 text-xs mt-1">{isPaid ? 'Entry Permitted' : `Status: ${reg.payment_status}`}</p>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                    <div className="text-center pb-4 border-b border-neutral-100">
                        <p className="text-xl font-bold text-neutral-900">{fullName}</p>
                        {reg.gotra && <p className="text-sm text-neutral-500 mt-0.5">Gotra: {reg.gotra}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Category</p>
                            <p className="font-semibold text-neutral-900">{(reg as any).categories?.title || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Attendees</p>
                            <p className="font-semibold text-neutral-900">{reg.attendees_count} Person(s)</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Amount Paid</p>
                            <p className="font-bold text-green-700">₹{reg.total_amount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Phone</p>
                            <p className="font-semibold text-neutral-900">{reg.phone}</p>
                        </div>
                    </div>
                    {reg.razorpay_payment_id && (
                        <div className="pt-3 border-t border-neutral-100">
                            <p className="text-xs text-neutral-400 uppercase font-bold mb-0.5">Payment Ref</p>
                            <p className="text-xs font-mono text-neutral-500 break-all">{reg.razorpay_payment_id}</p>
                        </div>
                    )}
                </div>

                <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-3 text-center">
                    <p className="text-[10px] text-neutral-400 font-mono">REG #{shortId}</p>
                </div>
            </div>
        </main>
    );
}
