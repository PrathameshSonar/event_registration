// components/HomeContent.js
// Client Component — receives server-fetched data, handles language switching.
"use client";

import { Calendar, MapPin, Image as ImageIcon, Video, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import LangToggle from './LangToggle';
import Footer from './Footer';

export default function HomeContent({ pageData, categories, mediaItems, seatsTaken }) {
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

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100">

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

            {/* HERO */}
            <section className="max-w-4xl mx-auto px-4 py-12 md:py-24 text-center">
                <span className="text-orange-600 font-bold tracking-widest uppercase text-xs mb-4 block">
                    {t('hero_tagline')}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-neutral-950">
                    {eventTitle}
                </h2>
                <p className="text-base text-neutral-600 md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                    {eventDesc}
                </p>
                <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-12 text-neutral-600 mb-16 font-medium text-sm">
                    <div className="flex items-center justify-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-600" />
                        <span>{displayDate}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        {mapUrl ? (
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 hover:underline transition">{displayVenue}</a>
                        ) : (
                            <span>{displayVenue}</span>
                        )}
                    </div>
                </div>
            </section>

            {/* REGISTRATION CATEGORIES */}
            <section id="categories" className="bg-white py-16 md:py-24 border-t border-neutral-200">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-bold mb-3 tracking-tight">{t('section_categories_title')}</h3>
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
                                <div key={category.id} className="border border-neutral-200 rounded-2xl p-5 md:p-8 hover:shadow-lg hover:border-neutral-300 transition flex flex-col justify-between bg-white relative overflow-hidden">

                                    {isCapacityEnforced && category.show_availability && !isEffectivelyFull && (
                                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-b border-l border-orange-200 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> {t('category_seats_left', remaining)}
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-xl font-bold mb-2 text-neutral-900 mt-2">{getCatTitle(category)}</h4>
                                        <div className="text-3xl font-black mb-4 text-orange-600">
                                            {category.is_enquiry_only ? t('category_enquire_price') : `₹${category.price.toLocaleString('en-IN')}`}
                                        </div>
                                        <p className="text-neutral-600 mb-8 text-sm leading-relaxed whitespace-pre-wrap">
                                            {getCatDesc(category)}
                                        </p>
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

            {/* MEDIA */}
            {mediaItems && mediaItems.length > 0 && (
                <section className="bg-neutral-100 py-16 md:py-24 border-t border-neutral-200">
                    <div className="max-w-5xl mx-auto px-4">

                        {youtubeVideos.length > 0 && (
                            <div className="mb-16">
                                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                                    <Video className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-2xl font-bold tracking-tight">{t('section_videos')}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {youtubeVideos.map((video) => (
                                        <div key={video.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                                            <div className="aspect-video w-full">
                                                <iframe src={video.url} title={video.caption || 'YouTube Video'} className="w-full h-full" frameBorder="0" allowFullScreen />
                                            </div>
                                            {video.caption && <div className="p-4 bg-white border-t"><p className="text-sm font-semibold text-neutral-800">{video.caption}</p></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {galleryImages.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
                                    <ImageIcon className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-2xl font-bold tracking-tight">{t('section_gallery')}</h3>
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
            <Footer />
        </main>
    );
}
