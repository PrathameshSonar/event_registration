// components/Footer.js
"use client";

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { useBranding } from './BrandingProvider';

export default function Footer() {
    const { t } = useLanguage();
    const branding = useBranding();
    return (
        <footer className="bg-neutral-900 text-neutral-400 border-t border-neutral-800 mt-auto">
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                    <div>
                        <h3 className="text-white font-bold text-lg mb-2">{branding.site_name}</h3>
                        <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">
                            {t('footer_tagline')}
                        </p>
                    </div>
                    <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                        <Link href="/" className="hover:text-white transition">{t('footer_home')}</Link>
                        <Link href="/pitham" className="hover:text-white transition">{t('nav_pitham')}</Link>
                        <Link href="/previous-events" className="hover:text-white transition">{t('nav_past_events')}</Link>
                        <Link href="/my-pass" className="hover:text-white transition">{t('footer_find_registration')}</Link>
                        <Link href="/donate" className="hover:text-white transition">{t('footer_donate')}</Link>
                        <Link href="/terms" className="hover:text-white transition">{t('footer_terms')}</Link>
                        <Link href="/privacy" className="hover:text-white transition">{t('footer_privacy')}</Link>
                        <Link href="/refund" className="hover:text-white transition">{t('footer_refund')}</Link>
                    </nav>
                </div>
                <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span>{t('footer_rights')}</span>
                    <span>{t('footer_secured')}</span>
                </div>
            </div>
        </footer>
    );
}
