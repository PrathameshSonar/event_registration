// components/RegisterPageContent.js
// The register page body (tier summary + CheckoutForm). Nav/footer come from the
// (site) layout; this only renders the page content in the luxury theme.
"use client";

import CheckoutForm from './CheckoutForm';
import { useLanguage } from './LanguageProvider';
import { pick } from '@/lib/i18n';

export default function RegisterPageContent({ category, paymentSettings = null }) {
    const { t, lang } = useLanguage();

    const catTitle = pick(category, 'title', lang);
    const catDesc = pick(category, 'description', lang);
    const isEnquiry = category.is_enquiry_only === true;

    return (
        <section className="section-y">
            <div className="container-luxury max-w-2xl">
                <div className="luxury-card p-6 md:p-8 mb-8">
                    <span className="kicker block mb-2">{t('register_selected_category')}</span>
                    <div className="flex justify-between items-start gap-4 mb-3">
                        <h1 className="font-display text-2xl md:text-3xl text-brown">{catTitle}</h1>
                        {category.price > 0 && (
                            <div className="text-right shrink-0">
                                <div className="font-display text-2xl text-vermillion">₹{Number(category.price).toLocaleString('en-IN')}</div>
                                {isEnquiry && <div className="text-[11px] text-brown/40 uppercase tracking-wider">Fee</div>}
                            </div>
                        )}
                    </div>
                    {catDesc && <p className="text-brown/70 text-sm leading-relaxed whitespace-pre-wrap">{catDesc}</p>}
                </div>

                <div className="luxury-card p-6 md:p-8">
                    <h2 className="font-display text-lg text-brown mb-6 border-b border-gold/15 pb-4">{t('register_attendee_info')}</h2>
                    <CheckoutForm category={category} paymentSettings={paymentSettings} />
                </div>
            </div>
        </section>
    );
}
