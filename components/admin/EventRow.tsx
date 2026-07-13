// components/admin/EventRow.tsx
// Editable event card (Settings → Event Setup): activate, edit all fields, delete.
// Translatable fields use TranslatableField (English → base column, hi/mr →
// translations JSONB). Extracted from app/admin/page.tsx.
"use client";

import { useState } from 'react';
import { Trash2, Save } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import TranslatableField from '@/components/admin/TranslatableField';
import { buildTranslations } from '@/lib/i18n';
import type { EventItem } from '@/app/admin/types';

type Tr = Record<string, Record<string, string>>;

export default function EventRow({ event, onSetActive, onUpdate, onDelete }: {
    event: EventItem;
    onSetActive: (id: string) => void;
    onUpdate: (id: string, updates: Partial<EventItem>) => void;
    onDelete: (id: string, title: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState(event.title || '');
    const [shortDesc, setShortDesc] = useState(event.short_description || '');
    const [longDesc, setLongDesc] = useState(event.long_description || '');
    const [dateTime, setDateTime] = useState(event.date_time || '');
    const [venue, setVenue] = useState(event.venue || '');
    const [travelInfo, setTravelInfo] = useState(event.travel_info || '');
    // Non-translatable fields.
    const [mapUrl, setMapUrl] = useState(event.map_url || '');
    const [instagramUrl, setInstagramUrl] = useState(event.instagram_url || '');
    const [facebookUrl, setFacebookUrl] = useState(event.facebook_url || '');
    const [youtubeUrl, setYoutubeUrl] = useState(event.youtube_url || '');
    const [heroImageUrl, setHeroImageUrl] = useState(event.hero_image_url || '');
    const [isChanged, setIsChanged] = useState(false);

    // Non-English translations, seeded from the translations JSONB.
    const [tr, setTr] = useState<Tr>(() => ({
        hi: { ...(event.translations as Tr)?.hi }, mr: { ...(event.translations as Tr)?.mr },
    }));
    const setTrField = (lang: string, field: string, v: string) => {
        setTr((p) => ({ ...p, [lang]: { ...p[lang], [field]: v } }));
        setIsChanged(true);
    };
    const track = () => setIsChanged(true);

    const handleSave = () => {
        onUpdate(event.id, {
            title, short_description: shortDesc, long_description: longDesc,
            date_time: dateTime || null, venue: venue || null, travel_info: travelInfo || null,
            map_url: mapUrl || null,
            instagram_url: instagramUrl || null, facebook_url: facebookUrl || null, youtube_url: youtubeUrl || null,
            hero_image_url: heroImageUrl || null,
            translations: buildTranslations(tr) as Record<string, Record<string, string>>,
        });
        setIsChanged(false);
    };

    return (
        <div className={`rounded-xl border shadow-sm transition-all ${event.is_active ? 'border-orange-300 bg-orange-50/30' : 'border-neutral-200 bg-white'}`}>
            <div className="flex justify-between items-start p-5">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-neutral-900 truncate">{event.title}</h4>
                    {event.venue && <p className="text-xs text-neutral-500 mt-0.5">📍 {event.venue}{event.date_time ? ` · ${event.date_time}` : ''}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {!event.is_active && (
                        <button
                            onClick={() => onUpdate(event.id, { show_in_archive: !event.show_in_archive })}
                            title="Toggle whether this event appears on the public Previous Events page"
                            className={`text-xs font-semibold border px-3 py-1.5 rounded-lg transition ${event.show_in_archive ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'}`}
                        >
                            {event.show_in_archive ? '👁 In Archive' : '🚫 Hidden'}
                        </button>
                    )}
                    {event.is_active
                        ? <span className="bg-orange-600 text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded">Active</span>
                        : <button onClick={() => onSetActive(event.id)} className="text-xs font-semibold border border-neutral-300 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition">Set Active</button>
                    }
                    <button onClick={() => setExpanded(v => !v)} className={`text-xs font-semibold border px-3 py-1.5 rounded-lg transition ${expanded ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 hover:bg-neutral-100'}`}>
                        {expanded ? 'Close' : 'Edit'}
                    </button>
                    <button onClick={() => onDelete(event.id, event.title)} className="text-neutral-400 hover:text-red-600 p-1.5 border border-transparent hover:border-red-200 rounded-lg hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-neutral-200 p-5 space-y-4">
                    <TranslatableField label="Title" field="title" value={title} onValue={(v) => { setTitle(v); track(); }} tr={tr} onTr={setTrField} />
                    <TranslatableField label="Short Description" field="short_description" value={shortDesc} onValue={(v) => { setShortDesc(v); track(); }} tr={tr} onTr={setTrField} multiline rows={2} />
                    <TranslatableField label="Long Description" field="long_description" value={longDesc} onValue={(v) => { setLongDesc(v); track(); }} tr={tr} onTr={setTrField} multiline rows={3} />
                    <TranslatableField label="Date / Duration" field="date_time" value={dateTime} onValue={(v) => { setDateTime(v); track(); }} tr={tr} onTr={setTrField} placeholder="e.g. March 15–17, 2026" />
                    <TranslatableField label="Venue" field="venue" value={venue} onValue={(v) => { setVenue(v); track(); }} tr={tr} onTr={setTrField} placeholder="e.g. Nashik, Maharashtra" />
                    <TranslatableField label="Plan Your Visit" field="travel_info" value={travelInfo} onValue={(v) => { setTravelInfo(v); track(); }} tr={tr} onTr={setTrField} multiline rows={4} placeholder="How to reach, parking, nearby accommodation…" />

                    <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Google Maps Link</label><input type="url" value={mapUrl} onChange={e => { setMapUrl(e.target.value); track(); }} placeholder="https://maps.google.com/..." className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Instagram URL</label><input type="url" value={instagramUrl} onChange={e => { setInstagramUrl(e.target.value); track(); }} placeholder="https://instagram.com/..." className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Facebook URL</label><input type="url" value={facebookUrl} onChange={e => { setFacebookUrl(e.target.value); track(); }} placeholder="https://facebook.com/..." className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">YouTube URL</label><input type="url" value={youtubeUrl} onChange={e => { setYoutubeUrl(e.target.value); track(); }} placeholder="https://youtube.com/@..." className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Hero Background Image</label>
                        <p className="text-xs text-neutral-400 mb-1.5">Shown behind the homepage hero title (a dark overlay is applied automatically). Optional — leave blank for the plain saffron gradient.</p>
                        <div className="flex gap-2 items-start">
                            {heroImageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={heroImageUrl} alt="Hero preview" className="w-24 h-14 object-cover rounded-lg border border-neutral-200 flex-shrink-0" />
                            )}
                            <input type="url" value={heroImageUrl} onChange={e => { setHeroImageUrl(e.target.value); track(); }} placeholder="https://... or upload →" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" />
                            <MediaPicker onSelected={(url) => { setHeroImageUrl(url); track(); }} />
                            {heroImageUrl && <button type="button" onClick={() => { setHeroImageUrl(''); track(); }} className="px-3 py-2 text-sm font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition">Clear</button>}
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-neutral-100">
                        <button onClick={handleSave} disabled={!isChanged} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${isChanged ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'}`}><Save className="w-4 h-4" />{isChanged ? 'Save Changes' : 'Up to date'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
