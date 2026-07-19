// app/(site)/pitham/page.tsx — nav/footer come from the (site) layout.
"use client";

import { Compass, Grid, Layers } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import Reveal from '@/components/site/Reveal';
import SectionKicker from '@/components/site/SectionKicker';

export default function PithamPage() {
  const { t } = useLanguage();
  const cards = [
    { Icon: Grid, title: t('pitham_card1_title'), desc: t('pitham_card1_desc') },
    { Icon: Compass, title: t('pitham_card2_title'), desc: t('pitham_card2_desc') },
    { Icon: Layers, title: t('pitham_card3_title'), desc: t('pitham_card3_desc') },
  ];

  return (
    <section className="section-y mandala-bg">
      <div className="container-luxury">
        <Reveal className="max-w-3xl">
          <SectionKicker>{t('pitham_tagline')}</SectionKicker>
          <h1 className="mt-5 display-section text-brown">{t('pitham_title')}</h1>
          <p className="mt-6 text-brown/75 leading-[1.8] max-w-2xl" style={{ fontSize: '1.075rem' }}>{t('pitham_desc')}</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <Reveal key={i} delay={i * 80}>
              <article className="luxury-card h-full p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400/20 to-lotus/15 text-vermillion">
                  <c.Icon className="w-5 h-5" strokeWidth={1.7} />
                </div>
                <h3 className="mt-5 font-display text-xl text-brown">{c.title}</h3>
                <p className="mt-2 text-brown/70 leading-[1.8] text-[15px]">{c.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div className="mt-14 relative overflow-hidden rounded-[28px] bg-[hsl(30,25%,12%)] text-ivory p-8 md:p-12 shadow-luxury-lg grain">
            <div className="absolute right-0 bottom-0 opacity-[0.06] pointer-events-none translate-x-1/4 translate-y-1/4">
              <Grid className="w-96 h-96" />
            </div>
            <div className="max-w-2xl relative z-10">
              <h3 className="font-display text-2xl md:text-3xl text-ivory">{t('pitham_tech_title')}</h3>
              <p className="mt-4 text-ivory/70 leading-relaxed">{t('pitham_tech_desc')}</p>
              <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div>
                  <span className="block text-xs font-mono text-gold-400/80 uppercase tracking-wider mb-1">{t('pitham_tech_scale_label')}</span>
                  <span className="text-lg font-bold text-ivory">{t('pitham_tech_scale_value')}</span>
                </div>
                <div>
                  <span className="block text-xs font-mono text-gold-400/80 uppercase tracking-wider mb-1">{t('pitham_tech_boundary_label')}</span>
                  <span className="text-lg font-bold text-ivory">{t('pitham_tech_boundary_value')}</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
