// components/admin/CategoryRow.tsx
// Editable ticket-tier card (Settings → Ticket Tiers). Self-contained: local draft
// state, commits via onUpdate. Extracted from app/admin/page.tsx.
"use client";

import { useState } from 'react';
import { Trash2, Users, Save } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import TranslatableField from '@/components/admin/TranslatableField';
import { buildTranslations } from '@/lib/i18n';
import type { Category } from '@/app/admin/types';

type Tr = Record<string, Record<string, string>>;

export default function CategoryRow({ category, onUpdate, onDelete }: { category: Category, onUpdate: (id: string, updates: Partial<Category>) => void, onDelete: (id: string, title: string) => void }) {
    const [price, setPrice] = useState(category.price);
    const [mediaUrl, setMediaUrl] = useState(category.media_url || '');
    const [desc, setDesc] = useState(category.description || '');
    const [detailedDesc, setDetailedDesc] = useState(category.detailed_description || '');
    const [isFull, setIsFull] = useState(category.is_full);
    const [isEnquiry, setIsEnquiry] = useState(category.is_enquiry_only || false);
    const [capacity, setCapacity] = useState(category.max_capacity || 0);
    const [showAvail, setShowAvail] = useState(category.show_availability || false);
    const [maxPerReg, setMaxPerReg] = useState(category.max_attendees_per_reg || 5);
    const [showEmi, setShowEmi] = useState(category.show_emi_badge || false);
    const [allowPart, setAllowPart] = useState(category.allow_part_payment || false);
    const [allowEnquiry, setAllowEnquiry] = useState(category.allow_enquiry || false);
    const [isRecommended, setIsRecommended] = useState(category.is_recommended || false);
    const [tagline, setTagline] = useState(category.tagline || '');
    const [perksText, setPerksText] = useState((category.perks || []).join('\n'));
    const [color, setColor] = useState(category.color || 'default');
    const [advancePct, setAdvancePct] = useState(category.advance_percent || 25);
    const [minAge, setMinAge] = useState<string>(category.min_age ? String(category.min_age) : '');
    const [maxAge, setMaxAge] = useState<string>(category.max_age ? String(category.max_age) : '');
    const [isChanged, setIsChanged] = useState(false);

    // Non-English translations, seeded from the translations JSONB.
    const [tr, setTr] = useState<Tr>(() => ({
        hi: { ...(category.translations as Tr)?.hi }, mr: { ...(category.translations as Tr)?.mr },
    }));
    const setTrField = (lang: string, field: string, v: string) => {
        setTr((p) => ({ ...p, [lang]: { ...p[lang], [field]: v } }));
        setIsChanged(true);
    };

    const handleUpdateClick = () => {
        onUpdate(category.id, {
            price, media_url: mediaUrl, description: desc, detailed_description: detailedDesc,
            is_full: isFull, is_enquiry_only: isEnquiry, max_capacity: capacity, show_availability: showAvail,
            max_attendees_per_reg: maxPerReg,
            show_emi_badge: showEmi, allow_part_payment: allowPart, advance_percent: advancePct,
            allow_enquiry: allowEnquiry, is_recommended: isRecommended,
            tagline: tagline || null,
            perks: perksText.split('\n').map((s) => s.trim()).filter(Boolean),
            color,
            min_age: minAge ? Number(minAge) : null, max_age: maxAge ? Number(maxAge) : null,
            translations: buildTranslations(tr) as Record<string, Record<string, string>>,
        });
        setIsChanged(false);
    };

    return (
        <div className="border border-neutral-200 rounded-xl p-5 bg-white shadow-sm relative transition-all hover:border-neutral-300">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h4 className="font-bold text-lg text-neutral-900 pr-8">{category.title}</h4>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={isEnquiry ? 'yes' : 'no'} onChange={(e) => { setIsEnquiry(e.target.value === 'yes'); setIsChanged(true); }} className={`text-xs border rounded-lg px-2.5 py-1.5 font-bold cursor-pointer outline-none transition ${isEnquiry ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
                        <option value="no">💳 Standard Paid Tier</option><option value="yes">💬 Enquiry Only</option>
                    </select>
                    <select value={isFull ? 'full' : 'open'} onChange={(e) => { setIsFull(e.target.value === 'full'); setIsChanged(true); }} className={`text-xs border rounded-lg px-2.5 py-1.5 font-bold cursor-pointer outline-none transition ${isFull ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        <option value="open">🟢 Slots Open</option><option value="full">🔴 Manual Lock (Full)</option>
                    </select>
                    <select value={isRecommended ? 'yes' : 'no'} onChange={(e) => { setIsRecommended(e.target.value === 'yes'); setIsChanged(true); }} className={`text-xs border rounded-lg px-2.5 py-1.5 font-bold cursor-pointer outline-none transition ${isRecommended ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
                        <option value="no">☆ Standard</option><option value="yes">⭐ Most Chosen</option>
                    </select>
                    <button onClick={() => onDelete(category.id, category.title)} className="text-neutral-400 hover:text-red-600 p-1.5 border border-transparent hover:border-red-200 rounded bg-neutral-50 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-4"><TranslatableField label="Tier Title" field="title" value={category.title} onValue={() => { }} tr={tr} onTr={setTrField} readOnlyBase /></div>
                <div className="md:col-span-1"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Fee (₹)</label><input type="number" value={price} onChange={(e) => { setPrice(Number(e.target.value)); setIsChanged(true); }} disabled={isEnquiry} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition disabled:opacity-50" /></div>
                <div className="md:col-span-1"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1"><Users className="w-3 h-3 inline" /> Max Total Seats</label><input type="number" min="0" value={capacity} onChange={(e) => { setCapacity(Number(e.target.value)); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-1"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1"><Users className="w-3 h-3 inline" /> Max per Registration</label><input type="number" min="1" max="20" value={maxPerReg} onChange={(e) => { setMaxPerReg(Math.max(1, Number(e.target.value))); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-1 pt-5"><label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700"><input type="checkbox" checked={showAvail} onChange={(e) => { setShowAvail(e.target.checked); setIsChanged(true); }} className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-600" />Show Availability</label></div>

                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Media URL</label>
                    <div className="flex gap-2">
                        <input type="text" value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); setIsChanged(true); }} placeholder="https://... or upload →" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" />
                        <MediaPicker onSelected={(url) => { setMediaUrl(url); setIsChanged(true); }} />
                    </div>
                </div>
                <div className="md:col-span-2"><TranslatableField label="Short Summary" field="description" value={desc} onValue={(v) => { setDesc(v); setIsChanged(true); }} tr={tr} onTr={setTrField} /></div>
                <div className="md:col-span-2"><TranslatableField label="Detailed Perks" field="detailed_description" value={detailedDesc} onValue={(v) => { setDetailedDesc(v); setIsChanged(true); }} tr={tr} onTr={setTrField} multiline rows={2} /></div>

                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Tagline <span className="font-normal text-neutral-400 normal-case">(short line on the tier card, e.g. “Reserved sankalp &amp; seating”)</span></label><input type="text" value={tagline} onChange={(e) => { setTagline(e.target.value); setIsChanged(true); }} placeholder="Reserved sankalp & seating" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Perks <span className="font-normal text-neutral-400 normal-case">(one per line — the bullet list on the tier card)</span></label><textarea value={perksText} onChange={(e) => { setPerksText(e.target.value); setIsChanged(true); }} rows={4} placeholder={"Entry to all three days\nMahaprasad on Day 3\nBlessed tirtha & vibhuti packet"} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Card colour <span className="font-normal text-neutral-400 normal-case">(the Seva card theme on the registration page)</span></label>
                    <select value={color} onChange={(e) => { setColor(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition cursor-pointer">
                        <option value="default">Default (ivory)</option>
                        <option value="gold">Gold (premium gradient)</option>
                        <option value="maroon">Maroon (deep)</option>
                    </select>
                </div>
            </div>

            {/* Payment options */}
            {!isEnquiry && (
                <div className="mt-5 pt-4 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700">
                        <input type="checkbox" checked={showEmi} onChange={(e) => { setShowEmi(e.target.checked); setIsChanged(true); }} className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-600" />
                        💳 Show “EMI available” badge
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700">
                        <input type="checkbox" checked={allowPart} onChange={(e) => { setAllowPart(e.target.checked); setIsChanged(true); }} className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-600" />
                        ◐ Allow part payment
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700">
                        <input type="checkbox" checked={allowEnquiry} onChange={(e) => { setAllowEnquiry(e.target.checked); setIsChanged(true); }} className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-600" />
                        💬 Also show “Enquire Now” button
                    </label>
                    <div className={allowPart ? '' : 'opacity-40 pointer-events-none'}>
                        <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Advance % (of price)</label>
                        <input type="number" min="1" max="100" value={advancePct} onChange={(e) => { setAdvancePct(Math.min(100, Math.max(1, Number(e.target.value) || 25))); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" />
                    </div>
                </div>
            )}

            {/* Age restriction (all tiers). Blank = open to all ages. */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Age Restriction <span className="font-normal text-neutral-400 normal-case">(leave blank = open to all ages)</span></p>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">Min age</label>
                        <input type="number" min="0" placeholder="e.g. 14" value={minAge} onChange={(e) => { setMinAge(e.target.value); setIsChanged(true); }} className="w-28 px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">Max age</label>
                        <input type="number" min="0" placeholder="none" value={maxAge} onChange={(e) => { setMaxAge(e.target.value); setIsChanged(true); }} className="w-28 px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" />
                    </div>
                    <span className="text-xs text-neutral-400 pb-2">Requires date of birth on the form.</span>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-end">
                <button onClick={handleUpdateClick} disabled={!isChanged} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${isChanged ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'}`}><Save className="w-4 h-4" />{isChanged ? "Commit Updates" : "Up to date"}</button>
            </div>
        </div>
    );
}
