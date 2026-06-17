// components/RegisterPageContent.js
// Client Component — wraps the register page, handles language switching.
"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import CheckoutForm from './CheckoutForm';
import { useLanguage } from './LanguageProvider';
import LangToggle from './LangToggle';

export default function RegisterPageContent({ category }) {
    const { t, lang } = useLanguage();

    const catTitle = lang === 'hi' ? (category.title_hi || category.title) : category.title;
    const catDesc = lang === 'hi' ? (category.description_hi || category.description) : category.description;
    const isEnquiry = category.is_enquiry_only === true;

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">

                <div className="flex justify-between items-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition">
                        <ArrowLeft className="w-4 h-4" />
                        {t('register_back')}
                    </Link>
                    <LangToggle />
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-6 md:p-8 mb-8">
                    <span className="text-xs uppercase tracking-wider font-semibold text-orange-600 block mb-1">
                        {t('register_selected_category')}
                    </span>
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <h2 className="text-2xl font-bold">{catTitle}</h2>
                        {!isEnquiry && <div className="text-2xl font-black text-neutral-900">₹{category.price}</div>}
                    </div>
                    <p className="text-neutral-600 text-sm leading-relaxed">{catDesc}</p>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-6 md:p-8">
                    <h3 className="text-lg font-bold mb-6 border-b border-neutral-100 pb-4">
                        {t('register_attendee_info')}
                    </h3>
                    <CheckoutForm category={category} />
                </div>
            </div>
        </main>
    );
}
