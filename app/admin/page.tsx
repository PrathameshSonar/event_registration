// app/admin/page.tsx
"use client";

import React, { useState } from 'react';
import {
    Lock, Download, Users, IndianRupee, Activity, Eye, X, Settings, ListFilter,
    Save, Trash2, Plus, Image as ImageIcon, Video, CalendarDays,
    Ticket, Calendar as CalendarIcon, Search, LogOut
} from 'lucide-react';

type Role = 'admin' | 'viewer';
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'enquired' | 'contacted' | 'amount_mismatch';

interface Registration {
    id: string; created_at: string;
    payment_status: PaymentStatus;
    first_name: string; last_name: string; salutation: string; gender: string;
    date_of_birth: string; phone: string; email: string; pincode: string;
    taluka: string; state: string; problem_samasya: string; attendees_count: number;
    donation_amount: number; total_amount: number; razorpay_payment_id: string | null;
    gotra: string;
    categories: { title: string } | null;
}

interface Category {
    id: string; title: string; title_hi: string | null; price: number;
    description: string; description_hi: string | null;
    detailed_description: string; detailed_description_hi: string | null;
    media_url: string; is_full: boolean;
    is_enquiry_only: boolean;
    max_capacity: number;
    show_availability: boolean;
    max_attendees_per_reg: number;
}

interface EventItem {
    id: string; title: string; title_hi: string | null;
    short_description: string; short_description_hi: string | null;
    long_description: string; long_description_hi: string | null;
    date_time: string | null; date_time_hi: string | null;
    venue: string | null; venue_hi: string | null;
    map_url: string | null;
    is_active: boolean;
}
interface MediaItem { id: string; media_type: 'image' | 'youtube'; url: string; caption: string; event_id: string; events?: { title: string }; }

// Money-terminal states are locked: they cannot be edited from the dashboard.
const TERMINAL_STATUSES: PaymentStatus[] = ['completed', 'failed', 'refunded', 'amount_mismatch'];

const STATUS_LABEL: Record<PaymentStatus, string> = {
    completed: '✔ Paid', enquired: '💬 Enquired', contacted: '📞 Contacted',
    pending: '⏳ Pending', failed: '✖ Failed', refunded: '⏪ Refunded', amount_mismatch: '⚠ Amount Mismatch',
};

