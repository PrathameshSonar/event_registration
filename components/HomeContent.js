// components/HomeContent.js
// Client Component — receives server-fetched data, handles language switching.
"use client";

import { Fragment } from 'react';
import { Calendar, MapPin, Image as ImageIcon, Video, AlertCircle, Clock, Phone, Radio, Newspaper } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { pick } from '@/lib/i18n';
import { youtubeEmbedUrl } from '@/lib/youtube';
import LangToggle from './LangToggle';
import Footer from './Footer';
import YouTubeEmbed from './YouTubeEmbed';
import Countdown from './Countdown';
import FloatingActions from './FloatingActions';
import AddToCalendar from './AddToCalendar';
import ShareButtons from './ShareButtons';
import { ageLimitLabel } from '@/lib/age';
import FaqAccordion from './FaqAccordion';
import Reveal from './Reveal';
import WaitlistModal from './WaitlistModal';
import { useState } from 'react';

// Brand icons — lucide dropped these (trademark), so inline the marks (CSP-safe).
const InstagramIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
);
const FacebookIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
);
const YoutubeIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
);

// Shown when the admin hasn't added ritual highlights yet — keeps the page rich out of the box.
// Curated fallback ritual cards (shown when the admin hasn't added any).
// title/desc are keyed by language code so a new language just needs its entry.
const DEFAULT_HIGHLIGHTS = [
    { icon: '🔥', title: { en: 'Havan & Yagna', hi: 'हवन एवं यज्ञ', mr: 'हवन व यज्ञ' }, desc: { en: 'Sacred fire rituals for purification and blessings', hi: 'शुद्धि एवं आशीर्वाद हेतु पावन अग्नि अनुष्ठान', mr: 'शुद्धी व आशीर्वादासाठी पवित्र अग्नी विधी' } },
    { icon: '🪔', title: { en: 'Maha Aarti', hi: 'महा आरती', mr: 'महा आरती' }, desc: { en: 'Grand evening aarti with lamps and devotional chants', hi: 'दीपों एवं भक्ति गीतों के साथ भव्य संध्या आरती', mr: 'दीप व भक्तिगीतांसह भव्य संध्या आरती' } },
    { icon: '🌺', title: { en: 'Abhishekam', hi: 'अभिषेकम्', mr: 'अभिषेक' }, desc: { en: 'Ceremonial bathing of the deity with sacred offerings', hi: 'पावन सामग्री से देव का अभिषेक', mr: 'पवित्र सामग्रीने देवाचा अभिषेक' } },
    { icon: '🍲', title: { en: 'Annadān (Bhandara)', hi: 'अन्नदान (भंडारा)', mr: 'अन्नदान (भंडारा)' }, desc: { en: 'Community feast — prasad served to all devotees', hi: 'सामुदायिक भोज — सभी भक्तों हेतु प्रसाद', mr: 'सामुदायिक भोजन — सर्व भक्तांसाठी प्रसाद' } },
    { icon: '🎶', title: { en: 'Bhajan Sandhya', hi: 'भजन संध्या', mr: 'भजन संध्या' }, desc: { en: 'An evening of soul-stirring devotional music', hi: 'मनमोहक भक्ति संगीत की संध्या', mr: 'मनमोहक भक्तिसंगीताची संध्या' } },
    { icon: '📿', title: { en: 'Pravachan', hi: 'प्रवचन', mr: 'प्रवचन' }, desc: { en: 'Spiritual discourses by revered saints', hi: 'पूज्य संतों द्वारा आध्यात्मिक प्रवचन', mr: 'पूज्य संतांकडून आध्यात्मिक प्रवचन' } },
];

