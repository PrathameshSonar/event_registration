// components/RegisterPageContent.js
// Register page (Emergent structure): a "back to all Sevas" link + header, the
// form on the left, and a sticky "inclusions" summary on the right. Tiers are
// presented as "Seva". Nav/footer come from the (site) layout.
"use client";

import Link from 'next/link';
import { Check, Lock, ArrowLeft } from 'lucide-react';
import CheckoutForm from './CheckoutForm';
import SectionKicker from './site/SectionKicker';
import { useLanguage } from './LanguageProvider';
import { pick } from '@/lib/i18n';

export default function RegisterPageContent({ category, paymentSettings = null, registrationOpen = true }) {
    const { t, lang } = useLanguage();

    const catTitle = pick(category, 'title', lang);
    const catDesc = pick(category, 'description', lang);
    const tagline = pick(category, 'tagline', lang) || category.tagline;
    const perks = Array.isArray(category.perks) ? category.perks : [];
    const isEnquiry = category.is_enquiry_only === true;

    return (
        <section className="section-y">
            <div className="container-luxury max-w-5xl">
                {/* Back + header */}
                <Link href="/registration" className="inline-flex items-center gap-2 text-sm font-semibold text-vermillion hover:text-lotus">
                    <ArrowLeft className="h-4 w-4" /> {t('register_back_all') || 'All Sevas'}
                </Link>
                <div className="mt-4 mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <div>
                        {tagline && <SectionKicker>{tagline}</SectionKicker>}
                        <h1 className="mt-3 display-section text-brown">
                            {t('register_as') || 'Register for'}{' '}
                            <span className="font-cormorant italic text-vermillion">{catTitle}</span>
                        </h1>
                    </div>
                    {category.price > 0 && (
                        <div className="shrink-0">
                            <div className="font-display text-3xl text-vermillion leading-none">₹{Number(category.price).toLocaleString('en-IN')}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-brown/45">{isEnquiry ? (t('category_enquire') || 'Enquiry') : (t('reg_price_note') || 'per Yajmaan · one-time')}</div>
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
                    {/* Form (left) */}
                    <div>
                        {registrationOpen ? (
                            <div className="luxury-card p-4 sm:p-6 md:p-8">
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

                    {/* Inclusions sidebar (right on desktop, below the form on mobile) */}
                    <aside className="lg:sticky lg:top-24 h-fit">
                        <div className="luxury-card overflow-hidden">
                            {category.media_url && (
                                <div className="relative h-40 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={category.media_url} alt={catTitle} loading="lazy" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                                </div>
                            )}
                            <div className="p-6">
                                {tagline && <p className="text-[11px] uppercase tracking-[0.24em] text-mutedgold">{tagline}</p>}
                                <h3 className="mt-1.5 font-display text-2xl text-brown">{catTitle}</h3>
                                {category.price > 0 && (
                                    <p className="mt-3 font-display text-3xl text-vermillion">₹{Number(category.price).toLocaleString('en-IN')}</p>
                                )}
                                {catDesc && <p className="mt-3 text-sm text-brown/70 leading-relaxed whitespace-pre-wrap">{catDesc}</p>}
                                {perks.length > 0 && (
                                    <>
                                        <div className="my-5 h-px bg-gold/20" />
                                        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-mutedgold">{t('register_inclusions') || "What's included"}</p>
                                        <ul className="space-y-3">
                                            {perks.map((p, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-[14px] text-brown/80">
                                                    <Check className="mt-0.5 h-4 w-4 text-vermillion shrink-0" strokeWidth={2.4} />
                                                    <span>{p}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}
