// components/admin/PersonDonations.tsx
// "Other payments from this person" inside the registration detail modal.
// Standalone /donate contributions carry no foreign key to a registration, so they
// are matched on identity (phone last-10 / email) by /api/admin/person-payments.
// Self-contained: fetches on mount and renders nothing at all when there's nothing
// to show — including for a volunteer, whose 403 is treated as "no section".
"use client";

import { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';

interface Donation {
    id: string;
    name: string | null;
    amount: number;
    status: string;
    message: string | null;
    razorpay_payment_id: string | null;
    created_at: string;
}

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function PersonDonations({ regId }: { regId: string }) {
    const [donations, setDonations] = useState<Donation[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch(`/api/admin/person-payments?regId=${encodeURIComponent(regId)}`);
                const d = await res.json().catch(() => ({}));
                if (!alive) return;
                if (res.ok) { setDonations(d.donations || []); setTotal(d.totalDonated || 0); }
            } catch { /* section just stays hidden */ }
            if (alive) setLoading(false);
        })();
        return () => { alive = false; };
    }, [regId]);

    if (loading || donations.length === 0) return null;

    return (
        <div className="col-span-1 md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-rose-500" /> Seva contributions from this person
            </h3>
            <p className="text-xs text-neutral-500 mb-2">
                Standalone donations matched by phone or email — <strong className="text-rose-700">{inr(total)}</strong> received
                across {donations.length} contribution{donations.length === 1 ? '' : 's'}. Separate from this registration&rsquo;s amount.
            </p>
            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100">
                {donations.map((d) => (
                    <div key={d.id} className="px-3 py-2 flex items-center justify-between gap-3 flex-wrap text-sm">
                        <div className="min-w-0">
                            <span className="font-bold text-neutral-900">{inr(d.amount)}</span>
                            <span className={`ml-2 text-[11px] font-semibold ${d.status === 'completed' ? 'text-green-700' : 'text-amber-700'}`}>
                                {d.status}
                            </span>
                            {d.message && <p className="text-[11px] text-neutral-500 truncate">&ldquo;{d.message}&rdquo;</p>}
                        </div>
                        <div className="text-[11px] text-neutral-400 text-right">
                            {new Date(d.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {d.razorpay_payment_id && <span className="block font-mono break-all">{d.razorpay_payment_id}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
