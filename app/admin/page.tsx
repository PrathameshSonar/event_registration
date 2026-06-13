// app/admin/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Lock, Download, Users, IndianRupee, Activity, CheckCircle,
    XCircle, RotateCcw, Search, Filter, Eye, X, Settings, ListFilter, Save, Trash2, Plus, Image as ImageIcon, Video, CalendarDays, Ticket
} from 'lucide-react';

interface Registration { id: string; created_at: string; payment_status: 'pending' | 'completed' | 'failed' | 'refunded'; first_name: string; last_name: string; salutation: string; gender: string; date_of_birth: string; phone: string; email: string; pincode: string; taluka: string; state: string; problem_samasya: string; attendees_count: number; donation_amount: number; total_amount: number; razorpay_payment_id: string | null; categories: { title: string } | null; }
interface Category { id: string; title: string; price: number; description: string; detailed_description: string; media_url: string; is_full: boolean; }
interface EventItem { id: string; title: string; short_description: string; long_description: string; is_active: boolean; }
interface MediaItem { id: string; media_type: 'image' | 'youtube'; url: string; caption: string; event_id: string; events?: { title: string }; }

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // MAIN TABS & SUB-TABS
    const [activeTab, setActiveTab] = useState<'registrations' | 'settings'>('registrations');
    const [settingsSubTab, setSettingsSubTab] = useState<'events' | 'tiers' | 'media'>('events');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Datasets
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [categoriesList, setCategoriesList] = useState<Category[]>([]);
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [eventsList, setEventsList] = useState<EventItem[]>([]);

    // Find the Active Event
    const activeEvent = eventsList.find(e => e.is_active);

    // Forms State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventShort, setNewEventShort] = useState('');
    const [newEventLong, setNewEventLong] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'youtube'>('image');
    const [mediaCaption, setMediaCaption] = useState('');
    const [mediaEventId, setMediaEventId] = useState('');
    const [newCatTitle, setNewCatTitle] = useState('');
    const [newCatPrice, setNewCatPrice] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            fetchAllData();
        } else setError("Incorrect password");
    };

    const fetchAllData = async () => {
        setLoading(true);
        const [regRes, catRes, evRes, mediaRes] = await Promise.all([
            supabase.from('registrations').select('*, categories(title)').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('price', { ascending: true }),
            supabase.from('events').select('*').order('created_at', { ascending: false }),
            supabase.from('event_media').select('*, events(title)').order('created_at', { ascending: false })
        ]);

        if (regRes.data) setRegistrations(regRes.data as Registration[]);
        if (catRes.data) setCategoriesList(catRes.data as Category[]);
        if (evRes.data) {
            setEventsList(evRes.data as EventItem[]);
            const activeEv = evRes.data.find(e => e.is_active);
            if (activeEv) setMediaEventId(activeEv.id);
        }
        if (mediaRes.data) setMediaList(mediaRes.data as MediaItem[]);
        setLoading(false);
    };

    // --- EVENT HANDLERS ---
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from('events').insert([{ title: newEventTitle, short_description: newEventShort, long_description: newEventLong, is_active: eventsList.length === 0 }]);
        setNewEventTitle(''); setNewEventShort(''); setNewEventLong('');
        fetchAllData();
        setSaving(false);
    };

    const handleSetEventActive = async (id: string) => {
        if (!confirm("Set this as the main Home Page event?")) return;
        setSaving(true);
        await supabase.from('events').update({ is_active: true }).eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    const handleDeleteEvent = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
        setSaving(true);
        await supabase.from('events').delete().eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    // --- CATEGORY HANDLERS ---
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from('categories').insert([{ title: newCatTitle, price: Number(newCatPrice), description: newCatDesc }]);
        setNewCatTitle(''); setNewCatPrice(''); setNewCatDesc('');
        fetchAllData();
        setSaving(false);
    };

    const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
        setSaving(true);
        await supabase.from('categories').update(updates).eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Delete this category? Registrations tied to it will be preserved.")) return;
        setSaving(true);
        await supabase.from('categories').delete().eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    // --- MEDIA HANDLERS ---
    const handleAddMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mediaUrl || !mediaEventId) return alert("Select an event to link this media to.");
        setSaving(true);
        let cleanUrl = mediaUrl;
        if (mediaType === 'youtube' && cleanUrl.includes('watch?v=')) cleanUrl = cleanUrl.replace('watch?v=', 'embed/');
        await supabase.from('event_media').insert([{ media_type: mediaType, url: cleanUrl, caption: mediaCaption, event_id: mediaEventId }]);
        setMediaUrl(''); setMediaCaption('');
        fetchAllData();
        setSaving(false);
    };

    const handleDeleteMedia = async (id: string) => {
        if (!confirm("Delete asset?")) return;
        setSaving(true);
        await supabase.from('event_media').delete().eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    // --- FILTERING & EXPORT LOGIC ---
    const uniqueCategories = Array.from(new Set(registrations.map(r => r.categories?.title).filter(Boolean)));

    const filteredRegistrations = registrations.filter(reg => {
        const searchMatch = `${reg.first_name} ${reg.last_name} ${reg.phone}`.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || reg.payment_status === statusFilter;
        const categoryTitle = reg.categories?.title || 'Deleted Tier';
        const catMatch = categoryFilter === 'all' || (categoryFilter === 'Deleted' && !reg.categories) || categoryTitle === categoryFilter;
        return searchMatch && statusMatch && catMatch;
    });

    const totalRevenue = registrations.filter(r => r.payment_status === 'completed').reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const completedCount = registrations.filter(r => r.payment_status === 'completed').length;

    const downloadCSV = () => {
        const headers = ["Date", "Status", "Title", "First Name", "Last Name", "Gender", "DOB", "Phone", "Email", "Pincode", "Taluka", "State", "Category", "Attendees", "Donation", "Total Paid", "Issue/Samasya", "Razorpay ID"];
        const csvData = filteredRegistrations.map(reg => [
            new Date(reg.created_at).toLocaleDateString(), reg.payment_status.toUpperCase(), reg.salutation || '', reg.first_name || '', reg.last_name || '', reg.gender || '', reg.date_of_birth || '', reg.phone || '', reg.email || '', reg.pincode || '', reg.taluka || '', reg.state || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, `"${(reg.problem_samasya || '').replace(/"/g, '""')}"`, reg.razorpay_payment_id || 'N/A'
        ]);
        const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Shankhnad_Registrations.csv`; link.click();
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-4 py-3 bg-neutral-50 border rounded-lg focus:outline-none" />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition">Unlock Terminal</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">

            {/* ACTIVE EVENT BANNER */}
            {activeEvent && (
                <div className="max-w-7xl mx-auto mb-6 bg-neutral-900 text-white px-6 py-3 rounded-xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                        <span className="text-sm font-medium text-neutral-300">Currently Editing / Active Event:</span>
                        <span className="font-bold tracking-wide">{activeEvent.title}</span>
                    </div>
                </div>
            )}

            {/* REGISTRATION DETAILED MODAL */}
            {selectedRegistration && (
                <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                            <h2 className="text-xl font-bold text-neutral-900">Registration Details</h2>
                            <button onClick={() => setSelectedRegistration(null)} className="p-2 text-neutral-400 hover:text-red-600 transition rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Profile Info</h3>
                                    <p><span className="text-neutral-500 block text-xs">Name</span><span className="font-semibold">{selectedRegistration.salutation} {selectedRegistration.first_name} {selectedRegistration.last_name}</span></p>
                                    <p className="mt-2"><span className="text-neutral-500 block text-xs">DOB / Gender</span><span>{selectedRegistration.date_of_birth} ({selectedRegistration.gender})</span></p>
                                    <p className="mt-2"><span className="text-neutral-500 block text-xs">Total Attendees</span><span>{selectedRegistration.attendees_count}</span></p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Communications</h3>
                                    <p><span className="text-neutral-500 block text-xs">WhatsApp / Email</span><span className="font-semibold">{selectedRegistration.phone}</span><br /><span className="text-xs">{selectedRegistration.email}</span></p>
                                    <p className="mt-2"><span className="text-neutral-500 block text-xs">Address</span><span>{selectedRegistration.taluka}, {selectedRegistration.state} - {selectedRegistration.pincode}</span></p>
                                </div>
                                <div className="col-span-2 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                    <span className="text-xs uppercase tracking-wider font-bold text-orange-800 block mb-1">Issue/Samasya</span>
                                    <p className="text-neutral-900 whitespace-pre-wrap">{selectedRegistration.problem_samasya || "None declared."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER TABS */}
            <div className="max-w-7xl mx-auto mb-8 border-b border-neutral-200 pb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Control Center</h1>
                </div>
                <div className="flex bg-neutral-200 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('registrations')} className={`px-5 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${activeTab === 'registrations' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-300'}`}><ListFilter className="w-4 h-4" />Registrations</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-300'}`}><Settings className="w-4 h-4" />System Settings</button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">

                {/* TAB 1: REGISTRATIONS */}
                {activeTab === 'registrations' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Confirmed Attendees</p><p className="text-2xl font-bold">{completedCount}</p></div>
                            </div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Revenue</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
                            </div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Total Attempts</p><p className="text-2xl font-bold">{registrations.length}</p></div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input type="text" placeholder="Search name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border rounded-lg text-sm focus:outline-none" />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2.5 bg-neutral-50 border rounded-lg text-sm focus:outline-none"><option value="all">All Categories</option>{uniqueCategories.map((cat, idx) => <option key={idx} value={cat as string}>{cat}</option>)}<option value="Deleted"> [Deleted Tiers]</option></select>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-neutral-50 border rounded-lg text-sm focus:outline-none"><option value="all">All Statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select>
                                <button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition"><Download className="w-4 h-4" /> Export CSV</button>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-neutral-100 text-neutral-600 font-medium border-b">
                                        <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-center">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {loading ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">Loading ledger...</td></tr>) : filteredRegistrations.length === 0 ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">No records found.</td></tr>) : (
                                            filteredRegistrations.map((reg) => (
                                                <tr key={reg.id} className="hover:bg-neutral-50 transition">
                                                    <td className="px-6 py-4">
                                                        {reg.payment_status === 'completed' && <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Paid</span>}
                                                        {reg.payment_status === 'pending' && <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>}
                                                        {reg.payment_status === 'failed' && <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Failed</span>}
                                                        {reg.payment_status === 'refunded' && <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-700">Refunded</span>}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-neutral-900">{reg.first_name} {reg.last_name}<br /><span className="text-xs font-normal text-neutral-400">{reg.phone}</span></td>
                                                    <td className="px-6 py-4 text-neutral-600">{reg.categories?.title || 'Deleted Category'}</td>
                                                    <td className="px-6 py-4 font-bold">₹{reg.total_amount}</td>
                                                    <td className="px-6 py-4 text-neutral-500">{new Date(reg.created_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-center"><button onClick={() => setSelectedRegistration(reg)} className="p-2 border rounded-lg hover:bg-orange-50 hover:text-orange-600 transition"><Eye className="w-4 h-4" /></button></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: SYSTEM SETTINGS */}
                {activeTab === 'settings' && (
                    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                        {/* SETTINGS SIDEBAR */}
                        <div className="w-full md:w-64 bg-neutral-50 border-r border-neutral-200 p-4 space-y-2">
                            <button onClick={() => setSettingsSubTab('events')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${settingsSubTab === 'events' ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><CalendarDays className="w-4 h-4" /> Event Setup</button>
                            <button onClick={() => setSettingsSubTab('tiers')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${settingsSubTab === 'tiers' ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><Ticket className="w-4 h-4" /> Ticket Tiers</button>
                            <button onClick={() => setSettingsSubTab('media')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${settingsSubTab === 'media' ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><ImageIcon className="w-4 h-4" /> Media Gallery</button>
                        </div>

                        {/* SETTINGS CONTENT */}
                        <div className="flex-1 p-6 lg:p-8 bg-white overflow-y-auto">

                            {/* SUB-TAB: EVENT SETUP */}
                            {settingsSubTab === 'events' && (
                                <div className="max-w-3xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b pb-4">Yearly Event Management</h2>
                                    <form onSubmit={handleCreateEvent} className="bg-neutral-50 p-6 rounded-xl border mb-8 space-y-4">
                                        <h3 className="font-bold text-sm uppercase text-neutral-500 mb-2">Create New Event</h3>
                                        <input type="text" placeholder="Event Title (e.g. Mahotsav 2026)" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none" required />
                                        <textarea placeholder="Short Description (Appears on Home Page)" value={newEventShort} onChange={(e) => setNewEventShort(e.target.value)} className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none resize-none" required />
                                        <textarea placeholder="Long Description (Appears on Previous Events pages)" value={newEventLong} onChange={(e) => setNewEventLong(e.target.value)} className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none resize-none h-24" required />
                                        <button type="submit" disabled={saving} className="bg-neutral-900 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-orange-600 transition">Deploy Event</button>
                                    </form>

                                    <h3 className="font-bold text-sm uppercase text-neutral-500 mb-4">Event History</h3>
                                    <div className="space-y-4">
                                        {eventsList.map(ev => (
                                            <div key={ev.id} className={`p-4 rounded-xl border ${ev.is_active ? 'border-orange-300 bg-orange-50/50' : 'border-neutral-200 bg-white'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-lg">{ev.title}</h4>
                                                    <div className="flex items-center gap-2">
                                                        {ev.is_active ? (
                                                            <span className="bg-orange-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Active</span>
                                                        ) : (
                                                            <button onClick={() => handleSetEventActive(ev.id)} className="text-xs font-semibold border px-3 py-1 rounded hover:bg-neutral-100 transition">Set Active</button>
                                                        )}
                                                        <button onClick={() => handleDeleteEvent(ev.id, ev.title)} className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition border" title="Delete Event"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-neutral-600">{ev.short_description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SUB-TAB: TICKET TIERS */}
                            {settingsSubTab === 'tiers' && (
                                <div className="max-w-4xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b pb-4">Ticket Categories & Pricing</h2>

                                    <form onSubmit={handleCreateCategory} className="flex flex-col md:flex-row gap-4 mb-8 bg-neutral-50 p-4 rounded-xl border">
                                        <input type="text" placeholder="Tier Name" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none" required />
                                        <input type="number" placeholder="Price (₹)" value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)} className="w-full md:w-32 px-3 py-2 text-sm border rounded-lg focus:outline-none" required />
                                        <button type="submit" disabled={saving} className="bg-neutral-900 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2 rounded-lg transition whitespace-nowrap">Add Tier</button>
                                    </form>

                                    <div className="space-y-6">
                                        {categoriesList.map((cat) => (
                                            <div key={cat.id} className="border border-neutral-200 rounded-xl p-5 bg-white shadow-sm relative">
                                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                                    <select value={cat.is_full ? 'full' : 'open'} onChange={(e) => handleUpdateCategory(cat.id, { is_full: e.target.value === 'full' })} className="text-xs border rounded-lg px-2 py-1 bg-neutral-50 font-bold cursor-pointer outline-none"><option value="open">🟢 Open</option><option value="full">🔴 Full</option></select>
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-neutral-400 hover:text-red-600 p-1 border rounded bg-neutral-50 hover:bg-red-50 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>

                                                <h4 className="font-bold text-lg mb-4 text-neutral-900 w-3/4">{cat.title}</h4>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Fee Amount (₹)</label>
                                                        <input type="number" defaultValue={cat.price} onBlur={(e) => handleUpdateCategory(cat.id, { price: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border rounded-lg bg-neutral-50 focus:outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Media URL (Thumbnail)</label>
                                                        <input type="text" placeholder="https://..." defaultValue={cat.media_url || ''} onBlur={(e) => handleUpdateCategory(cat.id, { media_url: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg bg-neutral-50 focus:outline-none" />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[11px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Short Summary</label>
                                                        <input type="text" defaultValue={cat.description || ''} onBlur={(e) => handleUpdateCategory(cat.id, { description: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg bg-neutral-50 focus:outline-none" />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[11px] font-bold text-neutral-500 mb-1 uppercase tracking-wider">Detailed Description</label>
                                                        <textarea defaultValue={cat.detailed_description || ''} onBlur={(e) => handleUpdateCategory(cat.id, { detailed_description: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg bg-neutral-50 focus:outline-none h-20 resize-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SUB-TAB: MEDIA GALLERY */}
                            {settingsSubTab === 'media' && (
                                <div className="max-w-4xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b pb-4">Gallery & Video Injector</h2>

                                    <form onSubmit={handleAddMedia} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-50 p-6 border border-neutral-200 rounded-xl mb-8">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Asset URL</label>
                                            <input type="url" placeholder="https://..." value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none" required />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Type</label>
                                            <select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'youtube')} className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none">
                                                <option value="image">Image</option><option value="youtube">YouTube</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Link Event</label>
                                            <select value={mediaEventId} onChange={(e) => setMediaEventId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none">
                                                {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Caption</label>
                                            <input type="text" placeholder="e.g., Opening Ceremony Highlights" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none" />
                                        </div>
                                        <div className="md:col-span-1 flex items-end">
                                            <button type="submit" disabled={saving} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition flex justify-center items-center gap-2"><Plus className="w-4 h-4" /> Inject</button>
                                        </div>
                                    </form>

                                    <div className="space-y-4">
                                        {mediaList.map((media) => (
                                            <div key={media.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-neutral-200 rounded-xl bg-white shadow-sm gap-4 hover:border-neutral-300 transition">
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="w-24 h-16 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0 border relative">
                                                        {media.media_type === 'image' ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={media.url} alt="media" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white"><Video className="w-5 h-5" /></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-neutral-800">{media.caption || 'Untitled Asset'}</p>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                                                            <span className="uppercase tracking-wider font-semibold text-[10px] bg-neutral-100 px-2 py-0.5 rounded border">{media.media_type}</span>
                                                            <span>Linked to: {media.events?.title || 'Unknown Event'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteMedia(media.id)} className="text-neutral-400 hover:text-red-600 p-2 bg-neutral-50 rounded-lg hover:bg-red-50 transition border"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {mediaList.length === 0 && (
                                            <div className="p-8 text-center text-neutral-400 border border-dashed rounded-xl bg-neutral-50">
                                                No media assets found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}