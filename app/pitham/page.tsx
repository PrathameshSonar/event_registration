// app/pitham/page.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Compass, Grid, Layers, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import LangToggle from '@/components/LangToggle';

export default function PithamPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100">

      {/* HEADER */}
      <header className="bg-white border-b border-neutral-200 py-6 px-4 md:px-8 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t('nav_brand')}</h1>
            </Link>
          </div>
          <nav className="flex items-center gap-4 md:gap-6 text-sm font-medium text-neutral-600">
            <Link href="/" className="hover:text-orange-600 transition hidden md:block">{t('nav_home_link')}</Link>
            <Link href="/pitham" className="text-orange-600 transition font-semibold hidden md:block">{t('nav_pitham')}</Link>
            <LangToggle />
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-8 transition group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t('pitham_back')}
        </Link>

        <span className="text-orange-600 font-bold tracking-widest uppercase text-xs mb-3 block">
          {t('pitham_tagline')}
        </span>
        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-neutral-950 leading-tight">
          {t('pitham_title')}
        </h2>
        <p className="text-base text-neutral-600 md:text-lg max-w-3xl mb-12 leading-relaxed">
          {t('pitham_desc')}
        </p>

        {/* GEOMETRIC MATRIX GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

          <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:border-neutral-400 transition shadow-sm">
            <div className="w-10 h-10 bg-neutral-100 text-neutral-900 rounded-lg flex items-center justify-center mb-4 border border-neutral-200">
              <Grid className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-neutral-900">{t('pitham_card1_title')}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{t('pitham_card1_desc')}</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:border-neutral-400 transition shadow-sm">
            <div className="w-10 h-10 bg-neutral-100 text-neutral-900 rounded-lg flex items-center justify-center mb-4 border border-neutral-200">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-neutral-900">{t('pitham_card2_title')}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{t('pitham_card2_desc')}</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:border-neutral-400 transition shadow-sm">
            <div className="w-10 h-10 bg-neutral-100 text-neutral-900 rounded-lg flex items-center justify-center mb-4 border border-neutral-200">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-neutral-900">{t('pitham_card3_title')}</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">{t('pitham_card3_desc')}</p>
          </div>

        </div>

        {/* TECHNICAL REFERENCE BOARD */}
        <div className="bg-neutral-900 text-white rounded-2xl p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-1/4 translate-y-1/4">
            <Grid className="w-96 h-96" />
          </div>

          <div className="max-w-2xl relative z-10">
            <h3 className="text-xl md:text-2xl font-bold mb-4 tracking-tight">{t('pitham_tech_title')}</h3>
            <p className="text-sm md:text-base text-neutral-400 mb-8 leading-relaxed">
              {t('pitham_tech_desc')}
            </p>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-neutral-800">
              <div>
                <span className="block text-xs font-mono text-neutral-500 uppercase tracking-wider mb-1">{t('pitham_tech_scale_label')}</span>
                <span className="text-lg font-bold text-neutral-200">{t('pitham_tech_scale_value')}</span>
              </div>
              <div>
                <span className="block text-xs font-mono text-neutral-500 uppercase tracking-wider mb-1">{t('pitham_tech_boundary_label')}</span>
                <span className="text-lg font-bold text-neutral-200">{t('pitham_tech_boundary_value')}</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 bg-white py-8 text-center text-xs text-neutral-400">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <ShieldCheck className="w-4 h-4 text-neutral-500" />
          <span className="font-medium text-neutral-600">{t('pitham_footer_brand')}</span>
        </div>
        <p>{t('pitham_footer_copy')}</p>
      </footer>

    </main>
  );
}