export default function HomeContent({ pageData, categories, mediaItems, seatsTaken, schedule, highlights, faqs, guests, news, registeredCount }) {
    schedule = schedule || [];
    highlights = highlights || [];
    guests = guests || [];
    faqs = faqs || [];
    news = news || [];
    const { t, lang } = useLanguage();
    const [waitlistCat, setWaitlistCat] = useState(null);

    // Live only when the admin has BOTH flipped the switch and saved a URL —
    // otherwise the section would render an empty player.
    const isLive = !!(pageData?.livestream_is_live && pageData?.livestream_url);
    const liveEmbed = isLive ? youtubeEmbedUrl(pageData.livestream_url) : null;

    const eventTitle = pick(pageData, 'title', lang) || t('hero_event_fallback');
    const eventDesc = pick(pageData, 'short_description', lang) || t('hero_desc_fallback');
    const displayDate = pick(pageData, 'date_time', lang) || t('hero_dates');
    const displayVenue = pick(pageData, 'venue', lang) || t('hero_venue');

    const mapUrl = pageData?.map_url || null;
    const travelInfo = pick(pageData, 'travel_info', lang);

    const socialLinks = [
        { key: 'instagram', href: pageData?.instagram_url, label: 'Instagram', Icon: InstagramIcon },
        { key: 'facebook', href: pageData?.facebook_url, label: 'Facebook', Icon: FacebookIcon },
        { key: 'youtube', href: pageData?.youtube_url, label: 'YouTube', Icon: YoutubeIcon },
        { key: 'maps', href: mapUrl, label: 'Location', Icon: MapPin },
    ].filter((s) => s.href);
    const hasSocials = socialLinks.length > 0;

    const getCatTitle = (cat) => pick(cat, 'title', lang);
    const getCatDesc = (cat) => pick(cat, 'description', lang);

    const galleryImages = mediaItems?.filter(item => item.media_type === 'image') || [];
    const youtubeVideos = mediaItems?.filter(item => item.media_type === 'youtube') || [];

    const hasCategories = Array.isArray(categories) && categories.length > 0;
    const aboutText = pick(pageData, 'long_description', lang);

    // Ritual highlights: admin-defined if present, otherwise a curated default set.
    const hl = (highlights && highlights.length)
        ? highlights.map(h => ({
            icon: h.icon || '🪔',
            title: pick(h, 'title', lang),
            desc: pick(h, 'description', lang),
          }))
        : DEFAULT_HIGHLIGHTS.map(h => ({
            icon: h.icon,
            title: h.title[lang] || h.title.en,
            desc: h.desc[lang] || h.desc.en,
          }));

    return (
        <main className="min-h-screen bg-ivory text-neutral-900 font-sans selection:bg-gold-100 pb-20 md:pb-0">

            {/* HEADER */}
            <header className="bg-white/90 border-b border-gold-200/70 sticky top-0 z-50 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center py-4 md:py-6">
                        <h1 className="font-serif text-xl font-bold tracking-tight text-neutral-900">{t('nav_brand')}</h1>
                        <nav className="flex items-center gap-4 md:gap-6 text-sm font-medium text-neutral-600">
                            <Link href="/" className="text-orange-600 transition font-semibold hidden md:block border-b-2 border-gold-400 pb-0.5">{t('nav_event_details')}</Link>
                            <Link href="/pitham" className="hover:text-orange-600 transition hidden md:block">{t('nav_pitham')}</Link>
                            <Link href="/previous-events" className="hover:text-orange-600 transition hidden md:block">{t('nav_past_events')}</Link>
                            <Link href="#categories" className="hover:text-orange-600 transition hidden md:block">{t('nav_register')}</Link>
                            <LangToggle />
                        </nav>
                    </div>
                    {/* Mobile-only scrollable sub-nav */}
                    <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-3 border-t border-neutral-100 pt-2 scrollbar-hide">
                        <Link href="/" className="flex-shrink-0 text-xs font-semibold text-white bg-orange-600 px-3 py-1.5 rounded-full whitespace-nowrap">{t('nav_event_details')}</Link>
                        <Link href="/pitham" className="flex-shrink-0 text-xs font-medium text-neutral-600 border border-neutral-200 bg-neutral-50 px-3 py-1.5 rounded-full whitespace-nowrap">{t('nav_pitham')}</Link>
                        <Link href="/previous-events" className="flex-shrink-0 text-xs font-medium text-neutral-600 border border-neutral-200 bg-neutral-50 px-3 py-1.5 rounded-full whitespace-nowrap">{t('nav_past_events')}</Link>
                        <Link href="#categories" className="flex-shrink-0 text-xs font-semibold text-orange-600 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-full whitespace-nowrap">{t('nav_register')}</Link>
                    </div>
                </div>
            </header>

            {/* HERO — devotional */}
            <section className="relative overflow-hidden bg-gradient-to-b from-orange-700 via-orange-600 to-amber-700 text-white">
                {/* Optional admin hero image with a dark overlay for legibility */}
                {pageData?.hero_image_url && (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pageData.hero_image_url} alt="" className="pointer-events-none absolute inset-0 w-full h-full object-cover" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-orange-900/80 via-orange-800/70 to-amber-800/80" />
                    </>
                )}
                {/* Decorative motifs */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
                <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-orange-900/30 blur-3xl" />

                <div className="relative max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
                    <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight drop-shadow-sm">
                        {eventTitle}
                    </h2>
                    <p className="text-sm md:text-lg text-amber-50/90 max-w-2xl mx-auto mb-6 leading-relaxed">
                        {eventDesc}
                    </p>

                    {/* Date + venue */}
                    <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-10 text-amber-50 mb-7 font-medium text-sm">
                        <div className="flex items-center justify-center gap-2">
                            <Calendar className="w-5 h-5 text-amber-200" />
                            <span>{displayDate}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <MapPin className="w-5 h-5 text-amber-200" />
                            {mapUrl ? (
                                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline transition">{displayVenue}</a>
                            ) : (
                                <span>{displayVenue}</span>
                            )}
                        </div>
                    </div>

                    {/* Countdown */}
                    {pageData?.start_at && (
                        <div className="mb-7">
                            <Countdown startAt={pageData.start_at} />
                        </div>
                    )}

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                        {hasCategories && (
                            <a href="#categories" className="inline-block bg-white text-orange-700 font-bold px-7 py-3 rounded-xl shadow-lg ring-1 ring-gold-300 hover:bg-gold-50 hover:scale-[1.02] transition text-sm md:text-base">
                                🪔 {t('hero_register_cta')}
                            </a>
                        )}
                        {schedule.length > 0 && (
                            <a href="#schedule" className="inline-block bg-white/10 border border-white/30 backdrop-blur-sm text-white font-bold px-7 py-3 rounded-xl hover:bg-white/20 transition text-sm md:text-base">
                                {t('hero_view_schedule')}
                            </a>
                        )}
                    </div>

                    {/* Add to calendar + share — one row */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                        <AddToCalendar title={eventTitle} startAt={pageData?.start_at} endAt={pageData?.end_at} location={displayVenue} details={eventDesc} />
                        <ShareButtons title={eventTitle} />
                    </div>

                    <p className="text-amber-100/70 text-xs md:text-sm mt-6 italic">{t('hero_blessing')}</p>
                </div>

                {/* Wave divider */}
                <div className="relative">
                    <svg viewBox="0 0 1440 60" className="w-full h-[40px] md:h-[60px] block" preserveAspectRatio="none">
                        <path fill="#fafafa" d="M0,32L48,37.3C96,43,192,53,288,53.3C384,53,480,43,576,37.3C672,32,768,32,864,37.3C960,43,1056,53,1152,50.7C1248,48,1344,32,1392,24L1440,16L1440,60L0,60Z" />
                    </svg>
                </div>
            </section>

            {/* ABOUT THE MAHOTSAV */}
            {/* LIVE STREAM — only while the admin has actually gone live. Placed high
                on the page because it's time-critical: if it's on, it's the reason
                someone is visiting right now. */}
            {isLive && (
                <section id="livestream" className="scroll-mt-4 bg-neutral-900 py-10 md:py-14 border-b border-neutral-800">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="text-center mb-6">
                            <span className="inline-flex items-center gap-2 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> {t('live_now')}
                            </span>
                            <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-white mt-3 flex items-center justify-center gap-2">
                                <Radio className="w-5 h-5 text-rose-500" /> {t('section_live_title')}
                            </h3>
                            <p className="text-neutral-400 text-sm mt-2">{t('section_live_desc')}</p>
                        </div>
                        <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-700 shadow-2xl" style={{ paddingTop: '56.25%' }}>
                            <iframe
                                src={liveEmbed}
                                title={t('section_live_title')}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* NEWS & ANNOUNCEMENTS */}
            {news.length > 0 && (
                <Reveal>
                <section className="bg-white py-10 md:py-14 border-b border-gold-100/70">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center mb-8">
                            <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-neutral-900 flex items-center justify-center gap-2">
                                <Newspaper className="w-5 h-5 text-orange-600" /> {t('section_news_title')}
                            </h3>
                            <div className="gold-divider"><span /></div>
                            <p className="text-neutral-500 text-sm mt-3">{t('section_news_desc')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {news.map((n) => {
                                const title = pick(n, 'title', lang);
                                const body = pick(n, 'body', lang);
                                return (
                                    <article key={n.id} className="rounded-2xl border border-gold-100 bg-ivory overflow-hidden hover:shadow-warm hover:border-gold-200 transition flex flex-col">
                                        {n.image_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={n.image_url} alt="" className="w-full h-40 object-cover" />
                                        )}
                                        <div className="p-5 flex-1">
                                            {n.published_at && (
                                                <time className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">
                                                    {new Date(n.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </time>
                                            )}
                                            <h4 className="font-bold text-neutral-900 mt-1.5 mb-1.5 text-sm md:text-base leading-snug">{title}</h4>
                                            {body && <p className="text-neutral-500 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{body}</p>}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>
                </Reveal>
            )}

            {aboutText && (
                <Reveal>
                <section className="bg-gold-50/40 py-10 md:py-14 border-b border-gold-100/70">
                    <div className="max-w-3xl mx-auto px-4 text-center">
                        <span className="text-3xl">🙏</span>
                        <h3 className="font-serif text-xl md:text-2xl font-bold mt-3 mb-2 tracking-tight text-neutral-900">{t('section_about_title')}</h3>
                        <div className="gold-divider mb-4"><span /></div>
                        <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">{aboutText}</p>
                    </div>
                </section>
                </Reveal>
            )}

            {/* SACRED RITUALS & HIGHLIGHTS */}
            <Reveal>
            <section className="bg-white py-10 md:py-14 border-b border-gold-100/70">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('section_highlights_title')}</h3>
                        <div className="gold-divider"><span /></div>
                        <p className="text-neutral-500 text-sm mt-3">{t('section_highlights_desc')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {hl.map((h, i) => (
                            <div key={i} className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-amber-50/40 p-5 text-center hover:shadow-md hover:border-orange-200 transition">
                                <div className="text-3xl mb-2.5">{h.icon}</div>
                                <h4 className="font-bold text-neutral-900 mb-1 text-sm md:text-base">{h.title}</h4>
                                {h.desc && <p className="text-neutral-500 text-xs md:text-sm leading-relaxed">{h.desc}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            </Reveal>

            {/* GUEST / ARTIST LINEUP */}
            {guests.length > 0 && (
                <Reveal>
                <section className="bg-gold-50/40 py-10 md:py-14 border-b border-gold-100/70">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center mb-8">
                            <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('section_lineup_title')}</h3>
                            <div className="gold-divider"><span /></div>
                            <p className="text-neutral-500 text-sm mt-3">{t('section_lineup_desc')}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {guests.map((g) => {
                                const gName = pick(g, 'name', lang);
                                const gRole = pick(g, 'role', lang);
                                const gBio = pick(g, 'bio', lang);
                                return (
                                    <div key={g.id} className="text-center">
                                        {g.photo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={g.photo_url} alt={gName} className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover mx-auto shadow-md ring-2 ring-orange-100" />
                                        ) : (
                                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mx-auto text-3xl">🙏</div>
                                        )}
                                        <h4 className="font-bold text-neutral-900 mt-3 text-sm md:text-base">{gName}</h4>
                                        {gRole && <p className="text-orange-600 text-xs font-semibold">{gRole}</p>}
                                        {gBio && <p className="text-neutral-500 text-xs mt-1 leading-relaxed">{gBio}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
                </Reveal>
            )}

            {/* PROGRAMME SCHEDULE */}
            {schedule.length > 0 && (
                <Reveal>
                <section id="schedule" className="bg-gradient-to-b from-amber-50/40 to-white py-10 md:py-14 border-b border-gold-100/70">
                    <div className="max-w-3xl mx-auto px-4">
                        <div className="text-center mb-8">
                            <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('section_schedule_title')}</h3>
                            <div className="gold-divider"><span /></div>
                            <p className="text-neutral-500 text-sm mt-3">{t('section_schedule_desc')}</p>
                        </div>
                        <div className="space-y-3">
                            {(() => {
                                let lastDay = null;
                                return schedule.map((s) => {
                                    const sTitle = pick(s, 'title', lang);
                                    const sDay = pick(s, 'day_label', lang);
                                    const showDay = sDay && sDay !== lastDay;
                                    lastDay = sDay;
                                    return (
                                        <Fragment key={s.id}>
                                            {showDay && (
                                                <div className="flex items-center gap-3 pt-4 first:pt-0">
                                                    <span className="text-sm font-bold uppercase tracking-wider text-orange-700 whitespace-nowrap">{sDay}</span>
                                                    <span className="flex-1 h-px bg-orange-200" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-4 bg-white border border-neutral-200 rounded-xl p-4 hover:border-orange-200 hover:shadow-sm transition">
                                                <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 text-center">
                                                    <Clock className="w-4 h-4 text-orange-500 mb-1" />
                                                    <span className="text-xs font-bold text-orange-700">{s.time_label || '—'}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 border-l border-neutral-100 pl-4">
                                                    <p className="font-semibold text-neutral-900">{sTitle}</p>
                                                </div>
                                            </div>
                                        </Fragment>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </section>
                </Reveal>
            )}

            {/* REGISTRATION CATEGORIES */}
            <section id="categories" className="bg-white py-12 md:py-16 border-t border-gold-100/70">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-9">
                        <h3 className="font-serif text-xl md:text-2xl font-bold mb-1 tracking-tight">{t('section_categories_title')}</h3>
                        <div className="gold-divider mb-3"><span /></div>
                        <p className="text-neutral-500 text-sm">{t('section_categories_desc')}</p>
                    </div>

                    {(!categories || categories.length === 0) ? (
                        <div className="text-center py-16 bg-neutral-50 rounded-2xl border border-neutral-200 px-6">
                            <p className="text-5xl mb-5">🎵</p>
                            <h4 className="text-2xl font-bold text-neutral-700 mb-2">Registrations Opening Soon</h4>
                            {pageData?.title && (
                                <p className="text-lg font-semibold text-neutral-800 mt-3">{pageData.title}</p>
                            )}
                            {pageData?.date_time && (
                                <p className="text-neutral-500 text-sm mt-2">📅 {pageData.date_time}</p>
                            )}
                            {pageData?.venue && (
                                <p className="text-neutral-500 text-sm mt-1">📍 {pageData.venue}</p>
                            )}
                            <p className="text-neutral-400 text-sm mt-4">Check back here when registration begins</p>
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {categories.map((category) => {
                            const taken = seatsTaken[category.id] || 0;
                            const max = category.max_capacity || 0;
                            const isCapacityEnforced = max > 0;
                            const remaining = Math.max(0, max - taken);
                            const isEffectivelyFull = category.is_full || (isCapacityEnforced && remaining === 0);

                            return (
                                <div key={category.id} className="border border-gold-200/60 rounded-2xl p-5 md:p-6 shadow-warm hover:shadow-lg hover:border-gold-300 transition flex flex-col justify-between bg-white relative overflow-hidden">

                                    {isCapacityEnforced && category.show_availability && !isEffectivelyFull && (
                                        <div className="absolute top-0 right-0 bg-gold-100 text-gold-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-b border-l border-gold-200 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {t('category_seats_left', remaining)}
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-lg font-bold mb-2 text-neutral-900 mt-2">{getCatTitle(category)}</h4>
                                        <div className="text-2xl md:text-3xl font-black mb-3 text-orange-600">
                                            {category.price > 0 ? `₹${category.price.toLocaleString('en-IN')}` : t('category_enquire_price')}
                                        </div>
                                        <p className="text-neutral-600 mb-4 text-sm leading-relaxed whitespace-pre-wrap">
                                            {getCatDesc(category)}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {category.show_emi_badge && !category.is_enquiry_only && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1">💳 EMI available</span>
                                            )}
                                            {category.allow_part_payment && !category.is_enquiry_only && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">◐ Part payment ({category.advance_percent || 25}% advance)</span>
                                            )}
                                            {ageLimitLabel(category) && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">🎂 {ageLimitLabel(category)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {isEffectivelyFull ? (
                                        <div className="space-y-2">
                                            <div className="w-full text-center bg-neutral-100 text-neutral-400 font-semibold py-3 rounded-xl border border-neutral-200 cursor-not-allowed text-sm">
                                                {t('category_full')}
                                            </div>
                                            <button onClick={() => setWaitlistCat(category)} className="w-full text-center bg-white border border-orange-300 text-orange-700 font-semibold py-2.5 rounded-xl hover:bg-orange-50 transition text-sm">
                                                🔔 {t('category_join_waitlist')}
                                            </button>
                                        </div>
                                    ) : (
                                        <Link href={`/register/${category.id}`} className="w-full text-center bg-neutral-900 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition text-sm block">
                                            {category.is_enquiry_only ? t('category_enquire') : t('category_register')}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>
            </section>

            {/* FAQ */}
            <Reveal><FaqAccordion faqs={faqs} /></Reveal>

            {/* MEDIA */}
            {mediaItems && mediaItems.length > 0 && (
                <section className="bg-gold-50/50 py-12 md:py-16 border-t border-gold-100/70">
                    <div className="max-w-5xl mx-auto px-4">

                        {youtubeVideos.length > 0 && (
                            <div className="mb-12">
                                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                                    <Video className="w-5 h-5 text-orange-600" />
                                    <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight">{t('section_videos')}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {youtubeVideos.map((video) => (
                                        <div key={video.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                                            <div className="aspect-video w-full">
                                                <YouTubeEmbed url={video.url} title={video.caption || 'YouTube Video'} />
                                            </div>
                                            {video.caption && <div className="p-3 bg-white border-t"><p className="text-xs font-semibold text-neutral-800">{video.caption}</p></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {galleryImages.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                                    <ImageIcon className="w-5 h-5 text-orange-600" />
                                    <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight">{t('section_gallery')}</h3>
                                </div>
                                <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
                                    {galleryImages.map((image) => (
                                        <div key={image.id} className="break-inside-avoid bg-white border rounded-xl overflow-hidden shadow-sm group hover:border-neutral-400 transition">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={image.url} alt={image.caption || 'Gallery'} className="w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            {image.caption && <div className="p-3 bg-white border-t text-xs font-medium text-neutral-600">{image.caption}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </section>
            )}

            {/* VENUE (compact) */}
            {displayVenue && (
                <Reveal>
                <section className="bg-white py-10 border-t border-gold-100/70">
                    <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                            <h3 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-600" /> {t('section_venue_title')}</h3>
                            <p className="text-neutral-600 text-sm mt-2">{displayVenue}</p>
                            {mapUrl && (
                                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 bg-neutral-900 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
                                    <MapPin className="w-4 h-4" /> {t('venue_directions')}
                                </a>
                            )}
                        </div>
                        <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
                            <iframe
                                title="Venue map"
                                src={`https://www.google.com/maps?q=${encodeURIComponent(displayVenue)}&output=embed`}
                                className="w-full h-44 border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>
                </section>
                </Reveal>
            )}

            {/* PLAN YOUR VISIT — travel / parking / stay */}
            {travelInfo && (
                <Reveal>
                <section className="bg-gold-50/40 py-10 md:py-14 border-t border-gold-100/70">
                    <div className="max-w-3xl mx-auto px-4 text-center">
                        <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-neutral-900 flex items-center justify-center gap-2"><MapPin className="w-5 h-5 text-orange-600" /> {t('section_travel_title')}</h3>
                        <div className="gold-divider"><span /></div>
                        <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base mt-4 text-left">{travelInfo}</p>
                    </div>
                </section>
                </Reveal>
            )}

            {/* SEVA / DONATE CTA */}
            <Reveal>
            <section className="bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 text-white">
                <div className="max-w-3xl mx-auto px-4 py-10 md:py-12 text-center">
                    <div className="text-3xl mb-2">🪔</div>
                    <h3 className="font-serif text-xl md:text-2xl font-bold">{t('section_seva_title')}</h3>
                    <p className="text-amber-50/90 text-sm mt-2 mb-6 max-w-md mx-auto">{t('section_seva_desc')}</p>
                    <Link href="/donate" className="inline-block bg-white text-orange-700 font-bold px-7 py-3 rounded-xl shadow-lg ring-1 ring-gold-300 hover:bg-gold-50 hover:scale-[1.02] transition text-sm">
                        🙏 {t('section_seva_cta')}
                    </Link>
                </div>
            </section>
            </Reveal>

            {/* CONTACT US — small block, kept last */}
            {(hasSocials || pageData?.contact_phone) && (
                <Reveal>
                <section className="bg-white py-10 md:py-14 border-t border-gold-100/70">
                    <div className="max-w-lg mx-auto px-4 text-center">
                        <h3 className="font-serif text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('contact_us_title')}</h3>
                        <div className="gold-divider"><span /></div>
                        <p className="text-neutral-500 text-sm mt-3 mb-6">{t('contact_us_desc')}</p>

                        {pageData?.contact_phone && (
                            <a href={`tel:${pageData.contact_phone}`} className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition mb-6">
                                <Phone className="w-4 h-4" /> {pageData.contact_phone}
                            </a>
                        )}

                        {hasSocials && (
                            <div className="flex items-center justify-center gap-3">
                                {socialLinks.map(({ key, href, label, Icon }) => (
                                    <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                                        className="w-11 h-11 flex items-center justify-center rounded-full border border-gold-200 text-orange-700 bg-gold-50/50 hover:bg-gold-100 hover:border-gold-400 hover:scale-105 transition">
                                        <Icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
                </Reveal>
            )}

            {waitlistCat && <WaitlistModal category={waitlistCat} onClose={() => setWaitlistCat(null)} />}

            <FloatingActions phone={pageData?.contact_phone} hasCategories={hasCategories} />
            <Footer />
        </main>
    );
}
