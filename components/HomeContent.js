// components/HomeContent.js
// Client Component — receives server-fetched data, handles language switching.
"use client";

import { Fragment } from 'react';
import { Calendar, MapPin, Image as ImageIcon, Video, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import LangToggle from './LangToggle';
import Footer from './Footer';
import YouTubeEmbed from './YouTubeEmbed';
import Countdown from './Countdown';
import FloatingActions from './FloatingActions';
import AddToCalendar from './AddToCalendar';
import ShareButtons from './ShareButtons';
import { ageLimitLabel } from '@/lib/age';
import FaqAccordion from './FaqAccordion';
import ReminderForm from './ReminderForm';
import Reveal from './Reveal';

// Shown when the admin hasn't added ritual highlights yet — keeps the page rich out of the box.
const DEFAULT_HIGHLIGHTS = [
    { icon: '🔥', en: 'Havan & Yagna', hi: 'हवन एवं यज्ञ', enD: 'Sacred fire rituals for purification and blessings', hiD: 'शुद्धि एवं आशीर्वाद हेतु पावन अग्नि अनुष्ठान' },
    { icon: '🪔', en: 'Maha Aarti', hi: 'महा आरती', enD: 'Grand evening aarti with lamps and devotional chants', hiD: 'दीपों एवं भक्ति गीतों के साथ भव्य संध्या आरती' },
    { icon: '🌺', en: 'Abhishekam', hi: 'अभिषेकम्', enD: 'Ceremonial bathing of the deity with sacred offerings', hiD: 'पावन सामग्री से देव का अभिषेक' },
    { icon: '🍲', en: 'Annadān (Bhandara)', hi: 'अन्नदान (भंडारा)', enD: 'Community feast — prasad served to all devotees', hiD: 'सामुदायिक भोज — सभी भक्तों हेतु प्रसाद' },
    { icon: '🎶', en: 'Bhajan Sandhya', hi: 'भजन संध्या', enD: 'An evening of soul-stirring devotional music', hiD: 'मनमोहक भक्ति संगीत की संध्या' },
    { icon: '📿', en: 'Pravachan', hi: 'प्रवचन', enD: 'Spiritual discourses by revered saints', hiD: 'पूज्य संतों द्वारा आध्यात्मिक प्रवचन' },
];

export default function HomeContent({ pageData, categories, mediaItems, seatsTaken, schedule, highlights, faqs, guests, registeredCount }) {
    schedule = schedule || [];
    highlights = highlights || [];
    guests = guests || [];
    faqs = faqs || [];
    const { t, lang } = useLanguage();

    const eventTitle = lang === 'hi'
        ? (pageData?.title_hi || pageData?.title || t('hero_event_fallback'))
        : (pageData?.title || t('hero_event_fallback'));

    const eventDesc = lang === 'hi'
        ? (pageData?.short_description_hi || pageData?.short_description || t('hero_desc_fallback'))
        : (pageData?.short_description || t('hero_desc_fallback'));

    const displayDate = lang === 'hi'
        ? (pageData?.date_time_hi || pageData?.date_time || t('hero_dates'))
        : (pageData?.date_time || t('hero_dates'));

    const displayVenue = lang === 'hi'
        ? (pageData?.venue_hi || pageData?.venue || t('hero_venue'))
        : (pageData?.venue || t('hero_venue'));

    const mapUrl = pageData?.map_url || null;

    const getCatTitle = (cat) => lang === 'hi' ? (cat.title_hi || cat.title) : cat.title;
    const getCatDesc = (cat) => lang === 'hi' ? (cat.description_hi || cat.description) : cat.description;

    const galleryImages = mediaItems?.filter(item => item.media_type === 'image') || [];
    const youtubeVideos = mediaItems?.filter(item => item.media_type === 'youtube') || [];

    const hasCategories = Array.isArray(categories) && categories.length > 0;
    const aboutText = lang === 'hi'
        ? (pageData?.long_description_hi || pageData?.long_description || '')
        : (pageData?.long_description || '');

    // Ritual highlights: admin-defined if present, otherwise a curated default set.
    const hl = (highlights && highlights.length)
        ? highlights.map(h => ({
            icon: h.icon || '🪔',
            title: lang === 'hi' ? (h.title_hi || h.title) : h.title,
            desc: lang === 'hi' ? (h.description_hi || h.description) : h.description,
          }))
        : DEFAULT_HIGHLIGHTS.map(h => ({
            icon: h.icon,
            title: lang === 'hi' ? h.hi : h.en,
            desc: lang === 'hi' ? h.hiD : h.enD,
          }));

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100 pb-20 md:pb-0">

            {/* HEADER */}
            <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 bg-white/90 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center py-4 md:py-6">
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t('nav_brand')}</h1>
                        <nav className="flex items-center gap-4 md:gap-6 text-sm font-medium text-neutral-600">
                            <Link href="/" className="text-orange-600 transition font-semibold hidden md:block">{t('nav_event_details')}</Link>
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
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight tracking-tight drop-shadow-sm">
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
                            <a href="#categories" className="inline-block bg-white text-orange-700 font-bold px-7 py-3 rounded-xl shadow-lg hover:bg-amber-50 hover:scale-[1.02] transition text-sm md:text-base">
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
            {aboutText && (
                <Reveal>
                <section className="bg-neutral-50 py-10 md:py-14 border-b border-neutral-200">
                    <div className="max-w-3xl mx-auto px-4 text-center">
                        <span className="text-3xl">🙏</span>
                        <h3 className="text-xl md:text-2xl font-bold mt-3 mb-4 tracking-tight text-neutral-900">{t('section_about_title')}</h3>
                        <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">{aboutText}</p>
                    </div>
                </section>
                </Reveal>
            )}

            {/* SACRED RITUALS & HIGHLIGHTS */}
            <Reveal>
            <section className="bg-white py-10 md:py-14 border-b border-neutral-200">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('section_highlights_title')}</h3>
                        <p className="text-neutral-500 text-sm mt-2">{t('section_highlights_desc')}</p>
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
                <section className="bg-neutral-50 py-10 md:py-14 border-b border-neutral-200">
                    <div className="max-w-5xl mx-auto px-4">
                        <div className="text-center mb-8">
                            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('section_lineup_title')}</h3>
                            <p className="text-neutral-500 text-sm mt-2">{t('section_lineup_desc')}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                            {guests.map((g) => {
                                const gName = lang === 'hi' ? (g.name_hi || g.name) : g.name;
                                const gRole = lang === 'hi' ? (g.role_hi || g.role) : g.role;
                                const gBio = lang === 'hi' ? (g.bio_hi || g.bio) : g.bio;
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
                <section id="schedule" className="bg-gradient-to-b from-amber-50/40 to-white py-10 md:py-14 border-b border-neutral-200">
                    <div className="max-w-3xl mx-auto px-4">
                        <div className="text-center mb-8">
                            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">{t('section_schedule_title')}</h3>
                            <p className="text-neutral-500 text-sm mt-2">{t('section_schedule_desc')}</p>
                        </div>
                        <div className="space-y-3">
                            {(() => {
                                let lastDay = null;
                                return schedule.map((s) => {
                                    const sTitle = lang === 'hi' ? (s.title_hi || s.title) : s.title;
                                    const sDay = lang === 'hi' ? (s.day_label_hi || s.day_label) : s.day_label;
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
            <section id="categories" className="bg-white py-12 md:py-16 border-t border-neutral-200">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-9">
                        <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">{t('section_categories_title')}</h3>
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
                                <div key={category.id} className="border border-neutral-200 rounded-2xl p-5 md:p-6 hover:shadow-lg hover:border-neutral-300 transition flex flex-col justify-between bg-white relative overflow-hidden">

                                    {isCapacityEnforced && category.show_availability && !isEffectivelyFull && (
                                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-b border-l border-orange-200 flex items-center gap-1">
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
                                        <div className="w-full text-center bg-neutral-100 text-neutral-400 font-semibold py-3 rounded-xl border border-neutral-200 cursor-not-allowed text-sm">
                                            {t('category_full')}
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

            {/* REMINDER OPT-IN */}
            {pageData?.id && (
                <Reveal><ReminderForm eventId={pageData.id} /></Reveal>
            )}

            {/* MEDIA */}
            {mediaItems && mediaItems.length > 0 && (
                <section className="bg-neutral-100 py-12 md:py-16 border-t border-neutral-200">
                    <div className="max-w-5xl mx-auto px-4">

                        {youtubeVideos.length > 0 && (
                            <div className="mb-12">
                                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                                    <Video className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-xl md:text-2xl font-bold tracking-tight">{t('section_videos')}</h3>
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
                                    <h3 className="text-xl md:text-2xl font-bold tracking-tight">{t('section_gallery')}</h3>
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
                <section className="bg-white py-10 border-t border-neutral-200">
                    <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-orange-600" /> {t('section_venue_title')}</h3>
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

            <FloatingActions phone={pageData?.contact_phone} hasCategories={hasCategories} />
            <Footer />
        </main>
    );
}
