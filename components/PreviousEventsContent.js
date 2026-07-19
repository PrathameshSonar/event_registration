// components/PreviousEventsContent.js
// Client Component — receives server-fetched past events, handles language switching.
"use client";

import { Calendar, Image as ImageIcon, Video, History } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import YouTubeEmbed from './YouTubeEmbed';
import { pick } from '@/lib/i18n';

export default function PreviousEventsContent({ pastEvents, allMedia }) {
    const { t, lang } = useLanguage();

    const getEventTitle = (ev) => pick(ev, 'title', lang);
    const getEventDesc = (ev) => pick(ev, 'long_description', lang) || pick(ev, 'short_description', lang);

    return (
        <section className="section-y mandala-bg">
            <div className="container-luxury max-w-5xl">

                <div className="flex items-center gap-3 mb-4">
                    <History className="w-6 h-6 text-orange-600" />
                    <span className="text-orange-600 font-bold tracking-widest uppercase text-xs">
                        {t('prev_tagline')}
                    </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-neutral-950 leading-tight">
                    {t('prev_title')}
                </h2>
                <p className="text-base text-neutral-600 md:text-lg max-w-3xl mb-16 leading-relaxed">
                    {t('prev_desc')}
                </p>

                {/* EVENTS TIMELINE */}
                <div className="space-y-24">
                    {!pastEvents || pastEvents.length === 0 ? (
                        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
                            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">{t('prev_empty_title')}</h3>
                            <p className="text-neutral-500">{t('prev_empty_desc')}</p>
                        </div>
                    ) : (
                        pastEvents.map((event) => {
                            const eventMedia = allMedia?.filter(m => m.event_id === event.id) || [];
                            const images = eventMedia.filter(m => m.media_type === 'image');
                            const videos = eventMedia.filter(m => m.media_type === 'youtube');

                            return (
                                <div key={event.id} className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition duration-500">

                                    <div className="p-8 md:p-12 border-b border-neutral-100 bg-neutral-900 text-white relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{getEventTitle(event)}</h3>
                                            <p className="text-neutral-400 text-sm md:text-base max-w-3xl leading-relaxed whitespace-pre-wrap">
                                                {getEventDesc(event)}
                                            </p>
                                        </div>
                                        <Calendar className="absolute right-0 bottom-0 w-64 h-64 text-neutral-800 -translate-y-1/4 translate-x-1/4 opacity-50 pointer-events-none" />
                                    </div>

                                    <div className="p-8 md:p-12">
                                        {eventMedia.length === 0 ? (
                                            <p className="text-sm text-neutral-400 italic">{t('prev_no_media')}</p>
                                        ) : (
                                            <div className="space-y-12">
                                                {videos.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-6">
                                                            <Video className="w-5 h-5 text-orange-600" />
                                                            <h4 className="text-xl font-bold text-neutral-900">{t('prev_videos_title')}</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {videos.map(video => (
                                                                <div key={video.id} className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                                                                    <div className="aspect-video w-full">
                                                                        <YouTubeEmbed url={video.url} title={video.caption || 'YouTube Video Stream'} />
                                                                    </div>
                                                                    {video.caption && <div className="p-3 bg-white border-t text-sm font-medium text-neutral-700">{video.caption}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {images.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-6">
                                                            <ImageIcon className="w-5 h-5 text-orange-600" />
                                                            <h4 className="text-xl font-bold text-neutral-900">{t('prev_photos_title')}</h4>
                                                        </div>
                                                        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
                                                            {images.map(image => (
                                                                <div key={image.id} className="break-inside-avoid rounded-xl overflow-hidden border border-neutral-200 group relative bg-neutral-100">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={image.url}
                                                                        alt={image.caption || 'Archived Event Image'}
                                                                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                                                                    />
                                                                    {image.caption && (
                                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-950/90 to-transparent p-4 pt-12 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                                            <p className="text-white text-sm font-medium">{image.caption}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </section>
    );
}
