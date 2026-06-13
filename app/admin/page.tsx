// app/admin/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Added Search and Filter to our icons!
import { Lock, Download, Users, IndianRupee, Activity, CheckCircle, XCircle, RotateCcw, Search, Filter } from 'lucide-react';

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
    categories: {
        title: string;
    } | null;
}

export default function AdminDashboard() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // --- NEW STATE FOR FILTERS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // -----------------------------

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            fetchRegistrations();
        } else {
            setError("Incorrect password");
        }
    };

    const fetchRegistrations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('registrations')
            .select('*, categories(title)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch error:", error);
            alert("Failed to load data.");
        } else {
            setRegistrations(data as Registration[]);
        }
        setLoading(false);
    };

    const downloadCSV = () => {
        // ... (Keep your exact same CSV logic here)
        const headers = [
            "Date", "Status", "Title", "First Name", "Last Name", "Gender", "DOB",
            "Phone", "Email", "Pincode", "Taluka", "State",
            "Category", "Attendees", "Donation", "Total Paid", "Issue/Samasya", "Razorpay ID"
        ];

        // Export ALL data, or you can change this to filteredRegistrations to only export what's on screen!
        const csvData = registrations.map(reg => [
            new Date(reg.created_at).toLocaleDateString(),
            reg.payment_status.toUpperCase(),
            reg.salutation || '',
            reg.first_name || '',
            reg.last_name || '',
            reg.gender || '',
            reg.date_of_birth || '',
            reg.phone || '',
            reg.email || '',
            reg.pincode || '',
            reg.taluka || '',
            reg.state || '',
            reg.categories?.title || 'Unknown',
            reg.attendees_count || 1,
            reg.donation_amount || 0,
            reg.total_amount || 0,
            `"${(reg.problem_samasya || '').replace(/"/g, '""')}"`,
            reg.razorpay_payment_id || 'N/A'
        ]);

        const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Shankhnad_Registrations_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // --- NEW FILTERING LOGIC ---
    const filteredRegistrations = registrations.filter(reg => {
        const fullName = `${reg.first_name} ${reg.last_name}`.toLowerCase();
        const phone = reg.phone || '';
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || reg.payment_status === statusFilter;

        return matchesSearch && matchesStatus;
    });
    // ---------------------------

    const totalRevenue = registrations
        .filter(r => r.payment_status === 'completed')
        .reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

    const completedCount = registrations.filter(r => r.payment_status === 'completed').length;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
                    <p className="text-neutral-500 mb-8">Enter your secure password to view registrations.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600"
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition">
                            Unlock Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900">Mahotsav Dashboard</h1>
                        <p className="text-neutral-500">Manage all registrations and payments.</p>
                    </div>
                    <button
                        onClick={downloadCSV}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition"
                    >
                        <Download className="w-4 h-4" /> Export to Excel / CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Total Confirmed Attendees</p>
                            <p className="text-2xl font-bold">{completedCount}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Total Revenue Collected</p>
                            <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
                        <div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-neutral-500">Total Transactions</p>
                            <p className="text-2xl font-bold">{registrations.length}</p>
                        </div>
                    </div>
                </div>

                {/* --- NEW SEARCH AND FILTER BAR --- */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">

                    {/* Search Input */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-neutral-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full md:w-auto px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600 transition appearance-none cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="completed">Completed Only</option>
                            <option value="pending">Pending Only</option>
                            <option value="failed">Failed Only</option>
                            <option value="refunded">Refunded Only</option>
                        </select>
                    </div>

                </div>

                <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-100 text-neutral-600 font-medium border-b border-neutral-200">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Amount Paid</th>
                                    <th className="px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">Loading records...</td></tr>
                                ) : filteredRegistrations.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No matching registrations found.</td></tr>
                                ) : (
                                    // WE CHANGED THIS FROM `registrations.map` TO `filteredRegistrations.map`
                                    filteredRegistrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-neutral-50 transition">
                                            <td className="px-6 py-4">
                                                {reg.payment_status === 'completed' && <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3.5 h-3.5" /> Paid</span>}
                                                {reg.payment_status === 'pending' && <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><RotateCcw className="w-3.5 h-3.5 animate-spin-slow" /> Pending</span>}
                                                {reg.payment_status === 'failed' && <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3.5 h-3.5" /> Failed</span>}
                                                {reg.payment_status === 'refunded' && <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700"><RotateCcw className="w-3.5 h-3.5" /> Refunded</span>}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-neutral-900">
                                                {reg.first_name} {reg.last_name}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-500">
                                                {reg.phone}<br />
                                                <span className="text-xs">{reg.email}</span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-600">
                                                {reg.categories?.title || 'Unknown'} <br />
                                                <span className="text-xs text-neutral-400">{reg.attendees_count} Attendee(s)</span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-neutral-900">
                                                ₹{reg.total_amount || 0}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-500">
                                                {new Date(reg.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}