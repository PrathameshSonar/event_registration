// app/previous-events/page.tsx
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Calendar, Image as ImageIcon, Video, History } from 'lucide-react';

// Force Next.js to fetch fresh data every 60 seconds
export const revalidate = 60;

export default async function PreviousEventsPage() {
    // 1. Fetch all INACTIVE events (Past Events)
    const { data: pastEvents } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false });

    // 2. Fetch ALL media to map to these events
    const { data: allMedia } = await supabase
        .from('event_media')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-orange-100">

            {/* MINIMALIST HEADER */}
            <header className="bg-white border-b border-neutral-200 py-6 px-4 md:px-8 sticky top-0 z-40 backdrop-blur-md bg-white/80">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <Link href="/" className="hover:opacity-80 transition">
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Shankhnad Mahotsav</h1>
                    </Link>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-neutral-600">
                        <Link href="/" className="hover:text-orange-600 transition">Current Event</Link>
                        <Link href="/pitham" className="hover:text-orange-600 transition">Pitham</Link>
                        <Link href="/previous-events" className="text-orange-600 transition font-semibold">Past Events</Link>
                    </nav>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-8 transition group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to current event
                </Link>

                <div className="flex items-center gap-3 mb-4">
                    <History className="w-6 h-6 text-orange-600" />
                    <span className="text-orange-600 font-bold tracking-widest uppercase text-xs">
                        Historical Archives
                    </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-neutral-950 leading-tight">
                    Previous Mahotsavs
                </h2>
                <p className="text-base text-neutral-600 md:text-lg max-w-3xl mb-16 leading-relaxed">
                    Explore the memories, discussions, and visual galleries from our past gatherings. Each event lays the foundation for the next.
                </p>

                {/* EVENTS TIMELINE */}
                <div className="space-y-24">
                    {!pastEvents || pastEvents.length === 0 ? (
                        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
                            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">The Archives are Empty</h3>
                            <p className="text-neutral-500">Our history is just beginning. Past events will appear here once the current Mahotsav concludes.</p>
                        </div>
                    ) : (
                        pastEvents.map((event) => {
                            // Filter media specific to this event loop
                            const eventMedia = allMedia?.filter(m => m.event_id === event.id) || [];
                            const images = eventMedia.filter(m => m.media_type === 'image');
                            const videos = eventMedia.filter(m => m.media_type === 'youtube');

                            return (
                                <div key={event.id} className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition duration-500">

                                    {/* Event Details Header */}
                                    <div className="p-8 md:p-12 border-b border-neutral-100 bg-neutral-900 text-white relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{event.title}</h3>
                                            <p className="text-neutral-400 text-sm md:text-base max-w-3xl leading-relaxed whitespace-pre-wrap">
                                                {event.long_description || event.short_description}
                                            </p>
                                        </div>
                                        {/* Decorative Background Element */}
                                        <Calendar className="absolute right-0 bottom-0 w-64 h-64 text-neutral-800 -translate-y-1/4 translate-x-1/4 opacity-50 pointer-events-none" />
                                    </div>

                                    {/* Event Media Gallery */}
                                    <div className="p-8 md:p-12">

                                        {eventMedia.length === 0 ? (
                                            <p className="text-sm text-neutral-400 italic">No media assets archived for this event.</p>
                                        ) : (
                                            <div className="space-y-12">

                                                {/* Videos Section */}
                                                {videos.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-6">
                                                            <Video className="w-5 h-5 text-orange-600" />
                                                            <h4 className="text-xl font-bold text-neutral-900">Broadcasts & Recordings</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {videos.map(video => (
                                                                <div key={video.id} className="rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                                                                    <div className="aspect-video w-full">
                                                                        <iframe
                                                                            src={video.url}
                                                                            title={video.caption || "YouTube Video Stream"}
                                                                            className="w-full h-full"
                                                                            frameBorder="0"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                        />
                                                                    </div>
                                                                    {video.caption && <div className="p-3 bg-white border-t text-sm font-medium text-neutral-700">{video.caption}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Images Section */}
                                                {images.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-6">
                                                            <ImageIcon className="w-5 h-5 text-orange-600" />
                                                            <h4 className="text-xl font-bold text-neutral-900">Photo Gallery</h4>
                                                        </div>
                                                        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
                                                            {images.map(image => (
                                                                <div key={image.id} className="break-inside-avoid rounded-xl overflow-hidden border border-neutral-200 group relative bg-neutral-100">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={image.url}
                                                                        alt={image.caption || "Archived Event Image"}
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

            </section>
        </main>
    );
}