function statusClasses(status: PaymentStatus) {
    switch (status) {
        case 'completed': return 'bg-green-100 text-green-700 border-green-200';
        case 'enquired': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'contacted': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'failed': return 'bg-red-100 text-red-700 border-red-200';
        case 'amount_mismatch': return 'bg-orange-100 text-orange-800 border-orange-300';
        default: return 'bg-neutral-200 text-neutral-700 border-neutral-300';
    }
}

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role | null>(null);
    const isAdmin = role === 'admin';

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
    const [newEventTitleHi, setNewEventTitleHi] = useState('');
    const [newEventShortHi, setNewEventShortHi] = useState('');
    const [newEventLongHi, setNewEventLongHi] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventDateHi, setNewEventDateHi] = useState('');
    const [newEventVenue, setNewEventVenue] = useState('');
    const [newEventVenueHi, setNewEventVenueHi] = useState('');
    const [newEventMapUrl, setNewEventMapUrl] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'youtube'>('image');
    const [mediaCaption, setMediaCaption] = useState('');
    const [mediaEventId, setMediaEventId] = useState('');

    const [newCatTitle, setNewCatTitle] = useState('');
    const [newCatPrice, setNewCatPrice] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [newCatIsEnquiry, setNewCatIsEnquiry] = useState(false);
    const [newCatCapacity, setNewCatCapacity] = useState('0');
    const [newCatShowAvail, setNewCatShowAvail] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    // ----- Auth -----
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed'); return; }
            setPassword('');
            setRole(data.role);
            fetchAllData();
        } catch {
            setError('Login failed. Please try again.');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        setRole(null);
        setActiveTab('registrations');
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/data');
            if (res.status === 401) { setRole(null); return; }
            const data = await res.json();
            setRegistrations(data.registrations || []);
            setCategoriesList(data.categories || []);
            setEventsList(data.events || []);
            setMediaList(data.media || []);
            const activeEv = (data.events || []).find((ev: EventItem) => ev.is_active);
            if (activeEv) setMediaEventId(activeEv.id);
        } finally {
            setLoading(false);
        }
    };

    // Small helper for JSON mutations; returns parsed body, ok flag, and HTTP status code.
    const mutate = async (url: string, method: string, body: unknown) => {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data, status: res.status };
    };

    // Prompt for the admin password to authorize a destructive action.
    const confirmWithPassword = (message: string): string | null => {
        if (!confirm(message)) return null;
        const pwd = prompt('Re-enter the admin password to authorize this deletion:');
        return pwd && pwd.length ? pwd : null;
    };

    // ----- Registrations -----
    const handleUpdateStatus = async (id: string, newStatus: string) => {
        if (!confirm(`Change this registration's status to ${newStatus.toUpperCase()}?`)) return;
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/registrations', 'PATCH', { id, status: newStatus });
        if (!ok) alert(data.error || 'Failed to update status.'); else await fetchAllData();
        setSaving(false);
    };

    // ----- Events -----
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'POST', {
            title: newEventTitle, short_description: newEventShort, long_description: newEventLong,
            title_hi: newEventTitleHi || null, short_description_hi: newEventShortHi || null, long_description_hi: newEventLongHi || null,
            date_time: newEventDate || null, date_time_hi: newEventDateHi || null,
            venue: newEventVenue || null, venue_hi: newEventVenueHi || null,
            map_url: newEventMapUrl || null,
            makeActive: eventsList.length === 0,
        });
        if (!ok) alert(data.error || 'Failed to create event.');
        else {
            setNewEventTitle(''); setNewEventShort(''); setNewEventLong('');
            setNewEventTitleHi(''); setNewEventShortHi(''); setNewEventLongHi('');
            setNewEventDate(''); setNewEventDateHi('');
            setNewEventVenue(''); setNewEventVenueHi('');
            setNewEventMapUrl('');
            await fetchAllData();
        }
        setSaving(false);
    };
    const handleSetEventActive = async (id: string) => {
        if (!confirm('Set this as the main Home Page event?')) return; setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'PATCH', { id, setActive: true });
        if (!ok) alert(data.error || 'Failed.'); else await fetchAllData();
        setSaving(false);
    };
    const handleUpdateEvent = async (id: string, updates: Partial<EventItem>) => {
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'PATCH', { id, updates });
        if (!ok) alert(data.error || 'Update failed.'); else await fetchAllData();
        setSaving(false);
    };
    const handleDeleteEvent = async (id: string, title: string) => {
        const pwd = confirmWithPassword(`Delete "${title}"? This cannot be undone.`);
        if (!pwd) return; setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'DELETE', { id, password: pwd });
        if (!ok) alert(data.error || 'Delete failed.'); else await fetchAllData();
        setSaving(false);
    };

    // ----- Categories -----
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { ok, data } = await mutate('/api/admin/categories', 'POST', {
            title: newCatTitle, price: Number(newCatPrice), description: newCatDesc,
            is_enquiry_only: newCatIsEnquiry, max_capacity: Number(newCatCapacity), show_availability: newCatShowAvail,
        });
        if (!ok) alert(data.error || 'Failed to create tier.');
        else {
            setNewCatTitle(''); setNewCatPrice(''); setNewCatDesc('');
            setNewCatIsEnquiry(false); setNewCatCapacity('0'); setNewCatShowAvail(false);
            await fetchAllData();
        }
        setSaving(false);
    };
    const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/categories', 'PATCH', { id, updates });
        if (!ok) alert(data.error || 'Update failed.'); else { await fetchAllData(); alert('Tier parameters updated successfully.'); }
        setSaving(false);
    };
    const handleDeleteCategory = async (id: string, title: string) => {
        const password = prompt(`Enter admin password to delete "${title}":`);
        if (!password) return;
        setSaving(true);
        // First attempt (no force — server checks for paid registrations)
        const { ok, data, status } = await mutate('/api/admin/categories', 'DELETE', { id, password });
        if (!ok && status === 409 && data.hasPaid) {
            const confirmed = confirm(
                `⚠️ "${title}" has ${data.count} paid registration(s).\n\nDeleting will orphan those records (they stay in the DB but show "Deleted Tier").\n\nProceed anyway?`
            );
            if (confirmed) {
                const forced = await mutate('/api/admin/categories', 'DELETE', { id, password, force: true });
                if (!forced.ok) alert(forced.data.error || 'Delete failed.');
                else await fetchAllData();
            }
        } else if (!ok) {
            alert(data.error || 'Delete failed.');
        } else {
            await fetchAllData();
        }
        setSaving(false);
    };

    // ----- Media -----
    const handleAddMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mediaUrl || !mediaEventId) return alert('Select an event to link this media to.');
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/media', 'POST', {
            media_type: mediaType, url: mediaUrl, caption: mediaCaption, event_id: mediaEventId,
        });
        if (!ok) alert(data.error || 'Failed to add media.');
        else { setMediaUrl(''); setMediaCaption(''); await fetchAllData(); }
        setSaving(false);
    };
    const handleDeleteMedia = async (id: string) => {
        const pwd = confirmWithPassword('Delete this media asset?');
        if (!pwd) return; setSaving(true);
        const { ok, data } = await mutate('/api/admin/media', 'DELETE', { id, password: pwd });
        if (!ok) alert(data.error || 'Delete failed.'); else await fetchAllData();
        setSaving(false);
    };

    // ----- Derived data -----
    const uniqueCategories = Array.from(new Set(registrations.map(r => r.categories?.title).filter(Boolean)));
    const filteredRegistrations = registrations.filter(reg => {
        const searchMatch = `${reg.first_name} ${reg.last_name} ${reg.phone} ${reg.gotra || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || reg.payment_status === statusFilter;
        const catTitle = reg.categories?.title || 'Deleted Tier';
        const catMatch = categoryFilter === 'all' || (categoryFilter === 'Deleted' && !reg.categories) || catTitle === categoryFilter;
        let dateMatch = true;
        if (startDate) { dateMatch = dateMatch && new Date(reg.created_at) >= new Date(startDate); }
        if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); dateMatch = dateMatch && new Date(reg.created_at) < end; }
        return searchMatch && statusMatch && catMatch && dateMatch;
    });

    const totalRevenue = filteredRegistrations.filter(r => r.payment_status === 'completed').reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const totalPages = Math.max(1, Math.ceil(filteredRegistrations.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedRegistrations = filteredRegistrations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Category sales breakdown — always over the FULL (unfiltered) dataset
    const categorySales = (() => {
        const map: Record<string, { title: string; paid: number; attendees: number; revenue: number; donations: number }> = {};
        registrations.filter(r => r.payment_status === 'completed').forEach(r => {
            const title = r.categories?.title || 'Deleted Tier';
            if (!map[title]) map[title] = { title, paid: 0, attendees: 0, revenue: 0, donations: 0 };
            map[title].paid += 1;
            map[title].attendees += r.attendees_count || 1;
            map[title].revenue += Number(r.total_amount || 0);
            map[title].donations += Number(r.donation_amount || 0);
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue);
    })();
    const completedCount = filteredRegistrations.filter(r => r.payment_status === 'completed').length;

    const categoryMetrics = filteredRegistrations.reduce((acc, reg) => {
        if (reg.payment_status === 'completed' || reg.payment_status === 'enquired' || reg.payment_status === 'contacted') {
            const catTitle = reg.categories?.title || 'Deleted Tier';
            acc[catTitle] = (acc[catTitle] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const downloadCSV = () => {
        const headers = ["Date", "Status", "Title", "First Name", "Last Name", "Gotra", "Gender", "DOB", "Phone", "Email", "Pincode", "Taluka", "State", "Category", "Attendees", "Donation", "Total Paid", "Issue/Samasya", "Razorpay ID"];
        const csvData = filteredRegistrations.map(reg => [
            new Date(reg.created_at).toLocaleDateString(), reg.payment_status.toUpperCase(), reg.salutation || '', reg.first_name || '', reg.last_name || '', reg.gotra || '', reg.gender || '', reg.date_of_birth || '', reg.phone || '', reg.email || '', reg.pincode || '', reg.taluka || '', reg.state || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, `"${(reg.problem_samasya || '').replace(/"/g, '""')}"`, reg.razorpay_payment_id || 'N/A'
        ]);
        const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `BaglaBhairav_Registrations_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    };

    // ----- Login screen -----
    if (!role) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 text-neutral-900 [color-scheme:light]">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
                    <p className="text-sm text-neutral-500 mb-6">Enter your Admin or Viewer password.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter system password" className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition">Unlock Terminal</button>
                    </form>
                </div>
            </div>
        );
    }

    // Viewers cannot reach the settings tab.
    const effectiveTab = activeTab === 'settings' && !isAdmin ? 'registrations' : activeTab;

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900 [color-scheme:light]">

            <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3">
                {activeEvent ? (
                    <div className="bg-neutral-900 text-white px-4 py-3 rounded-xl flex flex-wrap items-center gap-3 shadow-lg max-w-full">
                        <span className="relative flex h-3 w-3 flex-shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                        <span className="text-sm font-medium text-neutral-300 whitespace-nowrap">Live Event:</span>
                        <span className="font-bold tracking-wide break-all">{activeEvent.title}</span>
                    </div>
                ) : <div />}
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-neutral-200 text-neutral-600'}`}>
                        {isAdmin ? 'Admin' : 'Viewer (read-only)'}
                    </span>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-red-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-red-200 hover:bg-red-50 transition"><LogOut className="w-4 h-4" /> Logout</button>
                </div>
            </div>

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
                                    <p className="mt-3"><span className="text-neutral-500 block text-xs">Gotra</span><span className="font-semibold">{selectedRegistration.gotra || 'Not provided'}</span></p>
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
                <div><h1 className="text-3xl font-bold text-neutral-900">Control Center</h1></div>
                <div className="flex bg-neutral-200 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setActiveTab('registrations')} className={`w-full md:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg transition flex justify-center items-center gap-2 ${effectiveTab === 'registrations' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-neutral-300/50'}`}><ListFilter className="w-4 h-4" /> Registrations</button>
                    {isAdmin && (
                        <button onClick={() => setActiveTab('settings')} className={`w-full md:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg transition flex justify-center items-center gap-2 ${effectiveTab === 'settings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-neutral-300/50'}`}><Settings className="w-4 h-4" /> System Settings</button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {effectiveTab === 'registrations' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Confirmed Attendees</p><p className="text-2xl font-bold">{completedCount}</p></div></div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Filtered Revenue</p><p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div></div>
                            <div className="bg-white border border-neutral-200 p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Filtered Attempts</p><p className="text-2xl font-bold">{filteredRegistrations.length}</p></div></div>
                        </div>

                        {/* Sales per category */}
                        {categorySales.length > 0 && (
                            <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4 text-green-600" />
                                    <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Sales by Category (All-time, Paid only)</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-neutral-50 border-b border-neutral-100">
                                            <tr>
                                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Category</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Registrations</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Attendees</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Donations</th>
                                                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {categorySales.map(row => (
                                                <tr key={row.title} className="hover:bg-neutral-50 transition">
                                                    <td className="px-6 py-3 font-semibold text-neutral-900">{row.title}</td>
                                                    <td className="px-6 py-3 text-right text-neutral-700">{row.paid}</td>
                                                    <td className="px-6 py-3 text-right text-neutral-700">{row.attendees}</td>
                                                    <td className="px-6 py-3 text-right text-neutral-500">₹{row.donations.toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-3 text-right font-bold text-green-700">₹{row.revenue.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
                                            <tr>
                                                <td className="px-6 py-3 font-bold text-neutral-900">Total</td>
                                                <td className="px-6 py-3 text-right font-bold text-neutral-900">{categorySales.reduce((s, r) => s + r.paid, 0)}</td>
                                                <td className="px-6 py-3 text-right font-bold text-neutral-900">{categorySales.reduce((s, r) => s + r.attendees, 0)}</td>
                                                <td className="px-6 py-3 text-right font-bold text-neutral-500">₹{categorySales.reduce((s, r) => s + r.donations, 0).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-3 text-right font-bold text-green-800 text-base">₹{categorySales.reduce((s, r) => s + r.revenue, 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2"><Ticket className="w-4 h-4" /> Sales & Enquiries per Category</h3>
                            <div className="flex flex-wrap gap-4">
                                {Object.keys(categoryMetrics).length === 0 ? <span className="text-sm text-neutral-400">No data matches current filters.</span> : Object.entries(categoryMetrics).map(([cat, count]) => (
                                    <div key={cat} className="bg-neutral-50 border border-neutral-200 px-4 py-2 rounded-lg flex items-center gap-3"><span className="font-semibold text-neutral-700 text-sm">{cat}</span><span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">{count}</span></div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input type="text" placeholder="Search name, gotra, or phone..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                                </div>
                                <button onClick={downloadCSV} className="bg-neutral-900 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><Download className="w-4 h-4" /> Export CSV</button>
                            </div>
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus-within:border-orange-600 transition flex-wrap"><CalendarIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent focus:outline-none text-neutral-600 min-w-0" /><span className="text-neutral-400">–</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent focus:outline-none text-neutral-600 min-w-0" /></div>
                                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[140px] px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"><option value="all">All Categories</option>{uniqueCategories.map((cat, idx) => <option key={idx} value={cat as string}>{cat}</option>)}<option value="Deleted"> [Deleted Tiers]</option></select>
                                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[160px] px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600">
                                    <option value="all">All Statuses</option><option value="completed">Completed (Paid)</option><option value="enquired">Enquired</option><option value="contacted">Contacted</option><option value="pending">Pending Checkout</option><option value="failed">Failed Payment</option><option value="refunded">Refunded</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-neutral-100 text-neutral-600 font-medium border-b border-neutral-200">
                                        <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Name & Contact</th><th className="px-6 py-4">Gotra</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4 text-center">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {loading ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">Loading ledger data...</td></tr>) : filteredRegistrations.length === 0 ? (<tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-400">No records match your filters.</td></tr>) : (
                                            pagedRegistrations.map((reg) => {
                                                const locked = TERMINAL_STATUSES.includes(reg.payment_status);
                                                const editable = isAdmin && !locked;
                                                return (
                                                    <tr key={reg.id} className="hover:bg-neutral-50 transition">
                                                        <td className="px-6 py-4">
                                                            {editable ? (
                                                                <select
                                                                    value={reg.payment_status}
                                                                    onChange={(e) => handleUpdateStatus(reg.id, e.target.value)}
                                                                    disabled={saving}
                                                                    className={`py-1 px-2.5 rounded-full text-xs font-semibold cursor-pointer outline-none border hover:shadow-sm transition-all focus:ring-2 focus:ring-orange-500 disabled:opacity-50 ${statusClasses(reg.payment_status)}`}
                                                                >
                                                                    <option value="completed">✔ Paid</option><option value="enquired">💬 Enquired</option><option value="contacted">📞 Contacted</option><option value="pending">⏳ Pending</option><option value="failed">✖ Failed</option><option value="refunded">⏪ Refunded</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-xs font-semibold border ${statusClasses(reg.payment_status)}`} title={locked ? 'Locked financial state' : undefined}>
                                                                    {locked && <Lock className="w-3 h-3 mr-1" />}{STATUS_LABEL[reg.payment_status]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-neutral-900">{reg.first_name} {reg.last_name}<br /><span className="text-xs font-normal text-neutral-500">{reg.phone}</span></td>
                                                        <td className="px-6 py-4 text-neutral-600">{reg.gotra || '-'}</td>
                                                        <td className="px-6 py-4 text-neutral-600">{reg.categories?.title || 'Deleted Category'}</td>
                                                        <td className="px-6 py-4 font-bold text-neutral-900">₹{reg.total_amount}</td>
                                                        <td className="px-6 py-4 text-center"><button onClick={() => setSelectedRegistration(reg)} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shadow-sm"><Eye className="w-4 h-4" /></button></td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                                    <span className="text-sm text-neutral-500">
                                        Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredRegistrations.length)} of {filteredRegistrations.length}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-1.5 text-sm font-medium border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition">← Prev</button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                                            const page = start + i;
                                            return (
                                                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 text-sm font-medium rounded-lg border transition ${page === safePage ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-200 hover:bg-neutral-50'}`}>{page}</button>
                                            );
                                        })}
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-1.5 text-sm font-medium border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition">Next →</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {effectiveTab === 'settings' && isAdmin && (
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
                                        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-2">Create New Event</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" placeholder="Event Title (English)" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required />
                                            <input type="text" placeholder="कार्यक्रम शीर्षक (हिंदी)" value={newEventTitleHi} onChange={(e) => setNewEventTitleHi(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <textarea placeholder="Short Description (English)" value={newEventShort} onChange={(e) => setNewEventShort(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 resize-none text-sm" rows={2} required />
                                            <textarea placeholder="संक्षिप्त विवरण (हिंदी)" value={newEventShortHi} onChange={(e) => setNewEventShortHi(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none text-sm" rows={2} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <textarea placeholder="Long Description (English)" value={newEventLong} onChange={(e) => setNewEventLong(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 resize-none text-sm h-24" required />
                                            <textarea placeholder="विस्तृत विवरण (हिंदी)" value={newEventLongHi} onChange={(e) => setNewEventLongHi(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none text-sm h-24" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" placeholder="Event Date / Duration (e.g. March 15-17, 2026)" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" />
                                            <input type="text" placeholder="तारीख / अवधि (हिंदी)" value={newEventDateHi} onChange={(e) => setNewEventDateHi(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" placeholder="Venue (e.g. Nashik, Maharashtra)" value={newEventVenue} onChange={(e) => setNewEventVenue(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" />
                                            <input type="text" placeholder="स्थान (हिंदी)" value={newEventVenueHi} onChange={(e) => setNewEventVenueHi(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" />
                                        </div>
                                        <input type="url" placeholder="Google Maps Link (optional)" value={newEventMapUrl} onChange={(e) => setNewEventMapUrl(e.target.value)} className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" />
                                        <button type="submit" disabled={saving} className="bg-neutral-900 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition">Deploy Event</button>
                                    </form>
                                    <div className="space-y-4">
                                        {eventsList.map(ev => (
                                            <EventRow key={ev.id} event={ev} onSetActive={handleSetEventActive} onUpdate={handleUpdateEvent} onDelete={handleDeleteEvent} />
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
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Tier Title</label>
                                                <input type="text" placeholder="e.g. VIP Pass" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Status Type</label>
                                                <select value={newCatIsEnquiry ? 'yes' : 'no'} onChange={(e) => setNewCatIsEnquiry(e.target.value === 'yes')} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm bg-white cursor-pointer">
                                                    <option value="no">Standard Paid</option>
                                                    <option value="yes">Enquiry Only</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Price (₹)</label>
                                                <input type="number" placeholder="5000" value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)} disabled={newCatIsEnquiry} className="w-full md:w-32 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm disabled:opacity-50" required={!newCatIsEnquiry} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4 pt-2 border-t border-neutral-200">
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Max Capacity</label>
                                                <input type="number" placeholder="0 for unlimited" value={newCatCapacity} onChange={(e) => setNewCatCapacity(e.target.value)} className="w-full md:w-40 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" />
                                            </div>
                                            <div className="flex items-center pt-5">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700">
                                                    <input type="checkbox" checked={newCatShowAvail} onChange={(e) => setNewCatShowAvail(e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-600" />
                                                    Show Seats Left on Home Page
                                                </label>
                                            </div>
                                        </div>
                                        <button type="submit" disabled={saving} className="w-full mt-2 bg-neutral-900 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">Deploy New Tier</button>
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
                                    <form onSubmit={handleAddMedia} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50 p-6 border border-neutral-200 rounded-xl mb-8">
                                        <div className="md:col-span-2"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Asset URL</label><input type="url" placeholder="https://..." value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" required /></div>
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Type</label><select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'youtube')} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-600 cursor-pointer"><option value="image">Image</option><option value="youtube">YouTube</option></select></div>
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Link Event</label><select value={mediaEventId} onChange={(e) => setMediaEventId(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-600 cursor-pointer"><option value="" disabled>Select Event</option>{eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div>
                                        <div className="md:col-span-3"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Caption</label><input type="text" placeholder="e.g., Opening Ceremony Highlights" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" /></div>
                                        <div className="md:col-span-1 flex items-end"><button type="submit" disabled={saving} className="w-full bg-neutral-900 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg transition flex justify-center items-center gap-2"><Plus className="w-4 h-4" /> Inject</button></div>
                                    </form>
                                    <div className="space-y-4">
                                        {mediaList.map((media) => (
                                            <div key={media.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-neutral-200 rounded-xl bg-white shadow-sm gap-4 hover:border-neutral-300 transition">
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="w-24 h-16 bg-neutral-100 rounded-md overflow-hidden flex items-center justify-center border border-neutral-200 flex-shrink-0 relative">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        {media.media_type === 'image' ? <img src={media.url} alt="media" className="w-full h-full object-cover" /> : <Video className="w-6 h-6 text-neutral-400" />}
                                                    </div>
                                                    <div className="flex-1"><p className="text-sm font-bold text-neutral-900">{media.caption || 'Untitled Asset'}</p><div className="flex items-center gap-2 mt-1.5"><span className="uppercase tracking-wider font-bold text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">{media.media_type}</span><span className="text-xs text-neutral-500">Linked to: {media.events?.title || 'Unknown Event'}</span></div></div>
                                                </div>
                                                <button onClick={() => handleDeleteMedia(media.id)} className="text-neutral-400 hover:text-red-600 p-2 border border-transparent hover:border-red-200 rounded-lg bg-neutral-50 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
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
function CategoryRow({ category, onUpdate, onDelete }: { category: Category, onUpdate: (id: string, updates: Partial<Category>) => void, onDelete: (id: string, title: string) => void }) {
    const [price, setPrice] = useState(category.price);
    const [titleHi, setTitleHi] = useState(category.title_hi || '');
    const [mediaUrl, setMediaUrl] = useState(category.media_url || '');
    const [desc, setDesc] = useState(category.description || '');
    const [detailedDesc, setDetailedDesc] = useState(category.detailed_description || '');
    const [descHi, setDescHi] = useState(category.description_hi || '');
    const [detailedDescHi, setDetailedDescHi] = useState(category.detailed_description_hi || '');
    const [isFull, setIsFull] = useState(category.is_full);
    const [isEnquiry, setIsEnquiry] = useState(category.is_enquiry_only || false);
    const [capacity, setCapacity] = useState(category.max_capacity || 0);
    const [showAvail, setShowAvail] = useState(category.show_availability || false);
    const [maxPerReg, setMaxPerReg] = useState(category.max_attendees_per_reg || 5);
    const [isChanged, setIsChanged] = useState(false);

    const handleUpdateClick = () => {
        onUpdate(category.id, {
            title_hi: titleHi || null,
            price, media_url: mediaUrl, description: desc, detailed_description: detailedDesc,
            description_hi: descHi || null, detailed_description_hi: detailedDescHi || null,
            is_full: isFull, is_enquiry_only: isEnquiry, max_capacity: capacity, show_availability: showAvail,
            max_attendees_per_reg: maxPerReg,
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
                    <button onClick={() => onDelete(category.id, category.title)} className="text-neutral-400 hover:text-red-600 p-1.5 border border-transparent hover:border-red-200 rounded bg-neutral-50 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Tier Title (EN)</label><input type="text" value={category.title} readOnly className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-500 cursor-not-allowed" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">टियर शीर्षक (HI)</label><input type="text" value={titleHi} onChange={(e) => { setTitleHi(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition" /></div>
                <div className="md:col-span-1"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Fee (₹)</label><input type="number" value={price} onChange={(e) => { setPrice(Number(e.target.value)); setIsChanged(true); }} disabled={isEnquiry} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition disabled:opacity-50" /></div>
                <div className="md:col-span-1"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1"><Users className="w-3 h-3 inline" /> Max Total Seats</label><input type="number" min="0" value={capacity} onChange={(e) => { setCapacity(Number(e.target.value)); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-1"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1"><Users className="w-3 h-3 inline" /> Max per Registration</label><input type="number" min="1" max="20" value={maxPerReg} onChange={(e) => { setMaxPerReg(Math.max(1, Number(e.target.value))); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-1 pt-5"><label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-700"><input type="checkbox" checked={showAvail} onChange={(e) => { setShowAvail(e.target.checked); setIsChanged(true); }} className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-600" />Show Availability</label></div>

                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Media URL</label><input type="text" value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Short Summary (EN)</label><input type="text" value={desc} onChange={(e) => { setDesc(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">संक्षिप्त विवरण (HI)</label><input type="text" value={descHi} onChange={(e) => { setDescHi(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Detailed Perks (EN)</label><textarea value={detailedDesc} onChange={(e) => { setDetailedDesc(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition h-16 resize-none" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">विस्तृत विवरण (HI)</label><textarea value={detailedDescHi} onChange={(e) => { setDetailedDescHi(e.target.value); setIsChanged(true); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition h-16 resize-none" /></div>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-end">
                <button onClick={handleUpdateClick} disabled={!isChanged} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${isChanged ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'}`}><Save className="w-4 h-4" />{isChanged ? "Commit Updates" : "Up to date"}</button>
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENT: EventRow
// ============================================================================
function EventRow({ event, onSetActive, onUpdate, onDelete }: {
    event: EventItem;
    onSetActive: (id: string) => void;
    onUpdate: (id: string, updates: Partial<EventItem>) => void;
    onDelete: (id: string, title: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState(event.title || '');
    const [titleHi, setTitleHi] = useState(event.title_hi || '');
    const [shortDesc, setShortDesc] = useState(event.short_description || '');
    const [shortDescHi, setShortDescHi] = useState(event.short_description_hi || '');
    const [longDesc, setLongDesc] = useState(event.long_description || '');
    const [longDescHi, setLongDescHi] = useState(event.long_description_hi || '');
    const [dateTime, setDateTime] = useState(event.date_time || '');
    const [dateTimeHi, setDateTimeHi] = useState(event.date_time_hi || '');
    const [venue, setVenue] = useState(event.venue || '');
    const [venueHi, setVenueHi] = useState(event.venue_hi || '');
    const [mapUrl, setMapUrl] = useState(event.map_url || '');
    const [isChanged, setIsChanged] = useState(false);

    const handleSave = () => {
        onUpdate(event.id, {
            title, title_hi: titleHi || null,
            short_description: shortDesc, short_description_hi: shortDescHi || null,
            long_description: longDesc, long_description_hi: longDescHi || null,
            date_time: dateTime || null, date_time_hi: dateTimeHi || null,
            venue: venue || null, venue_hi: venueHi || null,
            map_url: mapUrl || null,
        });
        setIsChanged(false);
    };

    const track = () => setIsChanged(true);

    return (
        <div className={`rounded-xl border shadow-sm transition-all ${event.is_active ? 'border-orange-300 bg-orange-50/30' : 'border-neutral-200 bg-white'}`}>
            <div className="flex justify-between items-start p-5">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-neutral-900 truncate">{event.title}</h4>
                    {event.venue && <p className="text-xs text-neutral-500 mt-0.5">📍 {event.venue}{event.date_time ? ` · ${event.date_time}` : ''}</p>}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Title (EN)</label><input value={title} onChange={e => { setTitle(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                        <div><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">शीर्षक (HI)</label><input value={titleHi} onChange={e => { setTitleHi(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Short Description (EN)</label><textarea value={shortDesc} onChange={e => { setShortDesc(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition h-16 resize-none" /></div>
                        <div><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">संक्षिप्त विवरण (HI)</label><textarea value={shortDescHi} onChange={e => { setShortDescHi(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition h-16 resize-none" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Long Description (EN)</label><textarea value={longDesc} onChange={e => { setLongDesc(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition h-24 resize-none" /></div>
                        <div><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">विस्तृत विवरण (HI)</label><textarea value={longDescHi} onChange={e => { setLongDescHi(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition h-24 resize-none" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Date / Duration (EN)</label><input value={dateTime} onChange={e => { setDateTime(e.target.value); track(); }} placeholder="e.g. March 15–17, 2026" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                        <div><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">तारीख / अवधि (HI)</label><input value={dateTimeHi} onChange={e => { setDateTimeHi(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Venue (EN)</label><input value={venue} onChange={e => { setVenue(e.target.value); track(); }} placeholder="e.g. Nashik, Maharashtra" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                        <div><label className="block text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">स्थान (HI)</label><input value={venueHi} onChange={e => { setVenueHi(e.target.value); track(); }} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/30 focus:outline-none focus:border-blue-500 focus:bg-white transition" /></div>
                    </div>
                    <div><label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">Google Maps Link</label><input type="url" value={mapUrl} onChange={e => { setMapUrl(e.target.value); track(); }} placeholder="https://maps.google.com/..." className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-orange-500 focus:bg-white transition" /></div>
                    <div className="flex justify-end pt-2 border-t border-neutral-100">
                        <button onClick={handleSave} disabled={!isChanged} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${isChanged ? 'bg-orange-600 text-white shadow-md hover:bg-orange-700' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'}`}><Save className="w-4 h-4" />{isChanged ? 'Save Changes' : 'Up to date'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
