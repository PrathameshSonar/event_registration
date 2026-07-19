// components/RegisterPageContent.js
// The register page body (tier summary + CheckoutForm). Nav/footer come from the
// (site) layout; this only renders the page content in the luxury theme.
"use client";

import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import CheckoutForm from './CheckoutForm';
import { useLanguage } from './LanguageProvider';
import { pick } from '@/lib/i18n';

export default function RegisterPageContent({ category, paymentSettings = null, registrationOpen = true }) {
    const { t, lang } = useLanguage();

    const catTitle = pick(category, 'title', lang);
    const catDesc = pick(category, 'description', lang);
    const perks = Array.isArray(category.perks) ? category.perks : [];
    const isEnquiry = category.is_enquiry_only === true;

    return (
        <section className="section-y">
            <div className="container-luxury max-w-2xl">
                <div className="luxury-card overflow-hidden mb-8">
                    {category.media_url && (
                        <div className="relative h-48 md:h-56 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={category.media_url} alt={catTitle} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                    )}
                    <div className="p-6 md:p-8">
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
                        {perks.length > 0 && (
                            <ul className="mt-5 space-y-2.5 border-t border-gold/15 pt-5">
                                {perks.map((p, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-brown/80">
                                        <Check className="h-4 w-4 text-gold-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                                        <span>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {registrationOpen ? (
                    <div className="luxury-card p-6 md:p-8">
                        <h2 className="font-display text-lg text-brown mb-6 border-b border-gold/15 pb-4">{t('register_attendee_info')}</h2>
                        <CheckoutForm category={category} paymentSettings={paymentSettings} />
                    </div>
                ) : (
                    <div className="luxury-card p-8 md:p-10 text-center">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-vermillion"><Lock className="h-6 w-6" /></span>
                        <h2 className="mt-5 font-display text-2xl text-brown">{t('register_closed_title') || 'Registrations are closed'}</h2>
                        <p className="mt-3 text-brown/65 max-w-md mx-auto">{t('register_closed_desc') || 'Registration for this event is no longer open. Explore the event details or reach out to us for any questions.'}</p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link href="/event" className="btn-gold">{t('nav_event_details') || 'Event Details'}</Link>
                            <Link href="/contact" className="btn-outline-gold">{t('nav_contact') || 'Contact'}</Link>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
