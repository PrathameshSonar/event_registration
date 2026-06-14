// app/admin/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Lock, Download, Users, IndianRupee, Activity, CheckCircle,
    XCircle, RotateCcw, Search, Eye, X, Settings, ListFilter,
    Save, Trash2, Plus, Image as ImageIcon, Video, CalendarDays,
    Ticket, Calendar as CalendarIcon, MessageCircle
} from 'lucide-react';

interface Registration {
    id: string; created_at: string;
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'enquired' | 'contacted';
    first_name: string; last_name: string; salutation: string; gender: string;
    date_of_birth: string; phone: string; email: string; pincode: string;
    taluka: string; state: string; problem_samasya: string; attendees_count: number;
    donation_amount: number; total_amount: number; razorpay_payment_id: string | null;
    categories: { title: string } | null;
}

interface Category {
    id: string; title: string; price: number; description: string;
    detailed_description: string; media_url: string; is_full: boolean;
    is_enquiry_only: boolean;
}

interface EventItem { id: string; title: string; short_description: string; long_description: string; is_active: boolean; }
interface MediaItem { id: string; media_type: 'image' | 'youtube'; url: string; caption: string; event_id: string; events?: { title: string }; }

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [activeTab, setActiveTab] = useState<'registrations' | 'settings'>('registrations');
    const [settingsSubTab, setSettingsSubTab] = useState<'events' | 'tiers' | 'media'>('events');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [categoriesList, setCategoriesList] = useState<Category[]>([]);
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [eventsList, setEventsList] = useState<EventItem[]>([]);

    const activeEvent = eventsList.find(e => e.is_active);

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
    const [newCatIsEnquiry, setNewCatIsEnquiry] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            fetchAllData();
        } else { setError("Incorrect password"); }
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

    // --- NEW: STATUS UPDATER HANDLER ---
    const handleUpdateStatus = async (id: string, newStatus: string) => {
        if (!confirm(`Are you sure you want to change this registration's status to ${newStatus.toUpperCase()}?`)) return;
        setSaving(true);
        const { error } = await supabase
            .from('registrations')
            .update({ payment_status: newStatus })
            .eq('id', id);

        if (error) {
            alert("Failed to update status. Check database connection.");
            console.error(error);
        } else {
            fetchAllData();
        }
        setSaving(false);
    };

    // --- EVENT HANDLERS ---
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await supabase.from('events').insert([{ title: newEventTitle, short_description: newEventShort, long_description: newEventLong, is_active: eventsList.length === 0 }]);
        setNewEventTitle(''); setNewEventShort(''); setNewEventLong(''); fetchAllData(); setSaving(false);
    };
    const handleSetEventActive = async (id: string) => { if (!confirm("Set this as the main Home Page event?")) return; setSaving(true); await supabase.from('events').update({ is_active: true }).eq('id', id); fetchAllData(); setSaving(false); };
    const handleDeleteEvent = async (id: string, title: string) => { if (!confirm(`Delete "${title}"? This cannot be undone.`)) return; setSaving(true); await supabase.from('events').delete().eq('id', id); fetchAllData(); setSaving(false); };

    // --- CATEGORY HANDLERS ---
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        await supabase.from('categories').insert([{ title: newCatTitle, price: Number(newCatPrice), description: newCatDesc, is_enquiry_only: newCatIsEnquiry }]);
        setNewCatTitle(''); setNewCatPrice(''); setNewCatDesc(''); setNewCatIsEnquiry(false); fetchAllData(); setSaving(false);
    };
    const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
        setSaving(true); await supabase.from('categories').update(updates).eq('id', id); fetchAllData(); setSaving(false); alert("Tier parameters updated successfully.");
    };
    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Delete this category? Registrations tied to it will be preserved safely.")) return; setSaving(true); await supabase.from('categories').delete().eq('id', id); fetchAllData(); setSaving(false);
    };

    // --- MEDIA HANDLERS ---
    const handleAddMedia = async (e: React.FormEvent) => {
        e.preventDefault(); if (!mediaUrl || !mediaEventId) return alert("Select an event to link this media to."); setSaving(true);
        let cleanUrl = mediaUrl; if (mediaType === 'youtube' && cleanUrl.includes('watch?v=')) { cleanUrl = cleanUrl.replace('watch?v=', 'embed/'); }
        await supabase.from('event_media').insert([{ media_type: mediaType, url: cleanUrl, caption: mediaCaption, event_id: mediaEventId }]);
        setMediaUrl(''); setMediaCaption(''); fetchAllData(); setSaving(false);
    };
    const handleDeleteMedia = async (id: string) => { if (!confirm("Delete this media asset?")) return; setSaving(true); await supabase.from('event_media').delete().eq('id', id); fetchAllData(); setSaving(false); };

    // --- FILTERING ENGINE ---
    const uniqueCategories = Array.from(new Set(registrations.map(r => r.categories?.title).filter(Boolean)));
    const filteredRegistrations = registrations.filter(reg => {
        const searchMatch = `${reg.first_name} ${reg.last_name} ${reg.phone}`.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || reg.payment_status === statusFilter;
        const catTitle = reg.categories?.title || 'Deleted Tier';
        const catMatch = categoryFilter === 'all' || (categoryFilter === 'Deleted' && !reg.categories) || catTitle === categoryFilter;
        let dateMatch = true;
        if (startDate) { dateMatch = dateMatch && new Date(reg.created_at) >= new Date(startDate); }
        if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); dateMatch = dateMatch && new Date(reg.created_at) < end; }
        return searchMatch && statusMatch && catMatch && dateMatch;
    });

    const totalRevenue = filteredRegistrations.filter(r => r.payment_status === 'completed').reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const completedCount = filteredRegistrations.filter(r => r.payment_status === 'completed').length;

    const categoryMetrics = filteredRegistrations.reduce((acc, reg) => {
        if (reg.payment_status === 'completed' || reg.payment_status === 'enquired' || reg.payment_status === 'contacted') {
            const catTitle = reg.categories?.title || 'Deleted Tier';
            acc[catTitle] = (acc[catTitle] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const downloadCSV = () => {
        const headers = ["Date", "Status", "Title", "First Name", "Last Name", "Gender", "DOB", "Phone", "Email", "Pincode", "Taluka", "State", "Category", "Attendees", "Donation", "Total Paid", "Issue/Samasya", "Razorpay ID"];
        const csvData = filteredRegistrations.map(reg => [
            new Date(reg.created_at).toLocaleDateString(), reg.payment_status.toUpperCase(), reg.salutation || '', reg.first_name || '', reg.last_name || '', reg.gender || '', reg.date_of_birth || '', reg.phone || '', reg.email || '', reg.pincode || '', reg.taluka || '', reg.state || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, `"${(reg.problem_samasya || '').replace(/"/g, '""')}"`, reg.razorpay_payment_id || 'N/A'
        ]);
        const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `BaglaBhairav_Registrations_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter system password" className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition">Unlock Terminal</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">

            {activeEvent && (
                <div className="max-w-7xl mx-auto mb-6 bg-neutral-900 text-white px-6 py-3 rounded-xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                        <span className="text-sm font-medium text-neutral-300">Currently Active Live Event:</span>
                        <span className="font-bold tracking-wide">{activeEvent.title}</span>
                    </div>
                </div>
            )}

            {selectedRegistration && (
                <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                            <h2 className="text-xl font-bold text-neutral-900">Registration Details</h2>
                            <button onClick={() => setSelectedRegistration(null)} className="p-2 text-neutral-400 hover:text-red-600 transition rounded-full hover:bg-red-50"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Profile Info</h3>
                                    <p><span className="text-neutral-500 block text-xs">Name</span><span className="font-semibold">{selectedRegistration.salutation} {selectedRegistration.first_name} {selectedRegistration.last_name}</span></p>
                                    <p className="mt-3"><span className="text-neutral-500 block text-xs">DOB / Gender</span><span>{selectedRegistration.date_of_birth} ({selectedRegistration.gender})</span></p>
                                    <p className="mt-3"><span className="text-neutral-500 block text-xs">Total Attendees</span><span className="font-bold">{selectedRegistration.attendees_count} Person(s)</span></p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Communications</h3>
                                    <p><span className="text-neutral-500 block text-xs">Contact Info</span><span className="font-semibold block">{selectedRegistration.phone}</span><span className="text-xs text-neutral-600">{selectedRegistration.email}</span></p>
                                    <p className="mt-3"><span className="text-neutral-500 block text-xs">Address</span><span>{selectedRegistration.taluka}, {selectedRegistration.state} - {selectedRegistration.pincode}</span></p>
                                </div>
                                <div className="col-span-1 md:col-span-2 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                    <span className="text-xs uppercase tracking-wider font-bold text-orange-800 block mb-1">Issue/Samasya Provided</span>
                                    <p className="text-neutral-900 whitespace-pre-wrap">{selectedRegistration.problem_samasya || "None declared."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto mb-8 border-b border-neutral-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Control Center</h1>
                </div>
                <div className="flex bg-neutral-200 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setActiveTab('registrations')} className={`w-full md:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg transition flex justify-center items-center gap-2 ${activeTab === 'registrations' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-neutral-300/50'}`}><ListFilter className="w-4 h-4" /> Registrations</button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full md:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg transition flex justify-center items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-neutral-300/50'}`}><Settings className="w-4 h-4" /> System Settings</button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">

                {activeTab === 'registrations' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Confirmed Attendees</p><p className="text-2xl font-bold">{completedCount}</p></div>
                            </div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Filtered Revenue</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
                            </div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Filtered Attempts</p><p className="text-2xl font-bold">{filteredRegistrations.length}</p></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2"><Ticket className="w-4 h-4" /> Sales & Enquiries per Category</h3>
                            <div className="flex flex-wrap gap-4">
                                {Object.keys(categoryMetrics).length === 0 ? <span className="text-sm text-neutral-400">No data matches current filters.</span> : Object.entries(categoryMetrics).map(([cat, count]) => (
                                    <div key={cat} className="bg-neutral-50 border border-neutral-200 px-4 py-2 rounded-lg flex items-center gap-3"><span className="font-semibold text-neutral-700 text-sm">{cat}</span><span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">{count}</span></div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
                            <div className="relative w-full lg:w-1/4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input type="text" placeholder="Search name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                            </div>

                            <div className="flex flex-wrap lg:flex-nowrap gap-4 w-full lg:w-auto items-center">
                                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus-within:border-orange-600 transition">
                                    <CalendarIcon className="w-4 h-4 text-neutral-400" />
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent focus:outline-none text-neutral-600" />
                                    <span className="text-neutral-400">-</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent focus:outline-none text-neutral-600" />
                                </div>
                                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600">
                                    <option value="all">All Categories</option>{uniqueCategories.map((cat, idx) => <option key={idx} value={cat as string}>{cat}</option>)}<option value="Deleted"> [Deleted Tiers]</option>
                                </select>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600">
                                    <option value="all">All Statuses</option>
                                    <option value="completed">Completed (Paid)</option>
                                    <option value="enquired">Enquired (Pending Connect)</option>
                                    <option value="contacted">Contacted (In Progress)</option>
                                    <option value="pending">Pending Checkout</option>
                                    <option value="failed">Failed Payment</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                                <button onClick={downloadCSV} className="bg-neutral-900 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition"><Download className="w-4 h-4" /> Export CSV</button>
                            </div>
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-neutral-100 text-neutral-600 font-medium border-b border-neutral-200">
                                        <tr>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Name & Contact</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {loading ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">Loading ledger data...</td></tr>) : filteredRegistrations.length === 0 ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">No records match your filters.</td></tr>) : (
                                            filteredRegistrations.map((reg) => (
                                                <tr key={reg.id} className="hover:bg-neutral-50 transition">
                                                    <td className="px-6 py-4">
                                                        {/* INTERACTIVE STATUS DROPDOWN */}
                                                        <select
                                                            value={reg.payment_status}
                                                            onChange={(e) => handleUpdateStatus(reg.id, e.target.value)}
                                                            disabled={saving}
                                                            className={`py-1 px-2.5 rounded-full text-xs font-semibold cursor-pointer outline-none border hover:shadow-sm transition-all focus:ring-2 focus:ring-orange-500 disabled:opacity-50 ${reg.payment_status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                    reg.payment_status === 'enquired' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                        reg.payment_status === 'contacted' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                                            reg.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                                                reg.payment_status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                                    'bg-neutral-200 text-neutral-700 border-neutral-300'
                                                                }`}
                                                        >
                                                            <option value="completed">✔ Paid</option>
                                                            <option value="enquired">💬 Enquired</option>
                                                            <option value="contacted">📞 Contacted</option>
                                                            <option value="pending">⏳ Pending</option>
                                                            <option value="failed">✖ Failed</option>
                                                            <option value="refunded">⏪ Refunded</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-neutral-900">{reg.first_name} {reg.last_name}<br /><span className="text-xs font-normal text-neutral-500">{reg.phone}</span></td>
                                                    <td className="px-6 py-4 text-neutral-600">{reg.categories?.title || 'Deleted Category'}</td>
                                                    <td className="px-6 py-4 font-bold text-neutral-900">₹{reg.total_amount}</td>
                                                    <td className="px-6 py-4 text-neutral-500">{new Date(reg.created_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-center"><button onClick={() => setSelectedRegistration(reg)} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shadow-sm"><Eye className="w-4 h-4" /></button></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                        <div className="w-full md:w-64 bg-neutral-50 border-r border-neutral-200 p-4 space-y-2">
                            <button onClick={() => setSettingsSubTab('events')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${settingsSubTab === 'events' ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><CalendarDays className="w-4 h-4" /> Event Setup</button>
                            <button onClick={() => setSettingsSubTab('tiers')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${settingsSubTab === 'tiers' ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><Ticket className="w-4 h-4" /> Ticket Tiers</button>
                            <button onClick={() => setSettingsSubTab('media')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition ${settingsSubTab === 'media' ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><ImageIcon className="w-4 h-4" /> Media Gallery</button>
                        </div>

                        <div className="flex-1 p-6 lg:p-8 bg-white overflow-y-auto">
                            {settingsSubTab === 'events' && (
                                <div className="max-w-3xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b border-neutral-200 pb-4 text-neutral-900">Yearly Event Management</h2>
                                    <form onSubmit={handleCreateEvent} className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-8 space-y-4">
                                        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 mb-2">Create New Event</h3>
                                        <input type="text" placeholder="Event Title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required />
                                        <textarea placeholder="Short Description (Appears on Home Page)" value={newEventShort} onChange={(e) => setNewEventShort(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 resize-none text-sm" rows={2} required />
                                        <textarea placeholder="Long Description (Appears on Previous Events pages)" value={newEventLong} onChange={(e) => setNewEventLong(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 resize-none text-sm h-24" required />
                                        <button type="submit" disabled={saving} className="bg-neutral-900 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition">Deploy Event</button>
                                    </form>
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500 mb-4">Event History Log</h3>
                                    <div className="space-y-4">
                                        {eventsList.map(ev => (
                                            <div key={ev.id} className={`p-5 rounded-xl border ${ev.is_active ? 'border-orange-300 bg-orange-50/50 shadow-sm' : 'border-neutral-200 bg-white'}`}>
                                                <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-lg text-neutral-900">{ev.title}</h4><div className="flex items-center gap-2">{ev.is_active ? <span className="bg-orange-600 text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded">Active Homepage</span> : <button onClick={() => handleSetEventActive(ev.id)} className="text-xs font-semibold border border-neutral-300 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition">Set Active</button>}<button onClick={() => handleDeleteEvent(ev.id, ev.title)} className="text-neutral-400 hover:text-red-600 p-1.5 border border-transparent hover:border-red-200 rounded-lg hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button></div></div>
                                                <p className="text-sm text-neutral-600 leading-relaxed">{ev.short_description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'tiers' && (
                                <div className="max-w-4xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b border-neutral-200 pb-4 text-neutral-900">Ticket Categories & Pricing</h2>
                                    <form onSubmit={handleCreateCategory} className="flex flex-col gap-4 mb-8 bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Tier Title</label>
                                                <input type="text" placeholder="e.g. VIP Pass" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Status Type</label>
                                                <select value={newCatIsEnquiry ? 'yes' : 'no'} onChange={(e) => setNewCatIsEnquiry(e.target.value === 'yes')} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm bg-white cursor-pointer">
                                                    <option value="no">Standard Paid Tier</option>
                                                    <option value="yes">Enquiry Only (Hide Price)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Price (₹)</label>
                                                <input type="number" placeholder="5000" value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)} disabled={newCatIsEnquiry} className="w-full md:w-32 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm disabled:opacity-50" required={!newCatIsEnquiry} />
                                            </div>
                                        </div>
                                        <button type="submit" disabled={saving} className="w-full bg-neutral-900 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">Deploy New Tier</button>
                                    </form>
                                    <div className="space-y-6">
                                        {categoriesList.map((cat) => (
                                            <CategoryRow key={cat.id} category={cat} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'media' && (
                                <div className="max-w-4xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b border-neutral-200 pb-4 text-neutral-900">Gallery & Video Injector</h2>
                                    <form onSubmit={handleAddMedia} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-50 p-6 border border-neutral-200 rounded-xl mb-8">
                                        <div className="md:col-span-2"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Asset URL</label><input type="url" placeholder="https://..." value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" required /></div>
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Media Type</label><select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'youtube')} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-600 cursor-pointer"><option value="image">Image</option><option value="youtube">YouTube</option></select></div>
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Link Event</label><select value={mediaEventId} onChange={(e) => setMediaEventId(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-600 cursor-pointer"><option value="" disabled>Select Event</option>{eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div>
                                        <div className="md:col-span-3"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Caption / Subtext</label><input type="text" placeholder="e.g., Opening Ceremony Highlights" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" /></div>
                                        <div className="md:col-span-1 flex items-end"><button type="submit" disabled={saving} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition flex justify-center items-center gap-2"><Plus className="w-4 h-4" /> Inject</button></div>
                                    </form>
                                    <div className="space-y-4">
                                        {mediaList.map((media) => (
                                            <div key={media.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-neutral-200 rounded-xl bg-white shadow-sm gap-4 hover:border-neutral-300 transition">
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="w-24 h-16 bg-neutral-100 rounded-md overflow-hidden flex items-center justify-center border border-neutral-200 flex-shrink-0 relative">
                                                        {media.media_type === 'image' ? <img src={media.url} alt="media" className="w-full h-full object-cover" /> : <Video className="w-6 h-6 text-neutral-400" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-neutral-900">{media.caption || 'Untitled Asset'}</p>
                                                        <div className="flex items-center gap-2 mt-1.5"><span className="uppercase tracking-wider font-bold text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">{media.media_type}</span><span className="text-xs text-neutral-500">Linked to: {media.events?.title || 'Unknown Event'}</span></div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteMedia(media.id)} className="text-neutral-400 hover:text-red-600 p-2 border border-transparent hover:border-red-200 rounded-lg bg-neutral-50 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {mediaList.length === 0 && <div className="p-8 text-center text-neutral-400 border border-dashed border-neutral-300 rounded-xl bg-neutral-50">No media assets found.</div>}
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

// ============================================================================
// COMPONENT: CategoryRow 
// ============================================================================
function CategoryRow({ category, onUpdate, onDelete }: { category: Category, onUpdate: (id: string, updates: Partial<Category>) => void, onDelete: (id: string) => void }) {
    const [price, setPrice] = useState(category.price);
    const [mediaUrl, setMediaUrl] = useState(category.media_url || '');
    const [desc, setDesc] = useState(category.description || '');
    const [detailedDesc, setDetailedDesc] = useState(category.detailed_description || '');
    const [isFull, setIsFull] = useState(category.is_full);
    const [isEnquiry, setIsEnquiry] = useState(category.is_enquiry_only || false);
    const [isChanged, setIsChanged] = useState(false);

    const handleUpdateClick = () => {
        onUpdate(category.id, { price, media_url: mediaUrl, description: desc, detailed_description: detailedDesc, is_full: isFull, is_enquiry_only: isEnquiry });
        setIsChanged(false);
    };

    return (
        <div className="border border-neutral-200 rounded-xl p-5 bg-white shadow-sm relative transition-all hover:border-neutral-300">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h4 className="font-bold text-lg text-neutral-900 pr-8">{category.title}</h4>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={isEnquiry ? 'yes' : 'no'} onChange={(e) => { setIsEnquiry(e.target.value === 'yes'); setIsChanged(true); }} className={`text-xs border rounded-lg px-2.5 py-1.5 font-bold cursor-pointer outline-none transition ${isEnquiry ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
                        <option value="no">💳 Standard Paid Tier</option>
                        <option value="yes">💬 Enquiry Only</option>
                    </select>
                    <select value={isFull ? 'full' : 'open'} onChange={(e) => { setIsFull(e.target.value === 'full'); setIsChanged(true); }} className={`text-xs border rounded-lg px-2.5 py-1.5 font-bold cursor-pointer outline-none transition ${isFull ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        <option value="open">🟢 Slots Open</option>
                        <option value="full">🔴 Capacity Full</option>
                    </select>
                    <button onClick={() => onDelete(category.id)} className="text-neutral-400 hover:text-red-600 p-1.5 border border-transparent hover:border-red-200 rounded bg-neutral-50 hover:bg-red-50 transition" title="Delete Category"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Fee Amount (₹)</label><input type="number" value={price} onChange={(e) => { setPrice(Number(e.target.value)); setIsChanged(true); }} disabled={isEnquiry} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition disabled:opacity-50" /></div>
                <div><label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Thumbnail Media URL</label><input type="text" placeholder="https://..." value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-2"><label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Short Summary (Home Page)</label><input type="text" value={desc} onChange={(e) => { setDesc(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-2"><label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Detailed Description (Perks)</label><textarea value={detailedDesc} onChange={(e) => { setDetailedDesc(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition h-20 resize-none" /></div>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-end">
                <button onClick={handleUpdateClick} disabled={!isChanged} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${isChanged ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'}`}><Save className="w-4 h-4" />{isChanged ? "Commit Updates" : "Up to date"}</button>
            </div>
        </div>
    );
}