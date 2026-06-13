// app/admin/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Lock, Download, Users, IndianRupee, Activity, CheckCircle,
    XCircle, RotateCcw, Search, Filter, Eye, X, Settings, ListFilter, Save, Trash2, Plus, AlertTriangle, Image as ImageIcon, Video
} from 'lucide-react';

interface Registration {
    id: string;
    created_at: string;
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
    first_name: string;
    last_name: string;
    salutation: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    email: string;
    pincode: string;
    taluka: string;
    state: string;
    problem_samasya: string;
    attendees_count: number;
    donation_amount: number;
    total_amount: number;
    razorpay_payment_id: string | null;
    categories: { title: string } | null;
}

interface Category {
    id: string;
    title: string;
    price: number;
    description: string;
    is_full: boolean;
}

interface EventDetails {
    title: string;
    description_text: string;
}

// NEW: Media Schema Interface
interface MediaItem {
    id: string;
    media_type: 'image' | 'youtube';
    url: string;
    caption: string;
}

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState<'registrations' | 'settings'>('registrations');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Core Datasets
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [categoriesList, setCategoriesList] = useState<Category[]>([]);
    const [eventDetails, setEventDetails] = useState<EventDetails>({ title: '', description_text: '' });
    const [mediaList, setMediaList] = useState<MediaItem[]>([]); // New Media State

    // Creation Sub-Forms
    const [newCatTitle, setNewCatTitle] = useState('');
    const [newCatPrice, setNewCatPrice] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');

    // NEW: Media Form Inputs
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'youtube'>('image');
    const [mediaCaption, setMediaCaption] = useState('');

    // Interactive View Parameters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            fetchAllData();
        } else {
            setError("Incorrect password");
        }
    };

    const fetchAllData = async () => {
        setLoading(true);

        const { data: regData } = await supabase.from('registrations').select('*, categories(title)').order('created_at', { ascending: false });
        if (regData) setRegistrations(regData as Registration[]);

        const { data: catData } = await supabase.from('categories').select('*').order('price', { ascending: true });
        if (catData) setCategoriesList(catData as Category[]);

        const { data: pageData } = await supabase.from('page_content').select('title, description_text').eq('page_identifier', 'event_details').single();
        if (pageData) setEventDetails(pageData as EventDetails);

        // NEW: Fetch all gallery images & youtube data pipelines
        const { data: mData } = await supabase.from('event_media').select('*').order('created_at', { ascending: false });
        if (mData) setMediaList(mData as MediaItem[]);

        setLoading(false);
    };

    // Add Media Link Handler
    const handleAddMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mediaUrl) return;
        setSaving(true);

        // Clean YouTube long links to clean embed variants automatically if needed
        let cleanUrl = mediaUrl;
        if (mediaType === 'youtube' && cleanUrl.includes('watch?v=')) {
            cleanUrl = cleanUrl.replace('watch?v=', 'embed/');
        }

        const { error } = await supabase
            .from('event_media')
            .insert([{ media_type: mediaType, url: cleanUrl, caption: mediaCaption }]);

        if (error) {
            alert("Failed to inject media stream.");
        } else {
            setMediaUrl(''); setMediaCaption('');
            fetchAllData();
        }
        setSaving(false);
    };

    // Delete Media Entry
    const handleDeleteMedia = async (id: string) => {
        if (!confirm("Remove this asset from public viewports permanently?")) return;
        setSaving(true);
        await supabase.from('event_media').delete().eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatTitle || !newCatPrice) return;
        setSaving(true);
        await supabase.from('categories').insert([{ title: newCatTitle, price: Number(newCatPrice), description: newCatDesc, is_full: false }]);
        setNewCatTitle(''); setNewCatPrice(''); setNewCatDesc('');
        fetchAllData();
        setSaving(false);
    };

    const handleUpdateCategory = async (id: string, updatedPrice: number, updatedDesc: string, updatedIsFull: boolean) => {
        setSaving(true);

        const { data, error } = await supabase
            .from('categories')
            .update({ price: updatedPrice, description: updatedDesc, is_full: updatedIsFull })
            .eq('id', id)
            .select(); // Forces the database to send back the updated row

        if (error) {
            console.error("🚨 Update Failed:", error);
            alert(`Failed to save category parameters: ${error.message}`);
        } else if (!data || data.length === 0) {
            alert("⚠️ The server accepted the request, but 0 rows were updated. Check your RLS settings.");
        } else {
            alert("✅ Category updated successfully!");
            fetchAllData(); // Refresh the list with fresh values
        }

        setSaving(false);
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}" category tier safely?`)) return;
        setSaving(true);
        await supabase.from('categories').delete().eq('id', id);
        fetchAllData();
        setSaving(false);
    };

    // Save Event Details Handler with Strict Error Reporting
    const handleSaveEventDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { data, error } = await supabase
            .from('page_content')
            .update({
                title: eventDetails.title,
                description_text: eventDetails.description_text
            })
            .eq('page_identifier', 'event_details')
            .select(); // Using select() forces Postgres to return what it changed

        if (error) {
            console.error("🚨 Database Error:", error);
            alert(`Database rejected update: ${error.message} (Code: ${error.code})`);
        } else if (!data || data.length === 0) {
            alert("⚠️ Request sent, but no row found matching 'event_details' in the database.");
        } else {
            alert("✅ Event details successfully written to the database!");
        }

        setSaving(false);
    };

    const downloadCSV = () => {
        const headers = ["Date", "Status", "Title", "First Name", "Last Name", "Gender", "DOB", "Phone", "Email", "Pincode", "Taluka", "State", "Category", "Attendees", "Donation", "Total Paid", "Issue/Samasya", "Razorpay ID"];
        const csvData = filteredRegistrations.map(reg => [
            new Date(reg.created_at).toLocaleDateString(), reg.payment_status.toUpperCase(), reg.salutation || '', reg.first_name || '', reg.last_name || '', reg.gender || '', reg.date_of_birth || '', reg.phone || '', reg.email || '', reg.pincode || '', reg.taluka || '', reg.state || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, `"${(reg.problem_samasya || '').replace(/"/g, '""')}"`, reg.razorpay_payment_id || 'N/A'
        ]);
        const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob); link.download = `Shankhnad_Registrations.csv`; link.click();
    };

    const uniqueCategories = Array.from(new Set(registrations.map(r => r.categories?.title).filter(Boolean)));

    const filteredRegistrations = registrations.filter(reg => {
        const fullName = `${reg.first_name} ${reg.last_name}`.toLowerCase();
        const phone = reg.phone || '';
        const categoryTitle = reg.categories?.title || 'Deleted Tier';
        return (fullName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm)) &&
            (statusFilter === 'all' || reg.payment_status === statusFilter) &&
            (categoryFilter === 'all' || (categoryFilter === 'Deleted' && !reg.categories) || categoryTitle === categoryFilter);
    });

    const totalRevenue = registrations.filter(r => r.payment_status === 'completed').reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const completedCount = registrations.filter(r => r.payment_status === 'completed').length;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-bold mb-2">Admin Control Center</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none" />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition">Unlock Terminal</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">

            {/* GLOBAL VIEW OVERLAY CONTAINER MODAL */}
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
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Communications</h3>
                                    <p><span className="text-neutral-500 block text-xs">WhatsApp</span><span className="font-semibold">{selectedRegistration.phone}</span></p>
                                    <p className="mt-2"><span className="text-neutral-500 block text-xs">Address Parameters</span><span>{selectedRegistration.taluka}, {selectedRegistration.state} - {selectedRegistration.pincode}</span></p>
                                </div>
                                <div className="col-span-2 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                                    <span className="text-xs uppercase tracking-wider font-bold text-orange-800 block mb-1">Issue/Samasya Context</span>
                                    <p className="text-neutral-900 whitespace-pre-wrap">{selectedRegistration.problem_samasya || "None declared."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-neutral-200 pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900">Control Center</h1>
                        <p className="text-neutral-500">Unified pipeline parameters terminal.</p>
                    </div>
                    <div className="flex bg-neutral-200 p-1 rounded-xl w-full md:w-auto">
                        <button onClick={() => setActiveTab('registrations')} className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'registrations' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'}`}><ListFilter className="w-4 h-4" /> Registrations</button>
                        <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'settings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'}`}><Settings className="w-4 h-4" /> System Settings</button>
                    </div>
                </div>

                {/* REGISTRATIONS PIPELINE SCREEN */}
                {activeTab === 'registrations' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Confirmed Attendees</p><p className="text-2xl font-bold">{completedCount}</p></div>
                            </div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Revenue Metrics</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
                            </div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm">
                                <div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                                <div><p className="text-sm font-medium text-neutral-500">Total Attempts Logged</p><p className="text-2xl font-bold">{registrations.length}</p></div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input type="text" placeholder="Search parameters..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none" />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2.5 bg-neutral-50 border rounded-lg text-sm focus:outline-none"><option value="all">All Categories</option>{uniqueCategories.map((cat, idx) => <option key={idx} value={cat as string}>{cat}</option>)}<option value="Deleted"> [Deleted Tiers]</option></select>
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-neutral-50 border rounded-lg text-sm focus:outline-none"><option value="all">All Statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select>
                                <button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 text-sm transition"><Download className="w-4 h-4" /> Export Ledger</button>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-neutral-100 text-neutral-600 font-medium border-b">
                                    <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-center">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {loading ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">Loading registrations ledger...</td></tr>) : filteredRegistrations.length === 0 ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">Zero entries mapped to structural filters.</td></tr>) : (
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
                    </>
                )}

                {/* CMS SETTINGS TAB VIEW */}
                {activeTab === 'settings' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* COLUMN 1: EDIT PARAGRAPHS & CORE DETAILS */}
                        <div className="space-y-6 lg:col-span-1">
                            <div className="bg-white border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-neutral-900 mb-1">Global Site Content</h3>
                                <p className="text-xs text-neutral-400 mb-4">Re-write structural page values across endpoints.</p>
                                <form onSubmit={handleSaveEventDetails} className="space-y-4">
                                    <div><label className="block text-xs font-bold text-neutral-700 mb-1 uppercase">Title Header</label><input type="text" value={eventDetails.title} onChange={(e) => setEventDetails({ ...eventDetails, title: e.target.value })} className="w-full px-3 py-2 text-sm bg-neutral-50 border rounded-lg focus:outline-none" required /></div>
                                    <div><label className="block text-xs font-bold text-neutral-700 mb-1 uppercase">Summary Body</label><textarea rows={3} value={eventDetails.description_text} onChange={(e) => setEventDetails({ ...eventDetails, description_text: e.target.value })} className="w-full px-3 py-2 text-sm bg-neutral-50 border rounded-lg focus:outline-none resize-none" required /></div>
                                    <button type="submit" disabled={saving} className="w-full bg-neutral-900 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-orange-600 transition">Save Changes</button>
                                </form>
                            </div>

                            <div className="bg-white border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-neutral-900 mb-1">Add Ticket Category</h3>
                                <p className="text-xs text-neutral-400 mb-4">Inject unique transactional configuration vectors.</p>
                                <form onSubmit={handleCreateCategory} className="space-y-4">
                                    <div><label className="block text-xs font-bold text-neutral-700 mb-1 uppercase">Tier Label</label><input type="text" placeholder="VIP Pass" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-neutral-50 border rounded-lg focus:outline-none" required /></div>
                                    <div><label className="block text-xs font-bold text-neutral-700 mb-1 uppercase">Price Point (INR)</label><input type="number" placeholder="5000" value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)} className="w-full px-3 py-2 text-sm bg-neutral-50 border rounded-lg focus:outline-none" required /></div>
                                    <div><label className="block text-xs font-bold text-neutral-700 mb-1 uppercase">Meta Subtext</label><input type="text" placeholder="Front row reservation perks..." value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} className="w-full px-3 py-2 text-sm bg-neutral-50 border rounded-lg focus:outline-none" /></div>
                                    <button type="submit" disabled={saving} className="w-full bg-orange-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-neutral-950 transition">Deploy Tier</button>
                                </form>
                            </div>
                        </div>

                        {/* COLUMN 2 & 3: CATEGORIES LISTING & BRAND-NEW MEDIA MANAGER AREA */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* TIER ALLOCATIONS MATRIX */}
                            <div className="bg-white border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-neutral-900 mb-1">Active Ticket Tiers</h3>
                                <p className="text-xs text-neutral-400 mb-4">Edit costs or flag registration capacities securely.</p>
                                <div className="space-y-6 divide-y">
                                    {categoriesList.map((cat, idx) => (
                                        <CategoryRow key={cat.id} category={cat} index={idx} onSave={handleUpdateCategory} onDelete={handleDeleteCategory} />
                                    ))}
                                </div>
                            </div>

                            {/* BRAND NEW: MEDIA STREAM PLATFORM INTEGRATION SYSTEM CONTAINER */}
                            <div className="bg-white border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-neutral-900 mb-1">Image Gallery & YouTube Streams</h3>
                                <p className="text-xs text-neutral-400 mb-6">Manage imagery paths and continuous video feed streams across system grids.</p>

                                {/* Sub-form injection */}
                                <form onSubmit={handleAddMedia} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-50 p-4 border rounded-xl mb-6 items-end">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Type</label>
                                        <select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'youtube')} className="w-full px-3 py-2 bg-white text-sm border rounded-lg focus:outline-none cursor-pointer">
                                            <option value="image">🖼️ Gallery Image</option>
                                            <option value="youtube">📺 YouTube Stream</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Asset Link / Destination URL</label>
                                        <input type="url" placeholder={mediaType === 'image' ? "https://site.com/image.jpg" : "https://youtube.com/watch?v=..."} value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none" required />
                                    </div>
                                    <div className="md:col-span-1">
                                        <button type="submit" disabled={saving} className="w-full bg-neutral-950 hover:bg-orange-600 text-white text-xs font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Inject Media</button>
                                    </div>
                                    <div className="col-span-1 md:col-span-4 mt-1">
                                        <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase">Caption / Identification Subtext</label>
                                        <input type="text" placeholder="e.g., Opening Session Highlight Layout" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none bg-white" />
                                    </div>
                                </form>

                                {/* Asset Display List Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mediaList.length === 0 ? (
                                        <div className="col-span-2 p-6 text-center text-xs text-neutral-400 border border-dashed rounded-xl">No assets or media layouts injected into public viewports yet.</div>
                                    ) : (
                                        mediaList.map((media) => (
                                            <div key={media.id} className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 flex flex-col justify-between group">

                                                {/* Media Preview Pipeline */}
                                                <div className="aspect-video bg-neutral-200 relative flex items-center justify-center overflow-hidden border-b">
                                                    {media.media_type === 'image' ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={media.url} alt={media.caption} className="object-cover w-full h-full" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Invalid+Image+URL" }} />
                                                    ) : (
                                                        <iframe src={media.url} className="w-full h-full pointer-events-none" title={media.caption} frameBorder="0" allowFullScreen />
                                                    )}
                                                    <div className="absolute top-2 left-2 bg-neutral-950/80 text-white text-[10px] uppercase font-mono px-2 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
                                                        {media.media_type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                                        {media.media_type}
                                                    </div>
                                                </div>

                                                {/* Caption details and trash hook */}
                                                <div className="p-3 flex justify-between items-center bg-white">
                                                    <p className="text-xs font-medium text-neutral-700 truncate pr-2">{media.caption || "Untitled Asset Parameter"}</p>
                                                    <button onClick={() => handleDeleteMedia(media.id)} className="text-neutral-400 hover:text-red-600 p-1 rounded transition flex-shrink-0" title="Delete Asset"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>

                                            </div>
                                        ))
                                    )}
                                </div>

                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

// Inline Subcomponent
interface CategoryRowProps {
    category: Category; index: number;
    onSave: (id: string, price: number, description: string, isFull: boolean) => Promise<void>;
    onDelete: (id: string, name: string) => Promise<void>;
}
function CategoryRow({ category, index, onSave, onDelete }: CategoryRowProps) {
    const [price, setPrice] = useState(category.price);
    const [description, setDescription] = useState(category.description);
    const [isFull, setIsFull] = useState(category.is_full || false);
    const [isChanged, setIsChanged] = useState(false);
    return (
        <div className={`pt-6 ${index === 0 ? 'pt-0' : ''}`}>
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-sm text-neutral-900 bg-neutral-100 px-3 py-0.5 rounded">{category.title}</h4>
                <button onClick={() => onDelete(category.id, category.title)} className="text-neutral-400 hover:text-red-600 p-1 rounded transition"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div><label className="block text-[11px] font-medium text-neutral-400">Fee (INR)</label><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">₹</span><input type="number" value={price} onChange={(e) => { setPrice(Number(e.target.value)); setIsChanged(true); }} className="w-full pl-6 pr-2 py-1.5 text-sm bg-neutral-50 border rounded-lg focus:outline-none" /></div></div>
                <div className="md:col-span-2">制造<label className="block text-[11px] font-medium text-neutral-400">Pass Details</label><input type="text" value={description} onChange={(e) => { setDescription(e.target.value); setIsChanged(true); }} className="w-full px-3 py-1.5 text-sm bg-neutral-50 border rounded-lg focus:outline-none" /></div>
                <div><label className="block text-[11px] font-medium text-neutral-400">Status</label><select value={isFull ? 'full' : 'open'} onChange={(e) => { setIsFull(e.target.value === 'full'); setIsChanged(true); }} className="w-full px-3 py-1.5 text-sm bg-neutral-50 border rounded-lg focus:outline-none cursor-pointer"><option value="open">🟢 Slots Open</option><option value="full">🔴 Full</option></select></div>
            </div>
            <div className="mt-2 flex justify-end"><button onClick={() => { onSave(category.id, price, description, isFull); setIsChanged(false); }} disabled={!isChanged} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 border transition ${isChanged ? 'bg-orange-600 border-orange-600 text-white' : 'bg-neutral-50 text-neutral-400 cursor-not-allowed'}`}><Save className="w-3.5 h-3.5" /> Commit Modifications</button></div>
        </div>
    );
}