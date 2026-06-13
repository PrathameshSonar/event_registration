// app/register/[id]/page.js
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CheckoutForm from '@/components/CheckoutForm';

export default async function RegisterPage({ params }) {
    const { id } = await params;

    const { data: category, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !category) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">

                <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-8 transition">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Event Details
                </Link>

                <div className="bg-white border border-neutral-200 rounded-xl p-6 md:p-8 mb-8">
                    <span className="text-xs uppercase tracking-wider font-semibold text-orange-600 block mb-1">
                        Selected Category
                    </span>
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <h2 className="text-2xl font-bold">{category.title}</h2>
                        <div className="text-2xl font-black text-neutral-900">₹{category.price}</div>
                    </div>
                    <p className="text-neutral-600 text-sm leading-relaxed">{category.description}</p>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-6 md:p-8">
                    <h3 className="text-lg font-bold mb-6 border-b border-neutral-100 pb-4">
                        Attendee Information
                    </h3>

                    {/* We insert our new interactive component here! */}
                    <CheckoutForm category={category} />

                </div>
            </div>
        </main>
    );
}