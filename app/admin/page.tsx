// app/admin/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useBranding } from "@/components/BrandingProvider";
import {
    Lock, Download, Users, IndianRupee, Activity, Eye, EyeOff, X, Settings, ListFilter,
    Trash2, Plus, Image as ImageIcon, Video, CalendarDays,
    Ticket, Calendar as CalendarIcon, Search, LogOut, QrCode, Check,
    LayoutDashboard, ScrollText, RefreshCw, MessageSquare, Send, UserPlus, Megaphone,
    Gift, UserCheck, Handshake, Mail, FolderOpen, Palette, FileCode, Phone, Copy, Link2
} from 'lucide-react';
import { youtubeThumbnail } from '@/lib/youtube';
import { buildTranslations } from '@/lib/i18n';
import FormFieldsManager from '@/components/FormFieldsManager';
import EntryBandsManager from '@/components/EntryBandsManager';
import HomeContentManager from '@/components/HomeContentManager';
import ContactSocialManager from '@/components/ContactSocialManager';
import ContactMessagesManager from '@/components/ContactMessagesManager';
import DeclarationManager from '@/components/DeclarationManager';
import ConsentsManager from '@/components/ConsentsManager';
import PageHeadersManager from '@/components/PageHeadersManager';
import AuditLogPanel from '@/components/AuditLogPanel';
import EnquiriesPanel from '@/components/EnquiriesPanel';
import PaymentSettingsManager from '@/components/PaymentSettingsManager';
import AdminUsersManager from '@/components/AdminUsersManager';
import WaitlistManager from '@/components/WaitlistManager';
import DonationsManager from '@/components/DonationsManager';
import SevaCategoriesManager from '@/components/SevaCategoriesManager';
import SponsorsManager from '@/components/SponsorsManager';
import MediaLibraryManager from '@/components/MediaLibraryManager';
import BrandingManager from '@/components/BrandingManager';
import TemplatesConfigManager from '@/components/TemplatesConfigManager';
import MessageLogPanel from '@/components/MessageLogPanel';
import FeedbackManager from '@/components/FeedbackManager';
import ScanLogPanel from '@/components/ScanLogPanel';
import Toaster from '@/components/Toaster';
import EditRegistrationModal from '@/components/EditRegistrationModal';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import AddRegistrationModal from '@/components/AddRegistrationModal';
import EventOpsPanel from '@/components/EventOpsPanel';
import HealthPanel from '@/components/HealthPanel';
import ManualCheckin from '@/components/ManualCheckin';
import BroadcastModal from '@/components/BroadcastModal';
import MediaPicker from '@/components/MediaPicker';
import CategoryRow from '@/components/admin/CategoryRow';
import EventRow from '@/components/admin/EventRow';
import TranslatableField from '@/components/admin/TranslatableField';
import RegistrationDetailModal from '@/components/admin/RegistrationDetailModal';
import { toast, confirmDialog, promptDialog } from '@/lib/uiStore';
import { downloadRegistrationsCsv, downloadRegistrationsExcel, printReceiptsPdf, downloadFinancialStatement } from '@/lib/adminExports';

import type { Role, Registration, Category, EventItem, MediaItem, AdminStats } from './types';
import { TERMINAL_STATUSES, STATUS_LABEL, PAYMENT_MODE_LABEL, ENQUIRY_STATUSES, REGISTRATION_SECTIONS, statusClasses } from './constants';

export default function AdminDashboard() {
    const { site_name: siteName } = useBranding();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<Role | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    // True while the initial cookie session-check is in flight, so a refresh shows
    // a brief loader instead of flashing the login screen before rehydrating.
    const [checkingSession, setCheckingSession] = useState(true);
    const isAdmin = role === 'admin';
    const isVolunteer = role === 'volunteer';
    // Permission check for the UI. Admin always passes; volunteers use their granted list.
    const can = (perm: string) => isAdmin || permissions.includes(perm);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'registrations' | 'enquiries' | 'scanlog' | 'settings' | 'audit'>('dashboard');
    const [settingsSubTab, setSettingsSubTab] = useState<'events' | 'tiers' | 'media' | 'library' | 'branding' | 'pageheaders' | 'templates' | 'checkpoints' | 'formfields' | 'homecontent' | 'contactsocial' | 'contactmessages' | 'declaration' | 'consents' | 'payment' | 'users' | 'waitlist' | 'donations' | 'sevacategories' | 'sponsors' | 'messages' | 'feedback'>('events');
    const [settingsQuery, setSettingsQuery] = useState('');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [categoriesList, setCategoriesList] = useState<Category[]>([]);
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [eventsList, setEventsList] = useState<EventItem[]>([]);
    // Figures that don't live on the registrations rows (donations + check-ins).
    // Null members mean "this role can't see it" — the tile is hidden.
    const [stats, setStats] = useState<AdminStats>({ donations: null, donationsTotal: null, checkedInRegs: null });

    const activeEvent = eventsList.find(e => e.is_active);

    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventShort, setNewEventShort] = useState('');
    const [newEventLong, setNewEventLong] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventVenue, setNewEventVenue] = useState('');
    const [newEventMapUrl, setNewEventMapUrl] = useState('');
    // Every non-English language at once, keyed { [lang]: { [field]: value } } —
    // driven by LANGUAGES in lib/i18n, so adding a language grows this form on its
    // own. (It used to hardcode Hindi-only fields, which is why a new event could
    // never be given Marathi without re-opening it to edit.)
    const [newEventTr, setNewEventTr] = useState<Record<string, Record<string, string>>>({});
    const setEventTr = (lang: string, field: string, v: string) =>
        setNewEventTr(prev => ({ ...prev, [lang]: { ...(prev[lang] || {}), [field]: v } }));
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'youtube'>('image');
    const [mediaCaption, setMediaCaption] = useState('');
    const [mediaEventId, setMediaEventId] = useState('');

    const [newCatTitle, setNewCatTitle] = useState('');
    const [newCatPrice, setNewCatPrice] = useState('');
    const [newCatDesc, setNewCatDesc] = useState('');
    const [newCatIsEnquiry, setNewCatIsEnquiry] = useState(false);
    const [newCatAllowEnquiry, setNewCatAllowEnquiry] = useState(false);
    const [newCatCapacity, setNewCatCapacity] = useState('0');
    const [newCatShowAvail, setNewCatShowAvail] = useState(false);
    const [newCatEventId, setNewCatEventId] = useState('');
    const [eventFilter, setEventFilter] = useState<string>('all');

    // Checkpoints
    interface Checkpoint { id: string; name: string; sort_order: number; is_active: boolean; }
    const [checkpointsList, setCheckpointsList] = useState<Checkpoint[]>([]);
    const [newCpName, setNewCpName] = useState('');

    const fetchCheckpoints = async () => {
        const res = await fetch('/api/admin/checkpoints');
        if (res.ok) { const d = await res.json(); setCheckpointsList(d.checkpoints || []); }
    };
    const handleCreateCheckpoint = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newCpName.trim()) return; setSaving(true);
        const res = await fetch('/api/admin/checkpoints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCpName.trim(), sort_order: checkpointsList.length }) });
        if (res.ok) { setNewCpName(''); await fetchCheckpoints(); } else toast.error('Failed to create checkpoint');
        setSaving(false);
    };
    const handleToggleCheckpoint = async (id: string, is_active: boolean) => {
        setSaving(true);
        await fetch('/api/admin/checkpoints', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) });
        await fetchCheckpoints(); setSaving(false);
    };
    const handleDeleteCheckpoint = async (id: string, name: string) => {
        if (!(await confirmDialog({ title: 'Delete checkpoint', message: `Delete checkpoint "${name}"? All scan records for this checkpoint will also be deleted.`, danger: true, confirmLabel: 'Delete' }))) return;
        setSaving(true);
        await fetch('/api/admin/checkpoints', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        await fetchCheckpoints(); setSaving(false);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [globalQuery, setGlobalQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 25;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sendingQr, setSendingQr] = useState(false);

    // ----- Auth -----
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed'); return; }
            setPassword('');
            setRole(data.role);
            setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
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
            const [res, cpRes] = await Promise.all([fetch('/api/admin/data'), fetch('/api/admin/checkpoints')]);
            if (res.status === 401) { setRole(null); return; }
            const data = await res.json();
            setRegistrations(data.registrations || []);
            setCategoriesList(data.categories || []);
            setEventsList(data.events || []);
            setMediaList(data.media || []);
            if (data.stats) setStats(data.stats);
            const activeEv = (data.events || []).find((ev: EventItem) => ev.is_active);
            if (activeEv) setMediaEventId(activeEv.id);
            if (cpRes.ok) { const cpData = await cpRes.json(); setCheckpointsList(cpData.checkpoints || []); }
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    };

    // Lightweight, silent refresh of just the registrations list — used by the
    // manual Refresh button and the auto-refresh poll. Never toggles the global
    // loading spinner (so the table doesn't flash) and leaves Settings state alone.
    const refreshRegistrations = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/admin/data');
            if (res.status === 401) { setRole(null); return; }
            const data = await res.json();
            setRegistrations(data.registrations || []);
            if (data.stats) setStats(data.stats);
            setLastUpdated(new Date());
        } catch {
            // transient network error — keep showing the last good data
        } finally {
            setRefreshing(false);
        }
    }, []);

    // On mount, rehydrate the session from the httpOnly cookie. Without this, a
    // page refresh resets the in-memory `role` to null and bounces the admin back
    // to the login screen even though the 8-hour session cookie is still valid.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/session');
                if (res.ok) {
                    const d = await res.json();
                    setRole(d.role);
                    setPermissions(Array.isArray(d.permissions) ? d.permissions : []);
                    fetchAllData();
                }
            } catch { /* not authenticated — show login */ }
            finally { setCheckingSession(false); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-refresh new registrations every 30s while viewing the Dashboard or
    // Registrations tab, so the admin never has to reload the page. Paused while
    // a detail modal is open (to avoid yanking data mid-read) or when toggled off.
    useEffect(() => {
        if (!role || !autoRefresh) return;
        if (activeTab !== 'dashboard' && activeTab !== 'registrations' && activeTab !== 'enquiries') return;
        const interval = setInterval(() => {
            if (!selectedRegistration && !saving) refreshRegistrations();
        }, 30000);
        return () => clearInterval(interval);
    }, [role, autoRefresh, activeTab, selectedRegistration, saving, refreshRegistrations]);

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
    const confirmWithPassword = async (message: string): Promise<string | null> => {
        if (!(await confirmDialog({ title: 'Confirm', message, danger: true, confirmLabel: 'Continue' }))) return null;
        const pwd = await promptDialog({ title: 'Your password', message: 'Re-enter your account password to authorize this deletion:', inputType: 'password', required: true, confirmLabel: 'Authorize' });
        return pwd && pwd.length ? pwd : null;
    };

    // ----- Registrations -----
    const handleUpdateStatus = async (id: string, newStatus: string) => {
        if (!(await confirmDialog({ title: 'Change status', message: `Change this registration's status to ${newStatus.toUpperCase()}?` }))) return;
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/registrations', 'PATCH', { id, status: newStatus });
        if (!ok) toast.error(data.error || 'Failed to update status.'); else { toast.success('Status updated.'); await fetchAllData(); }
        setSaving(false);
    };

    // ----- Events -----
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        // TranslatableField has no `required` prop, so the English base fields
        // (which the old raw inputs marked required) are validated here instead.
        if (!newEventTitle.trim() || !newEventShort.trim() || !newEventLong.trim()) {
            toast.error('Event title, short description and long description are required (in English).');
            return;
        }
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'POST', {
            title: newEventTitle, short_description: newEventShort, long_description: newEventLong,
            date_time: newEventDate || null, venue: newEventVenue || null,
            map_url: newEventMapUrl || null,
            // Every non-English language entered at create time goes straight into
            // the translations JSONB (buildTranslations drops blank fields).
            translations: buildTranslations(newEventTr),
            makeActive: eventsList.length === 0,
        });
        if (!ok) toast.error(data.error || 'Failed to create event.');
        else {
            setNewEventTitle(''); setNewEventShort(''); setNewEventLong('');
            setNewEventDate(''); setNewEventVenue(''); setNewEventMapUrl('');
            setNewEventTr({});
            await fetchAllData();
        }
        setSaving(false);
    };
    const handleSetEventActive = async (id: string) => {
        if (!(await confirmDialog({ title: 'Set live event', message: 'Set this as the main Home Page event?' }))) return; setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'PATCH', { id, setActive: true });
        if (!ok) toast.error(data.error || 'Failed.'); else await fetchAllData();
        setSaving(false);
    };
    const handleUpdateEvent = async (id: string, updates: Partial<EventItem>) => {
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'PATCH', { id, updates });
        if (!ok) toast.error(data.error || 'Update failed.'); else await fetchAllData();
        setSaving(false);
    };
    const handleDeleteEvent = async (id: string, title: string) => {
        const pwd = await confirmWithPassword(`Delete "${title}"? This cannot be undone.`);
        if (!pwd) return; setSaving(true);
        const { ok, data } = await mutate('/api/admin/events', 'DELETE', { id, password: pwd });
        if (!ok) toast.error(data.error || 'Delete failed.'); else await fetchAllData();
        setSaving(false);
    };

    const [resendQr, setResendQr] = useState(false);
    const handleSendQr = async () => {
        if (selectedIds.size === 0) return;
        const selected = registrations.filter(r => selectedIds.has(r.id));
        const paid = selected.filter(r => r.payment_status === 'completed');
        const notPaid = selected.length - paid.length;
        // By default only message people who haven't received a QR yet, so the
        // earlier batch isn't re-messaged. Tick "Resend" to include them again.
        const targets = resendQr ? paid : paid.filter(r => !r.qr_sent_at);
        const alreadySent = paid.length - paid.filter(r => !r.qr_sent_at).length;

        if (targets.length === 0) {
            toast.error(
                paid.length === 0
                    ? 'None of the selected registrations are fully Paid. QR passes are only sent to Paid registrations.'
                    : `All ${paid.length} Paid registration(s) selected already received a QR. Tick "Resend to already-sent" to send again.`
            );
            return;
        }

        const lines = [`Send QR entry passes to ${targets.length} registration(s) via email & WhatsApp?`];
        if (notPaid > 0) lines.push(`• ${notPaid} not Paid — will be skipped.`);
        if (!resendQr && alreadySent > 0) lines.push(`• ${alreadySent} already received a QR — will be skipped.`);
        if (resendQr && alreadySent > 0) lines.push(`• ${alreadySent} will be RE-SENT a QR.`);
        if (!(await confirmDialog({ title: 'Send QR passes', message: lines.join('\n'), confirmLabel: 'Send' }))) return;

        setSendingQr(true);
        const { ok, data } = await mutate('/api/admin/send-qr', 'POST', { registrationIds: targets.map(r => r.id) });
        setSendingQr(false);
        if (!ok) { toast.error(data.error || 'Failed to send QR codes.'); return; }
        toast.success(`QR codes sent — ✉️ ${data.emailSent} email, 📱 ${data.waSent} WhatsApp${data.emailFailed || data.waFailed ? ` (${data.emailFailed + data.waFailed} failed)` : ''}.`);
        setSelectedIds(new Set());
        setResendQr(false);
        await fetchAllData();
    };

    const handleClearPending = async () => {
        const hours = await promptDialog({ title: 'Clear abandoned pending', message: 'Mark pending checkouts older than how many hours as Failed?', defaultValue: '24', inputType: 'number', required: true });
        if (hours === null) return;
        const h = Math.max(1, Number(hours) || 24);
        if (!(await confirmDialog({ title: 'Clear abandoned pending', message: `Mark all pending registrations older than ${h}h as Failed?\nThey move to the Failed tab (records are kept, not deleted).`, confirmLabel: 'Clear' }))) return;
        const { ok, data } = await mutate('/api/admin/clear-pending', 'POST', { olderThanHours: h });
        if (!ok) { toast.error(data.error || 'Cleanup failed.'); return; }
        toast.success(`${data.count} abandoned pending checkout(s) marked as Failed.`);
        await fetchAllData();
    };

    const [showAddReg, setShowAddReg] = useState(false);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [reminding, setReminding] = useState(false);
    const handleBulkRemind = async (kind: 'pending' | 'balance') => {
        const label = kind === 'balance' ? 'balance payment reminders to all Advance-Paid registrations' : 'payment links to all Pending (abandoned) checkouts';
        if (!(await confirmDialog({ title: 'Send reminders', message: `Send ${label}? Each reachable person gets an email + WhatsApp with a fresh payment link.`, confirmLabel: 'Send' }))) return;
        setReminding(true);
        const { ok, data } = await mutate('/api/admin/bulk-remind', 'POST', { kind });
        setReminding(false);
        if (!ok) { toast.error(data.error || 'Could not send reminders.'); return; }
        if (data.attempted === 0) { toast.info('No reachable registrations with a due amount to remind.'); return; }
        toast.success(`Reminders sent to ${data.sent} of ${data.attempted}${data.failed ? ` (${data.failed} failed)` : ''}${data.capped ? ' — capped at 200; run again for the rest.' : ''}.`);
    };

    // ----- Manage a registration (edit / refund / resend confirmation) -----
    const [editingReg, setEditingReg] = useState<Registration | null>(null);
    const [managingId, setManagingId] = useState<string | null>(null);
    const handleRefund = async (reg: Registration) => {
        const amt = await promptDialog({ title: 'Refund', message: `Refund amount (₹). Leave the full amount for a full refund; the tier total is ₹${reg.total_amount}.`, defaultValue: String(reg.total_amount || ''), inputType: 'number', required: true, confirmLabel: 'Refund' });
        if (amt === null) return;
        const reason = await promptDialog({ title: 'Reason for refund', message: 'Why is this being refunded? (recorded in the audit log & sent to Razorpay)', placeholder: 'e.g. Duplicate payment / customer cancelled', required: true, confirmLabel: 'Continue' });
        if (reason === null) return;
        if (!(await confirmDialog({ title: 'Confirm refund', message: `Refund ₹${Number(amt).toLocaleString('en-IN')} via Razorpay? This cannot be undone.`, danger: true, confirmLabel: 'Refund' }))) return;
        setManagingId(reg.id);
        const { ok, data } = await mutate('/api/admin/refund', 'POST', { id: reg.id, amount: Number(amt), note: reason });
        setManagingId(null);
        if (!ok) { toast.error(data.error || 'Refund failed.'); return; }
        toast.success(data.full ? 'Full refund issued — marked Refunded.' : 'Partial refund issued.');
        setSelectedRegistration(null);
        await fetchAllData();
    };
    // Cancel — admin only, always with a reason, and never a refund. The second
    // dialog spells the no-refund part out because it's the one thing an operator
    // could wrongly assume this button does.
    const handleCancel = async (reg: Registration) => {
        const reason = await promptDialog({
            title: 'Cancel registration',
            message: `Why is ${reg.first_name} ${reg.last_name}'s registration being cancelled? (recorded in the audit log and sent to them)`,
            placeholder: 'e.g. Duplicate booking / requested by attendee',
            required: true,
            confirmLabel: 'Continue',
        });
        if (reason === null) return;

        const paid = Number(reg.amount_paid || 0) > 0;
        const lines = [
            `Cancel this registration? The seat is released immediately and any entry pass already issued stops being valid.`,
            paid ? `\n⚠️ This does NOT refund the ₹${Number(reg.amount_paid).toLocaleString('en-IN')} already paid — the payment record is kept as-is. To return the money, use Refund (online) or Reverse (offline) separately.` : '',
            `\n${reg.first_name} ${reg.last_name} will be notified by email & WhatsApp.`,
        ].filter(Boolean);
        if (!(await confirmDialog({ title: 'Confirm cancellation', message: lines.join('\n'), danger: true, confirmLabel: 'Cancel registration' }))) return;

        setManagingId(reg.id);
        const { ok, data } = await mutate('/api/admin/cancel-registration', 'POST', { id: reg.id, reason });
        setManagingId(null);
        if (!ok) { toast.error(data.error || 'Could not cancel.'); return; }

        toast.success('Registration cancelled — the seat has been released.');
        // A seat just freed. Point the admin at the people waiting for it.
        const waiting = (data.waitlist || []).length;
        if (waiting > 0) {
            toast.info(`${waiting} ${waiting === 1 ? 'person is' : 'people are'} on the waitlist for ${data.tier || 'this tier'} — open Settings → Waitlist to notify the next one.`);
        }
        setSelectedRegistration(null);
        await fetchAllData();
    };

    // retryFailedOnly=true (the ⚠️ button) re-sends ONLY the channel(s) that failed,
    // so a delivered email/WhatsApp is never sent twice. The modal's "Resend
    // confirmation" omits it → a deliberate full resend (e.g. corrected email).
    const handleResendConfirmation = async (reg: Registration, retryFailedOnly = false) => {
        let channels: string[] | undefined;
        if (retryFailedOnly) {
            channels = [
                reg.ticket_email_status !== 'sent' ? 'email' : null,
                reg.ticket_wa_status !== 'sent' ? 'whatsapp' : null,
            ].filter(Boolean) as string[];
            if (channels.length === 0) { toast.info('Both channels already delivered.'); return; }
        }
        setManagingId(reg.id);
        const { ok, data } = await mutate('/api/admin/resend-confirmation', 'POST', { id: reg.id, channels });
        setManagingId(null);
        if (!ok) { toast.error(data.error || 'Failed to resend.'); return; }
        const parts = [
            data.emailStatus ? `email ${data.emailStatus}` : null,
            data.waStatus ? `WhatsApp ${data.waStatus}` : null,
        ].filter(Boolean).join(' · ');
        toast.success(`Confirmation re-sent${parts ? ` — ${parts}` : ''}.`);
    };

    // Change/remove the optional donation on a registration (people often add one at
    // checkout and later ask the desk to drop it and pay only the Seva fee).
    const handleAdjustDonation = async (reg: Registration) => {
        const current = Number(reg.donation_amount) || 0;
        const val = await promptDialog({
            title: 'Adjust donation',
            message: `Donation for ${reg.first_name} ${reg.last_name} (₹). Enter 0 to remove it — the Seva fee is unaffected and the balance due is recalculated.`,
            defaultValue: String(current),
            inputType: 'number',
            required: true,
            confirmLabel: 'Update',
        });
        if (val === null) return;
        setManagingId(reg.id);
        const { ok, data } = await mutate('/api/admin/adjust-donation', 'POST', { id: reg.id, donation: Number(val) });
        setManagingId(null);
        if (!ok) { toast.error(data.error || 'Could not update the donation.'); return; }
        if (data.unchanged) { toast.info('Donation unchanged.'); return; }
        const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
        toast.success(`Donation set to ${inr(data.donation)} — total ${inr(data.total)}, due ${inr(data.amount_due)}${data.completed ? ' · marked Paid' : ''}.`);
        // A stale link that couldn't be cancelled is still payable at the OLD amount —
        // the admin must void it in the Razorpay dashboard.
        if (typeof data.linkCancelled === 'string') {
            toast.error(`⚠️ The old balance link could NOT be cancelled (${data.linkCancelled}). Cancel it in the Razorpay dashboard — it can still be paid at the old amount.`);
        }
        setSelectedRegistration(null);
        await fetchAllData();
    };

    // ----- Offline payment verification -----
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const viewProof = async (id: string) => {
        const res = await fetch(`/api/admin/payment-proof/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(data.error || 'No proof on file.'); return; }
        window.open(data.url, '_blank', 'noopener');
    };
    const handleVerifyPayment = async (reg: Registration, action: string) => {
        const body: Record<string, unknown> = { id: reg.id, action };
        if (action === 'approve' || action === 'cheque_cleared') {
            const total = Number(reg.total_amount) || 0;
            const isPartialPlan = reg.payment_plan === 'partial';
            // Sensible default: for a reconcile use what was already recorded; for a
            // part-payment row the amount due already reflects the advance (total −
            // advance), so pre-fill the expected advance; otherwise the full price.
            const defaultAmt = reg.payment_status === 'amount_mismatch' && Number(reg.amount_paid) > 0
                ? Number(reg.amount_paid)
                : (isPartialPlan && Number(reg.amount_due) > 0 ? Math.max(0, total - Number(reg.amount_due)) : total);
            const amt = await promptDialog({ title: 'Confirm payment', message: isPartialPlan ? `Advance received (₹) — full price is ₹${total.toLocaleString('en-IN')}:` : 'Amount received (₹):', defaultValue: String(defaultAmt || ''), inputType: 'number', required: true, confirmLabel: 'Approve' });
            if (amt === null) return;
            const received = Number(amt);
            body.amount = received;
            // A short amount → part payment (balance kept due) or flag as mismatch.
            if (received > 0 && total > 0 && received < total - 1) {
                const asPartial = isPartialPlan ? true : await confirmDialog({
                    title: 'Less than the full amount',
                    message: `₹${received.toLocaleString('en-IN')} is less than the full ₹${total.toLocaleString('en-IN')}. Record it as a PART payment (₹${(total - received).toLocaleString('en-IN')} balance stays due)? Choose "Flag mismatch" to mark it for review instead.`,
                    confirmLabel: 'Record part payment', cancelLabel: 'Flag mismatch',
                });
                if (asPartial) body.partial = true;
            }
        } else if (action === 'reject') {
            const reason = await promptDialog({ title: 'Reject payment', message: 'Reason for rejection (sent to the customer):', placeholder: 'e.g. UTR not found', confirmLabel: 'Reject' });
            if (reason === null) return;
            body.note = reason;
        } else if (action === 'cheque_received') {
            if (!(await confirmDialog({ title: 'Cheque received', message: 'Mark the cheque as received (awaiting clearance)?' }))) return;
        } else if (action === 'cheque_bounced' || action === 'reverse') {
            if (!(await confirmDialog({ title: action === 'reverse' ? 'Reverse payment' : 'Cheque bounced', message: action === 'reverse' ? 'Reverse this payment? The seat will be released.' : 'Mark this cheque as bounced?', danger: true, confirmLabel: 'Confirm' }))) return;
            const reason = await promptDialog({ title: 'Reason', message: action === 'reverse' ? 'Why is this payment being reversed? (recorded in the audit log)' : 'Reason the cheque bounced (recorded in the audit log):', placeholder: 'e.g. Cash never received / cheque returned', required: true, confirmLabel: 'Confirm' });
            if (reason === null) return;
            body.note = reason;
        }
        setVerifyingId(reg.id);
        const { ok, data } = await mutate('/api/admin/verify-payment', 'POST', body);
        setVerifyingId(null);
        if (!ok) { toast.error(data.error || 'Action failed.'); return; }
        if (data.status === 'amount_mismatch') toast.error('⚠️ Recorded amount is short of the tier price — flagged as Amount Mismatch (not marked Paid).');
        else if (data.status === 'advance_paid') toast.success(`Advance recorded — ₹${Number(data.amount_due || 0).toLocaleString('en-IN')} balance due.`);
        else toast.success('Done.');
        await fetchAllData();
    };
    const handleRecordOffline = async (reg: Registration) => {
        const presetMethod = reg.payment_method && ['bank_transfer', 'cheque', 'cash', 'dd'].includes(reg.payment_method) ? reg.payment_method : 'cash';
        const method = await promptDialog({ title: 'Record offline payment', message: 'Payment method — bank_transfer / cheque / cash / dd:', defaultValue: presetMethod, required: true });
        if (!method) return;
        if (!['bank_transfer', 'cheque', 'cash', 'dd'].includes(method)) { toast.error('Invalid method.'); return; }
        const total = Number(reg.total_amount) || 0;
        const amt = await promptDialog({ title: 'Record offline payment', message: 'Amount received (₹):', defaultValue: String(reg.total_amount || ''), inputType: 'number', required: true });
        if (amt === null) return;
        const received = Number(amt);
        const reference = (await promptDialog({ title: 'Record offline payment', message: 'Reference (UTR / cheque no / receipt no) — optional:' })) || '';
        const body: Record<string, unknown> = { id: reg.id, action: 'record', method, amount: received, reference };
        // A short amount → part payment (balance kept due) or flag as mismatch.
        if (received > 0 && total > 0 && received < total - 1) {
            const asPartial = reg.payment_plan === 'partial' ? true : await confirmDialog({
                title: 'Less than the full amount',
                message: `₹${received.toLocaleString('en-IN')} is less than the full ₹${total.toLocaleString('en-IN')}. Record it as a PART payment (₹${(total - received).toLocaleString('en-IN')} balance stays due)? Choose "Flag mismatch" to mark it for review instead.`,
                confirmLabel: 'Record part payment', cancelLabel: 'Flag mismatch',
            });
            if (asPartial) body.partial = true;
        }
        setVerifyingId(reg.id);
        const { ok, data } = await mutate('/api/admin/verify-payment', 'POST', body);
        setVerifyingId(null);
        if (!ok) { toast.error(data.error || 'Failed.'); return; }
        if (data.status === 'amount_mismatch') toast.error('⚠️ Amount is short of the tier price — flagged as Amount Mismatch.');
        else if (data.status === 'advance_paid') toast.success(`Advance recorded — ₹${Number(data.amount_due || 0).toLocaleString('en-IN')} balance due.`);
        else toast.success('Payment recorded — marked Paid.');
        await fetchAllData();
    };

    const [resendingId, setResendingId] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const handleCopyLink = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Fallback for browsers/contexts where the Clipboard API is unavailable.
            const ta = document.createElement('textarea');
            ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch { /* ignore */ }
            document.body.removeChild(ta);
        }
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };
    const handleResendBalance = async (id: string) => {
        if (!(await confirmDialog({ title: 'Re-send balance link', message: 'Re-send the balance payment link by email & WhatsApp?', confirmLabel: 'Send' }))) return;
        setResendingId(id);
        const { ok, data } = await mutate('/api/admin/resend-balance', 'POST', { id });
        setResendingId(null);
        if (!ok) { toast.error(data.error || 'Failed to send balance link.'); return; }
        toast.success(`Balance link sent — ✉️ ${data.emailed ? 'email' : 'no email'}, 📱 ${data.waSent ? 'WhatsApp' : 'no WhatsApp'}.`);
    };

    // Count of ERROR-severity health issues, badged on the Dashboard tab so real
    // problems (oversold tier, failed ticket delivery, ₹0 "paid" rows) find the admin
    // instead of waiting to be discovered. Detail lives in HealthPanel.
    const [healthErrors, setHealthErrors] = useState(0);
    useEffect(() => {
        if (!isAdmin) return;
        let alive = true;
        (async () => {
            try {
                const res = await fetch('/api/admin/health');
                const d = await res.json().catch(() => ({}));
                if (!alive || !res.ok) return;
                type Issue = { severity?: string };
                setHealthErrors((d.issues || []).filter((i: Issue) => i.severity === 'error').length);
            } catch { /* badge just stays 0 */ }
        })();
        return () => { alive = false; };
    }, [isAdmin]);

    // Copy the balance payment link for an advance-paid reg (create if missing, no
    // send) so the admin can share it by hand when the WhatsApp/email didn't land.
    const [copyingLinkId, setCopyingLinkId] = useState<string | null>(null);
    const handleCopyBalanceLink = async (reg: Registration) => {
        setCopyingLinkId(reg.id);
        let url = reg.balance_link_url;
        if (!url) {
            const { ok, data } = await mutate('/api/admin/balance-link', 'POST', { id: reg.id });
            if (!ok) { toast.error(data.error || 'Could not get the payment link.'); setCopyingLinkId(null); return; }
            url = data.link;
        }
        if (url) { await handleCopyLink(url); toast.success('Balance link copied — paste it to the devotee.'); }
        setCopyingLinkId(null);
    };

    // One-click "Sync all": re-check every open registration against Razorpay.
    const [syncingAll, setSyncingAll] = useState(false);
    const handleSyncAll = async () => {
        if (!(await confirmDialog({ title: 'Sync all payments', message: 'Re-check every pending, advance and amount-mismatch registration against Razorpay and apply any payment the webhook missed? This may take a few seconds.', confirmLabel: 'Sync all' }))) return;
        setSyncingAll(true);
        const { ok, data } = await mutate('/api/admin/reconcile-all', 'POST', {});
        setSyncingAll(false);
        if (!ok) { toast.error(data.error || 'Sync failed.'); return; }
        const changed = (data.completed || 0) + (data.advance_recorded || 0);
        toast.success(`Checked ${data.checked || 0} · ${data.completed || 0} completed · ${data.advance_recorded || 0} advance · ${data.amount_mismatch || 0} mismatch${changed ? '' : ' · nothing new to apply'}.`);
        await fetchAllData();
    };

    // Re-check a balance payment against Razorpay; completes the registration if
    // the link is actually paid (catches missed payment_link.paid webhooks).
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const handleSyncBalance = async (id: string) => {
        setSyncingId(id);
        const { ok, data } = await mutate('/api/admin/reconcile-balance', 'POST', { id });
        setSyncingId(null);
        if (!ok) { toast.error(data.error || 'Failed to sync with Razorpay.'); return; }
        if (data.completed) {
            toast.success(data.alreadyCompleted ? 'Already marked as paid.' : '✅ Payment verified on Razorpay — marked as Paid.');
            await fetchAllData();
        } else if (data.status === 'advance_recorded') {
            toast.success('✅ Verified — advance recorded. Balance link re-sent.');
            await fetchAllData();
        } else if (data.status === 'amount_mismatch') {
            toast.error(`⚠️ ${data.message}`);
            await fetchAllData();
        } else {
            toast.info(data.message || 'Balance is not paid on Razorpay yet.');
        }
    };

    // ----- Categories -----
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true);
        const { ok, data } = await mutate('/api/admin/categories', 'POST', {
            title: newCatTitle, price: Number(newCatPrice), description: newCatDesc,
            is_enquiry_only: newCatIsEnquiry, allow_enquiry: newCatAllowEnquiry,
            max_capacity: Number(newCatCapacity), show_availability: newCatShowAvail,
            event_id: newCatEventId || null,
        });
        if (!ok) toast.error(data.error || 'Failed to create tier.');
        else {
            setNewCatTitle(''); setNewCatPrice(''); setNewCatDesc('');
            setNewCatIsEnquiry(false); setNewCatAllowEnquiry(false); setNewCatCapacity('0'); setNewCatShowAvail(false);
            await fetchAllData();
        }
        setSaving(false);
    };
    const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/categories', 'PATCH', { id, updates });
        if (!ok) toast.error(data.error || 'Update failed.'); else { await fetchAllData(); toast.success('Tier updated.'); }
        setSaving(false);
    };
    const handleDeleteCategory = async (id: string, title: string) => {
        const password = await promptDialog({ title: 'Delete tier', message: `Enter your account password to delete "${title}":`, inputType: 'password', required: true, confirmLabel: 'Delete' });
        if (!password) return;
        setSaving(true);
        // First attempt (no force — server checks for paid registrations)
        const { ok, data, status } = await mutate('/api/admin/categories', 'DELETE', { id, password });
        if (!ok && status === 409 && data.hasPaid) {
            const confirmed = await confirmDialog({
                title: 'Tier has paid registrations',
                message: `⚠️ "${title}" has ${data.count} paid registration(s).\n\nDeleting will orphan those records (they stay in the DB but show "Deleted Tier").\n\nProceed anyway?`,
                danger: true, confirmLabel: 'Delete anyway',
            });
            if (confirmed) {
                const forced = await mutate('/api/admin/categories', 'DELETE', { id, password, force: true });
                if (!forced.ok) toast.error(forced.data.error || 'Delete failed.');
                else { toast.success('Tier deleted.'); await fetchAllData(); }
            }
        } else if (!ok) {
            toast.error(data.error || 'Delete failed.');
        } else {
            await fetchAllData();
        }
        setSaving(false);
    };

    // ----- Media -----
    const handleAddMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mediaUrl || !mediaEventId) { toast.error('Select an event to link this media to.'); return; }
        setSaving(true);
        const { ok, data } = await mutate('/api/admin/media', 'POST', {
            media_type: mediaType, url: mediaUrl, caption: mediaCaption, event_id: mediaEventId,
        });
        if (!ok) toast.error(data.error || 'Failed to add media.');
        else { setMediaUrl(''); setMediaCaption(''); await fetchAllData(); }
        setSaving(false);
    };
    const handleDeleteMedia = async (id: string) => {
        const pwd = await confirmWithPassword('Delete this media asset?');
        if (!pwd) return; setSaving(true);
        const { ok, data } = await mutate('/api/admin/media', 'DELETE', { id, password: pwd });
        if (!ok) toast.error(data.error || 'Delete failed.'); else await fetchAllData();
        setSaving(false);
    };

    // ----- Derived data -----
    const uniqueCategories = Array.from(new Set(registrations.map(r => r.categories?.title).filter(Boolean)));
    const catIdsByEvent = eventsList.reduce((acc, ev) => {
        acc[ev.id] = new Set(categoriesList.filter(c => c.event_id === ev.id).map(c => c.id));
        return acc;
    }, {} as Record<string, Set<string>>);
    // Apply every filter EXCEPT status here, so each section tab can show a live
    // count and switching sections doesn't change the other active filters.
    const baseFilteredRegistrations = registrations.filter(reg => {
        // Enquiry-pipeline rows live in the Enquiries tab, not the ledger.
        if (ENQUIRY_STATUSES.includes(reg.payment_status)) return false;
        const searchMatch = `${reg.first_name} ${reg.last_name} ${reg.phone} ${reg.gotra || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        const catTitle = reg.categories?.title || 'Deleted Tier';
        const catMatch = categoryFilter === 'all' || (categoryFilter === 'Deleted' && !reg.categories) || catTitle === categoryFilter;
        const eventMatch = eventFilter === 'all' || (reg.category_id != null && catIdsByEvent[eventFilter]?.has(reg.category_id));
        // Online rows created via Razorpay have payment_method null/'razorpay'.
        const methodMatch = methodFilter === 'all'
            || (methodFilter === 'razorpay' ? (!reg.payment_method || reg.payment_method === 'razorpay') : reg.payment_method === methodFilter);
        let dateMatch = true;
        if (startDate) { dateMatch = dateMatch && new Date(reg.created_at) >= new Date(startDate); }
        if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); dateMatch = dateMatch && new Date(reg.created_at) < end; }
        return searchMatch && catMatch && eventMatch && methodMatch && dateMatch;
    });

    const sectionCounts = baseFilteredRegistrations.reduce((acc, reg) => {
        acc[reg.payment_status] = (acc[reg.payment_status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const filteredRegistrations = statusFilter === 'all'
        ? baseFilteredRegistrations
        : baseFilteredRegistrations.filter(reg => reg.payment_status === statusFilter);

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

    // Dashboard figures are GLOBAL (whole dataset), not tied to the registrations
    // filter bar — so the overview stays meaningful on its own tab.
    // A volunteer with `dashboard:view` but NOT `registrations:view` receives no
    // rows (PII boundary in /api/admin/data); for them the tiles fall back to the
    // server-computed `stats.dashboard` numbers so they still see the summary.
    const dash = stats.dashboard;
    const hasRows = registrations.length > 0;
    const globalCompleted = hasRows ? registrations.filter(r => r.payment_status === 'completed').length : (dash?.completed ?? 0);
    const globalRevenue = hasRows ? registrations.filter(r => r.payment_status === 'completed').reduce((s, r) => s + Number(r.total_amount || 0), 0) : (dash?.revenue ?? 0);
    const globalTotal = hasRows ? registrations.length : (dash?.total ?? 0);
    // "Today" = local midnight onward, so it matches what the operator sees on a wall clock.
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const todayRegs = registrations.filter(r => new Date(r.created_at) >= startOfToday);
    const todayCount = hasRows ? todayRegs.length : (dash?.todayCount ?? 0);
    const todayPaid = hasRows ? todayRegs.filter(r => r.payment_status === 'completed').length : (dash?.todayPaid ?? 0);
    const todayRevenue = hasRows ? todayRegs.filter(r => r.payment_status === 'completed').reduce((s, r) => s + Number(r.total_amount || 0), 0) : (dash?.todayRevenue ?? 0);
    const globalToVerify = hasRows ? registrations.filter(r => r.payment_status === 'payment_review' || r.payment_status === 'cheque_received').length : (dash?.toVerify ?? 0);
    const globalNewEnquiries = hasRows ? registrations.filter(r => r.payment_status === 'enquired').length : (dash?.newEnquiries ?? 0);
    const globalCategoryMetrics = registrations.reduce((acc, reg) => {
        if (reg.payment_status === 'completed' || reg.payment_status === 'enquired' || reg.payment_status === 'contacted') {
            const catTitle = reg.categories?.title || 'Deleted Tier';
            acc[catTitle] = (acc[catTitle] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // Export handlers — thin wrappers over the pure builders in lib/adminExports.
    const downloadCSV = () => downloadRegistrationsCsv(filteredRegistrations, siteName);
    const downloadExcel = () => downloadRegistrationsExcel(filteredRegistrations, siteName);
    const printReceipts = () => printReceiptsPdf(filteredRegistrations, activeEvent?.title || '', siteName);
    const downloadFinancialExcel = () => downloadFinancialStatement(filteredRegistrations, siteName);

    // Shared between the desktop table row and the mobile card so both stay in sync.
    const renderStatusControl = (reg: Registration) => {
        const locked = TERMINAL_STATUSES.includes(reg.payment_status);
        const editable = can('registrations:manage') && !locked;
        return editable ? (
            <select
                value={reg.payment_status}
                onChange={(e) => handleUpdateStatus(reg.id, e.target.value)}
                disabled={saving}
                className={`py-1 px-2.5 rounded-full text-xs font-semibold cursor-pointer outline-none border hover:shadow-sm transition-all focus:ring-2 focus:ring-orange-500 disabled:opacity-50 ${statusClasses(reg.payment_status)}`}
            >
                {/* Paid/Refunded are intentionally absent — marking Paid records no
                    money and Refunded returns none. Use Record ₹ / Approve to complete,
                    and the Refund button to refund. See registrations/route.js. */}
                <option value="pending">⏳ Pending</option><option value="enquired">💬 Enquired</option><option value="contacted">📞 Contacted</option><option value="failed">✖ Failed</option>
            </select>
        ) : (
            <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-xs font-semibold border ${statusClasses(reg.payment_status)}`} title={locked ? 'Locked financial state' : undefined}>
                {locked && <Lock className="w-3 h-3 mr-1" />}{STATUS_LABEL[reg.payment_status]}
            </span>
        );
    };

    const renderRowActions = (reg: Registration) => (
        <div className="flex items-center gap-2">
            <button onClick={() => setSelectedRegistration(reg)} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shadow-sm" title="View details"><Eye className="w-4 h-4" /></button>
            {can('qr:send') && reg.payment_status === 'completed' && (
                <a href={`/api/admin/qr/${reg.id}`} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition shadow-sm" title="Download QR Code"><QrCode className="w-4 h-4" /></a>
            )}
            {can('registrations:manage') && reg.payment_status === 'completed' && (reg.ticket_email_status === 'failed' || reg.ticket_wa_status === 'failed') && (
                <button onClick={() => handleResendConfirmation(reg, true)} disabled={managingId === reg.id} className="p-2 border border-rose-200 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition shadow-sm disabled:opacity-50 animate-pulse" title={`Ticket delivery failed (${[reg.ticket_email_status === 'failed' ? 'email' : null, reg.ticket_wa_status === 'failed' ? 'WhatsApp' : null].filter(Boolean).join(' + ')}) — retry only the failed channel`}>⚠️</button>
            )}
            {(!isVolunteer || can('payments:verify')) && (reg.payment_status === 'advance_paid' || reg.payment_status === 'amount_mismatch') && (
                <button onClick={() => handleSyncBalance(reg.id)} disabled={syncingId === reg.id} className="p-2 border border-green-200 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition shadow-sm disabled:opacity-50" title="Re-check this payment against Razorpay"><RefreshCw className={`w-4 h-4 ${syncingId === reg.id ? 'animate-spin' : ''}`} /></button>
            )}
            {(!isVolunteer || can('reminders:send')) && reg.payment_status === 'advance_paid' && (
                <button onClick={() => handleCopyBalanceLink(reg)} disabled={copyingLinkId === reg.id} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-100 transition shadow-sm disabled:opacity-50" title="Copy the balance payment link to share manually (e.g. WhatsApp didn't arrive)">{copyingLinkId === reg.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}</button>
            )}
            {(!isVolunteer || can('reminders:send')) && reg.payment_status === 'advance_paid' && (
                <button onClick={() => handleResendBalance(reg.id)} disabled={resendingId === reg.id} className="p-2 border border-amber-200 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition shadow-sm disabled:opacity-50" title="Re-send balance payment link by email & WhatsApp"><IndianRupee className="w-4 h-4" /></button>
            )}
            {can('payments:verify') && reg.payment_status === 'amount_mismatch' && (
                <button onClick={() => handleVerifyPayment(reg, 'approve')} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-amber-300 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition shadow-sm text-xs font-semibold disabled:opacity-50" title="Reconcile — record the actual amount received (full payment, or an advance with balance due)">Reconcile</button>
            )}

            {/* Offline payment verification */}
            {reg.offline_proof_path && (reg.payment_status === 'payment_review' || reg.payment_status === 'cheque_received' || reg.payment_status === 'payment_rejected') && (
                <button onClick={() => viewProof(reg.id)} className="p-2 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-100 transition shadow-sm" title="View payment proof"><ImageIcon className="w-4 h-4" /></button>
            )}
            {can('payments:verify') && reg.payment_status === 'payment_review' && (
                <>
                    {reg.payment_method === 'cheque'
                        ? <button onClick={() => handleVerifyPayment(reg, 'cheque_received')} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-cyan-200 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition shadow-sm text-xs font-semibold disabled:opacity-50">Cheque in hand</button>
                        : <button onClick={() => handleVerifyPayment(reg, 'approve')} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-green-200 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition shadow-sm text-xs font-semibold disabled:opacity-50">Approve</button>}
                    <button onClick={() => handleVerifyPayment(reg, 'reject')} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-rose-200 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm text-xs font-semibold disabled:opacity-50">Reject</button>
                </>
            )}
            {can('payments:verify') && reg.payment_status === 'cheque_received' && (
                <>
                    <button onClick={() => handleVerifyPayment(reg, 'cheque_cleared')} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-green-200 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition shadow-sm text-xs font-semibold disabled:opacity-50">Cleared</button>
                    <button onClick={() => handleVerifyPayment(reg, 'cheque_bounced')} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-rose-200 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm text-xs font-semibold disabled:opacity-50">Bounced</button>
                </>
            )}
            {can('payments:verify') && (reg.payment_status === 'pending' || reg.payment_status === 'payment_rejected') && (
                <button onClick={() => handleRecordOffline(reg)} disabled={verifyingId === reg.id} className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700 hover:bg-neutral-100 transition shadow-sm text-xs font-semibold disabled:opacity-50" title="Record an offline payment (cash/cheque/transfer)">Record ₹</button>
            )}
        </div>
    );

    const renderAmountCell = (reg: Registration) => (
        <>
            ₹{reg.total_amount}
            {/* Split the total so it's never ambiguous how much of it is the Seva fee
                and how much is the optional donation (they're billed differently —
                a part-payment advance is a % of the Seva fee only). */}
            {Number(reg.donation_amount) > 0 && (
                <div className="text-[11px] font-normal text-neutral-500 mt-0.5">
                    Seva ₹{Math.max(0, Number(reg.total_amount || 0) - Number(reg.donation_amount || 0)).toLocaleString('en-IN')}
                    {' + '}
                    <span className="text-rose-600">Donation ₹{Number(reg.donation_amount).toLocaleString('en-IN')}</span>
                </div>
            )}
            <div className="text-[11px] font-normal text-neutral-400 mt-0.5">via {PAYMENT_MODE_LABEL[reg.payment_method || 'razorpay'] || 'Online'}</div>
            {reg.payment_status === 'advance_paid' && (
                <div className="text-[11px] font-semibold text-amber-700 mt-0.5">Paid ₹{reg.amount_paid} · Due ₹{reg.amount_due}</div>
            )}
            {reg.payment_status === 'completed' && (
                reg.qr_sent_at
                    ? <div className="text-[11px] font-semibold text-green-700 mt-0.5 flex items-center gap-1"><Check className="w-3 h-3" /> QR sent {new Date(reg.qr_sent_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                    : <div className="text-[11px] font-semibold text-neutral-400 mt-0.5">QR not sent</div>
            )}
        </>
    );

    const toggleSelected = (id: string, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id); else next.delete(id);
        setSelectedIds(next);
    };

    // ----- Session check in progress (avoid flashing the login screen on refresh) -----
    if (checkingSession) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 text-neutral-900 [color-scheme:light]">
                <div className="flex items-center gap-3 text-neutral-500">
                    <RefreshCw className="w-5 h-5 animate-spin" /> <span className="text-sm font-medium">Checking session…</span>
                </div>
            </div>
        );
    }

    // ----- Login screen -----
    if (!role) {
        return (
            <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 text-neutral-900 [color-scheme:light]">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="text-white w-8 h-8" /></div>
                    <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
                    <p className="text-sm text-neutral-500 mb-6">Sign in with your account username and password.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" />
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 pr-12 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" />
                            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full bg-neutral-900 text-white font-medium py-3 rounded-lg hover:bg-orange-600 transition">Unlock Terminal</button>
                    </form>
                </div>
            </div>
        );
    }

    // Global search — matches ANY registration (every status/tab) by name, phone,
    // or email. Uses the already-loaded list, so it's instant.
    const gq = globalQuery.trim().toLowerCase();
    const globalResults = gq.length >= 2 ? registrations.filter(r => {
        const name = `${r.full_name || ''} ${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
        return name.includes(gq) || String(r.phone || '').toLowerCase().includes(gq) || String(r.email || '').toLowerCase().includes(gq);
    }).slice(0, 8) : [];

    // Which tab actually renders. Admin sees the active tab as-is; a volunteer is
    // redirected to their first permitted tab if the active one isn't allowed.
    const TAB_PERM: Record<string, string> = { dashboard: 'dashboard:view', registrations: 'registrations:view', enquiries: 'enquiries:manage', scanlog: 'scanlog:view', settings: 'settings:manage', audit: 'audit:view' };
    const effectiveTab = (() => {
        if (isVolunteer) {
            if (can(TAB_PERM[activeTab])) return activeTab;
            return (['dashboard', 'registrations', 'enquiries', 'scanlog', 'settings', 'audit'] as const).find(k => can(TAB_PERM[k])) || 'dashboard';
        }
        return activeTab;
    })();

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900 [color-scheme:light]">
            <Toaster />

            <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3">
                {activeEvent ? (
                    <div className="bg-neutral-900 text-white px-4 py-3 rounded-xl flex flex-wrap items-center gap-3 shadow-lg max-w-full">
                        <span className="relative flex h-3 w-3 flex-shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                        <span className="text-sm font-medium text-neutral-300 whitespace-nowrap">Live Event:</span>
                        <span className="font-bold tracking-wide break-all">{activeEvent.title}</span>
                    </div>
                ) : <div />}
                <div className="flex items-center gap-3 flex-wrap">
                    {lastUpdated && (
                        <span className="text-xs text-neutral-400 hidden sm:inline" title="Registrations auto-refresh every 30s">
                            Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={refreshRegistrations}
                        disabled={refreshing}
                        title="Refresh registrations now"
                        className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-orange-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-orange-200 hover:bg-orange-50 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button
                        onClick={() => setAutoRefresh((v) => !v)}
                        title={autoRefresh ? 'Auto-refresh is ON (every 30s)' : 'Auto-refresh is OFF'}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}
                    >
                        Auto {autoRefresh ? 'ON' : 'OFF'}
                    </button>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isAdmin ? 'Admin' : 'Volunteer'}
                    </span>
                    <a href="/scan" target="_blank" className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-orange-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-orange-200 hover:bg-orange-50 transition"><QrCode className="w-4 h-4" /> Scanner</a>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-red-600 border border-neutral-200 px-3 py-1.5 rounded-lg hover:border-red-200 hover:bg-red-50 transition"><LogOut className="w-4 h-4" /> Logout</button>
                </div>
            </div>

            {/* Global search — find any person across every status/tab */}
            {can('registrations:view') && (
                <div className="max-w-7xl mx-auto mb-6 relative">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                            type="text"
                            value={globalQuery}
                            onChange={(e) => setGlobalQuery(e.target.value)}
                            placeholder="Search anyone by name, phone, or email…"
                            className="w-full pl-11 pr-10 py-3 bg-white border border-neutral-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
                        />
                        {globalQuery && <button onClick={() => setGlobalQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"><X className="w-4 h-4" /></button>}
                    </div>
                    {gq.length >= 2 && (
                        <div className="absolute z-40 mt-1.5 w-full bg-white border border-neutral-200 rounded-xl shadow-xl max-h-[26rem] overflow-y-auto">
                            {globalResults.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-neutral-400">No one matches “{globalQuery}”.</div>
                            ) : globalResults.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => { setSelectedRegistration(r); setGlobalQuery(''); }}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-orange-50 border-b border-neutral-100 last:border-0 transition"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-neutral-900 truncate">{r.full_name || `${r.first_name} ${r.last_name}`}</p>
                                        <p className="text-xs text-neutral-500 truncate">{r.phone}{r.email ? ` · ${r.email}` : ''}{r.categories?.title ? ` · ${r.categories.title}` : ''}</p>
                                    </div>
                                    <span className={`flex-shrink-0 inline-flex items-center py-0.5 px-2 rounded-full text-[11px] font-bold border ${statusClasses(r.payment_status)}`}>{STATUS_LABEL[r.payment_status] || r.payment_status}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {selectedRegistration && (
                <RegistrationDetailModal
                    reg={selectedRegistration}
                    onClose={() => setSelectedRegistration(null)}
                    can={can}
                    isAdmin={isAdmin}
                    verifyingId={verifyingId}
                    syncingId={syncingId}
                    managingId={managingId}
                    copiedLink={copiedLink}
                    onViewProof={viewProof}
                    onVerify={handleVerifyPayment}
                    onCopyLink={handleCopyLink}
                    onCopyBalanceLink={handleCopyBalanceLink}
                    onAdjustDonation={handleAdjustDonation}
                    onSyncBalance={handleSyncBalance}
                    onEdit={setEditingReg}
                    onResendConfirmation={handleResendConfirmation}
                    onRefund={handleRefund}
                    onCancel={handleCancel}
                />
            )}

            {editingReg && (
                <EditRegistrationModal reg={editingReg} onClose={() => setEditingReg(null)} onSaved={async () => { setSelectedRegistration(null); await fetchAllData(); }} />
            )}

            {showAddReg && (
                <AddRegistrationModal categories={categoriesList} onClose={() => setShowAddReg(false)} onCreated={async () => { setShowAddReg(false); await fetchAllData(); }} />
            )}

            {showBroadcast && (
                <BroadcastModal categories={categoriesList} onClose={() => setShowBroadcast(false)} />
            )}

            <div className="max-w-7xl mx-auto mb-8 border-b border-neutral-200 pb-6 flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-neutral-900">Control Center</h1>
                {/* Responsive segmented nav — scrolls horizontally on small screens
                    instead of overflowing/wrapping. */}
                <div className="flex gap-1 bg-neutral-200 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {([
                        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: isVolunteer ? can('dashboard:view') : true, badge: healthErrors },
                        { key: 'registrations', label: 'Registrations', icon: ListFilter, show: isVolunteer ? can('registrations:view') : true, badge: globalToVerify },
                        { key: 'enquiries', label: 'Enquiries', icon: MessageSquare, show: isVolunteer ? can('enquiries:manage') : true, badge: globalNewEnquiries },
                        { key: 'scanlog', label: 'Scan Log', icon: QrCode, show: isVolunteer ? can('scanlog:view') : true, badge: 0 },
                        { key: 'settings', label: 'Settings', icon: Settings, show: isVolunteer ? can('settings:manage') : isAdmin, badge: 0 },
                        { key: 'audit', label: 'Audit', icon: ScrollText, show: isVolunteer ? can('audit:view') : isAdmin, badge: 0 },
                    ] as const).filter(t => t.show).map(t => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`flex-shrink-0 flex-1 md:flex-none px-4 sm:px-5 py-2.5 text-sm font-semibold rounded-lg transition flex justify-center items-center gap-2 whitespace-nowrap ${effectiveTab === t.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:bg-neutral-300/50'}`}
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" /> {t.label}
                                {t.badge > 0 && <span className="ml-0.5 bg-orange-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center">{t.badge}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {effectiveTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <div className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-amber-100 text-amber-600 rounded-lg"><CalendarDays className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Today&rsquo;s Registrations</p><p className="text-2xl font-bold">{todayCount}</p><p className="text-xs text-neutral-400 mt-0.5">{todayPaid} paid · ₹{todayRevenue.toLocaleString('en-IN')}</p></div></div>
                            <div className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-orange-100 text-orange-600 rounded-lg"><Users className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Confirmed Attendees</p><p className="text-2xl font-bold">{globalCompleted}</p></div></div>
                            <div className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-green-100 text-green-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Total Revenue (Paid)</p><p className="text-2xl font-bold">₹{globalRevenue.toLocaleString('en-IN')}</p></div></div>
                            <div className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm"><div className="p-4 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Total Registrations</p><p className="text-2xl font-bold">{globalTotal}</p></div></div>
                            <button onClick={() => { setActiveTab('registrations'); setStatusFilter('payment_review'); }} className={`bg-white border p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm text-left transition ${globalToVerify > 0 ? 'border-indigo-300 hover:bg-indigo-50' : 'border-neutral-200'}`}><div className="p-4 bg-indigo-100 text-indigo-600 rounded-lg"><IndianRupee className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Payments to Verify</p><p className="text-2xl font-bold">{globalToVerify}</p></div></button>

                            {/* Donations + check-ins come from their own tables, and only for
                                roles that can already reach those panels. */}
                            {stats.donationsTotal !== null && (
                                <button onClick={() => { setActiveTab('settings'); setSettingsSubTab('donations'); }} className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm text-left hover:bg-rose-50 hover:border-rose-200 transition"><div className="p-4 bg-rose-100 text-rose-600 rounded-lg"><Gift className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Seva Raised</p><p className="text-2xl font-bold">₹{stats.donationsTotal.toLocaleString('en-IN')}</p><p className="text-xs text-neutral-400 mt-0.5">{stats.donations?.length || 0} contribution{(stats.donations?.length || 0) === 1 ? '' : 's'}</p></div></button>
                            )}
                            {stats.checkedInRegs !== null && (
                                <button onClick={() => setActiveTab('scanlog')} className="bg-white border border-neutral-200 p-5 md:p-6 rounded-xl flex items-center gap-4 shadow-sm text-left hover:bg-teal-50 hover:border-teal-200 transition"><div className="p-4 bg-teal-100 text-teal-600 rounded-lg"><UserCheck className="w-6 h-6" /></div><div><p className="text-sm font-medium text-neutral-500">Checked In</p><p className="text-2xl font-bold">{stats.checkedInRegs}</p><p className="text-xs text-neutral-400 mt-0.5">of {globalCompleted} paid{globalCompleted > 0 ? ` · ${Math.round((stats.checkedInRegs / globalCompleted) * 100)}%` : ''}</p></div></button>
                            )}
                        </div>

                        {isAdmin && <HealthPanel />}

                        {/* Row-level analytics need the raw registrations; a volunteer
                            without registrations:view gets the summary tiles above only. */}
                        {can('registrations:view') && (<>
                        <DashboardAnalytics registrations={registrations} categories={categoriesList} donations={stats.donations} />

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
                                {Object.keys(globalCategoryMetrics).length === 0 ? <span className="text-sm text-neutral-400">No data yet.</span> : Object.entries(globalCategoryMetrics).map(([cat, count]) => (
                                    <div key={cat} className="bg-neutral-50 border border-neutral-200 px-4 py-2 rounded-lg flex items-center gap-3"><span className="font-semibold text-neutral-700 text-sm">{cat}</span><span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full">{count}</span></div>
                                ))}
                            </div>
                        </div>
                        </>)}
                    </div>
                )}

                {effectiveTab === 'registrations' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input type="text" placeholder="Search name, gotra, or phone..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
                                </div>
                                {can('registrations:manage') && <button onClick={() => setShowAddReg(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><UserPlus className="w-4 h-4" /> Add Registration</button>}
                                {can('reminders:send') && <button onClick={() => setShowBroadcast(true)} className="bg-neutral-900 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><Megaphone className="w-4 h-4" /> Broadcast</button>}
                                {can('payments:verify') && <button onClick={handleSyncAll} disabled={syncingAll} title="Re-check all pending / advance / mismatch registrations against Razorpay in one go" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} /> {syncingAll ? 'Syncing…' : 'Sync all'}</button>}
                                <button onClick={downloadCSV} className="bg-neutral-900 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><Download className="w-4 h-4" /> CSV</button>
                                <button onClick={downloadExcel} className="bg-neutral-900 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><Download className="w-4 h-4" /> Excel</button>
                                <button onClick={printReceipts} title="Combined receipts for paid registrations in the current filter → save as PDF" className="border border-neutral-300 text-neutral-700 hover:bg-neutral-100 px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><Download className="w-4 h-4" /> Receipts PDF</button>
                                <button onClick={downloadFinancialExcel} title="Financial statement (paid only) for the current filter" className="border border-neutral-300 text-neutral-700 hover:bg-neutral-100 px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm transition whitespace-nowrap"><Download className="w-4 h-4" /> Financial</button>
                            </div>
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus-within:border-orange-600 transition flex-wrap"><CalendarIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent focus:outline-none text-neutral-600 min-w-0" /><span className="text-neutral-400">–</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent focus:outline-none text-neutral-600 min-w-0" /></div>
                                <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[140px] px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"><option value="all">All Events</option>{eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.title}{ev.is_active ? ' ✓' : ''}</option>)}</select>
                                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[140px] px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"><option value="all">All Categories</option>{uniqueCategories.map((cat, idx) => <option key={idx} value={cat as string}>{cat}</option>)}<option value="Deleted"> [Deleted Tiers]</option></select>
                                <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[140px] px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-orange-600"><option value="all">All Payment Modes</option><option value="razorpay">💳 Online (Razorpay)</option><option value="bank_transfer">🏦 Bank Transfer</option><option value="cheque">🧾 Cheque</option><option value="cash">💵 Cash</option><option value="dd">📄 Demand Draft</option></select>
                            </div>
                        </div>

                        {/* Section tabs — saved views by payment status, plus a master list.
                            Counts respect every other active filter (search, event, category, date). */}
                        <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-sm flex flex-wrap gap-2">
                            {REGISTRATION_SECTIONS.map(section => {
                                const active = statusFilter === section.key;
                                const count = section.key === 'all' ? baseFilteredRegistrations.length : (sectionCounts[section.key] || 0);
                                return (
                                    <button
                                        key={section.key}
                                        onClick={() => { setStatusFilter(section.key); setCurrentPage(1); setSelectedIds(new Set()); }}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition border ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                                    >
                                        {section.label}
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Abandoned-pending cleanup + recovery (Pending tab) */}
                        {(can('registrations:manage') || can('reminders:send')) && statusFilter === 'pending' && (sectionCounts['pending'] || 0) > 0 && (
                            <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3 gap-3 flex-wrap">
                                <span className="text-sm text-yellow-900">Pending are online checkouts that were never paid. Send a fresh payment link to recover them, or clear old, abandoned ones.</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {can('reminders:send') && <button onClick={() => handleBulkRemind('pending')} disabled={reminding} className="flex items-center gap-2 bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-orange-700 transition whitespace-nowrap disabled:opacity-50"><Send className="w-4 h-4" /> {reminding ? 'Sending…' : 'Send Payment Links'}</button>}
                                    {can('registrations:manage') && <button onClick={handleClearPending} className="flex items-center gap-2 bg-yellow-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-yellow-700 transition whitespace-nowrap"><Trash2 className="w-4 h-4" /> Clear Abandoned</button>}
                                </div>
                            </div>
                        )}

                        {/* Balance-due recovery (Advance-Paid tab) */}
                        {can('reminders:send') && statusFilter === 'advance_paid' && (sectionCounts['advance_paid'] || 0) > 0 && (
                            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 gap-3 flex-wrap">
                                <span className="text-sm text-amber-900">These registrations have paid a part amount. Send everyone their remaining-balance payment link in one click.</span>
                                <button onClick={() => handleBulkRemind('balance')} disabled={reminding} className="flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition whitespace-nowrap disabled:opacity-50"><Send className="w-4 h-4" /> {reminding ? 'Sending…' : 'Send Balance Reminders'}</button>
                            </div>
                        )}

                        {selectedIds.size > 0 && (!isVolunteer || can('qr:send')) && (() => {
                            const selSel = registrations.filter(r => selectedIds.has(r.id));
                            const selPaid = selSel.filter(r => r.payment_status === 'completed');
                            const selNotPaid = selSel.length - selPaid.length;
                            const selUnsent = selPaid.filter(r => !r.qr_sent_at).length;
                            const selAlready = selPaid.length - selUnsent;
                            const willSend = resendQr ? selPaid.length : selUnsent;
                            return (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 sticky bottom-2 z-20 shadow-lg sm:static sm:shadow-none">
                                    <div className="text-sm text-orange-900">
                                        <span className="font-semibold">{selectedIds.size} selected</span>
                                        <span className="text-orange-700/80">
                                            {' · '}{selPaid.length} Paid ({selUnsent} new, {selAlready} already sent)
                                            {selNotPaid > 0 && ` · ${selNotPaid} not Paid (skipped)`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <label className="flex items-center gap-1.5 text-xs font-semibold text-orange-900 cursor-pointer select-none">
                                            <input type="checkbox" checked={resendQr} onChange={(e) => setResendQr(e.target.checked)} className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500" />
                                            Resend to already-sent
                                        </label>
                                        <button onClick={() => { setSelectedIds(new Set()); setResendQr(false); }} className="text-xs text-orange-600 hover:text-orange-800 font-semibold transition">Clear</button>
                                        <button onClick={handleSendQr} disabled={sendingQr || willSend === 0} className="flex items-center gap-2 bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                            {sendingQr ? 'Sending...' : `📲 Send QR (${willSend})`}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Desktop: table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-neutral-100 text-neutral-600 font-medium border-b border-neutral-200">
                                        <tr><th className="w-10 px-4 py-3"><input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" checked={pagedRegistrations.length > 0 && pagedRegistrations.every(r => selectedIds.has(r.id))} onChange={(e) => { const next = new Set(selectedIds); pagedRegistrations.forEach(r => e.target.checked ? next.add(r.id) : next.delete(r.id)); setSelectedIds(next); }} /></th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Name & Contact</th><th className="px-6 py-4">Gotra</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Registered</th><th className="px-6 py-4 text-center">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {loading ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-neutral-400">Loading ledger data...</td></tr>) : filteredRegistrations.length === 0 ? (<tr><td colSpan={8} className="px-6 py-8 text-center text-neutral-400">No records match your filters.</td></tr>) : (
                                            pagedRegistrations.map((reg) => (
                                                <tr key={reg.id} className="hover:bg-neutral-50 transition">
                                                    <td className="px-4 py-4"><input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" checked={selectedIds.has(reg.id)} onChange={(e) => toggleSelected(reg.id, e.target.checked)} /></td>
                                                    <td className="px-6 py-4">{renderStatusControl(reg)}</td>
                                                    <td className="px-6 py-4 font-medium text-neutral-900">
                                                        {reg.first_name} {reg.last_name}
                                                        <br /><span className="text-xs font-normal text-neutral-500">{reg.phone}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-neutral-600">{reg.gotra || '-'}</td>
                                                    <td className="px-6 py-4 text-neutral-600">{reg.categories?.title || 'Deleted Category'}</td>
                                                    <td className="px-6 py-4 font-bold text-neutral-900">{renderAmountCell(reg)}</td>
                                                    <td className="px-6 py-4 text-neutral-600 text-xs whitespace-nowrap">{reg.created_at ? <>{new Date(reg.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<br /><span className="text-neutral-400">{new Date(reg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></> : '—'}</td>
                                                    <td className="px-6 py-4"><div className="flex justify-center">{renderRowActions(reg)}</div></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile: stacked cards (no horizontal scroll) */}
                            <div className="md:hidden">
                                {loading ? (
                                    <div className="px-6 py-8 text-center text-neutral-400 text-sm">Loading ledger data...</div>
                                ) : filteredRegistrations.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-neutral-400 text-sm">No records match your filters.</div>
                                ) : (
                                    <div className="divide-y divide-neutral-100">
                                        {pagedRegistrations.map((reg) => (
                                            <div key={reg.id} className="p-4 flex gap-3">
                                                <input type="checkbox" className="mt-1 w-4 h-4 flex-shrink-0 rounded border-neutral-300 text-orange-600 focus:ring-orange-500" checked={selectedIds.has(reg.id)} onChange={(e) => toggleSelected(reg.id, e.target.checked)} />
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-neutral-900 truncate">{reg.first_name} {reg.last_name}</p>
                                                            <p className="text-xs text-neutral-500">{reg.phone}</p>
                                                        </div>
                                                        <div className="flex-shrink-0">{renderStatusControl(reg)}</div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-neutral-500">
                                                        <span>{reg.categories?.title || 'Deleted Category'}</span>
                                                        {reg.gotra && <span className="truncate ml-2">Gotra: {reg.gotra}</span>}
                                                    </div>
                                                    {reg.created_at && <p className="text-[11px] text-neutral-400">Registered {new Date(reg.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                                                    <div className="flex items-end justify-between gap-2 pt-1">
                                                        <div className="font-bold text-neutral-900 text-sm">{renderAmountCell(reg)}</div>
                                                        {renderRowActions(reg)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

                {effectiveTab === 'enquiries' && (
                    <EnquiriesPanel registrations={registrations} isAdmin={can('enquiries:manage')} onChanged={refreshRegistrations} />
                )}

                {effectiveTab === 'scanlog' && (
                    <div className="space-y-6">
                        <EventOpsPanel />
                        {/* Manual check-in admits someone, so it needs the gate
                            permission — not merely the right to read the log. */}
                        {can('checkin:scan') && <ManualCheckin registrations={registrations} checkpoints={checkpointsList} onCheckedIn={refreshRegistrations} />}
                        <ScanLogPanel checkpoints={checkpointsList} canUndo={can('checkin:scan')} />
                    </div>
                )}

                {effectiveTab === 'audit' && can('audit:view') && (
                    <AuditLogPanel />
                )}

                {effectiveTab === 'settings' && can('settings:manage') && (
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                        <div className="w-full md:w-64 bg-neutral-50 border-r border-neutral-200 p-3 md:max-h-[80vh] md:overflow-y-auto">
                            {/* Search — jumps straight to any panel by name (findability). */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    value={settingsQuery}
                                    onChange={(e) => setSettingsQuery(e.target.value)}
                                    placeholder="Search settings…"
                                    className="w-full h-9 pl-9 pr-3 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            {(() => {
                                const q = settingsQuery.trim().toLowerCase();
                                const SECTIONS = [
                                    { group: 'Website Content', items: [
                                        { k: 'events', Icon: CalendarDays, label: 'Event Setup', kw: 'venue date title event' },
                                        { k: 'homecontent', Icon: LayoutDashboard, label: 'Home Page Content', kw: 'schedule guests highlights faq news testimonials countdown registration open close' },
                                        { k: 'pageheaders', Icon: ImageIcon, label: 'Page Headers', kw: 'hero banner about gallery' },
                                        { k: 'media', Icon: ImageIcon, label: 'Media Gallery', kw: 'photos images videos' },
                                        { k: 'library', Icon: FolderOpen, label: 'Media Library', kw: 'files upload documents downloads' },
                                    ] },
                                    { group: 'Sevas & Registration', items: [
                                        { k: 'tiers', Icon: Ticket, label: 'Sevas & Tiers', kw: 'category price perks colour capacity ticket' },
                                        { k: 'formfields', Icon: ListFilter, label: 'Form Fields', kw: 'registration form custom fields' },
                                        { k: 'declaration', Icon: ScrollText, label: 'Declaration', kw: 'samanti patra consent terms' },
                                        { k: 'consents', Icon: ScrollText, label: 'Consent Records', kw: 'samanti patra signed accepted' },
                                        { k: 'waitlist', Icon: ListFilter, label: 'Waitlist', kw: 'full sold out' },
                                        { k: 'checkpoints', Icon: QrCode, label: 'Entry Checkpoints', kw: 'scan gate qr band wristband colour color' },
                                    ] },
                                    { group: 'Payments & Donations', items: [
                                        { k: 'payment', Icon: IndianRupee, label: 'Payment Details', kw: 'bank upi cheque offline razorpay account' },
                                        { k: 'donations', Icon: IndianRupee, label: 'Donations', kw: 'seva contributions' },
                                        { k: 'sevacategories', Icon: Gift, label: 'Donation Presets', kw: 'donate seva amounts annadaan' },
                                        { k: 'sponsors', Icon: Handshake, label: 'Sponsors', kw: 'company logo' },
                                    ] },
                                    { group: 'Messages & Contact', items: [
                                        { k: 'contactsocial', Icon: Phone, label: 'Contact & Social', kw: 'phone email address instagram facebook youtube whatsapp' },
                                        { k: 'contactmessages', Icon: Mail, label: 'Contact Messages', kw: 'enquiries inbox contact form' },
                                        { k: 'feedback', Icon: MessageSquare, label: 'Feedback', kw: 'reviews rating' },
                                        { k: 'templates', Icon: FileCode, label: 'Templates & Config', kw: 'email whatsapp qr' },
                                        { k: 'messages', Icon: Mail, label: 'Message Log', kw: 'sent email whatsapp delivery', gate: 'audit:view' },
                                    ] },
                                    { group: 'System', items: [
                                        { k: 'users', Icon: Users, label: 'Admin Users', kw: 'volunteer roles permissions rbac password' },
                                        { k: 'branding', Icon: Palette, label: 'Branding & SEO', kw: 'logo colours name wordmark meta' },
                                    ] },
                                ];
                                const btn = (it: any) => (
                                    <button key={it.k} onClick={() => setSettingsSubTab(it.k as typeof settingsSubTab)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition ${settingsSubTab === it.k ? 'bg-orange-100 text-orange-700' : 'text-neutral-600 hover:bg-neutral-200'}`}><it.Icon className="w-4 h-4 flex-shrink-0" /> {it.label}</button>
                                );
                                const match = (it: any) => (!it.gate || can(it.gate)) && (!q || it.label.toLowerCase().includes(q) || (it.kw || '').includes(q));

                                if (q) {
                                    const hits = SECTIONS.flatMap((s) => s.items).filter(match);
                                    return hits.length ? <div className="space-y-1">{hits.map(btn)}</div>
                                        : <p className="px-3 py-4 text-sm text-neutral-400">No settings match “{settingsQuery}”.</p>;
                                }
                                return SECTIONS.map((section) => {
                                    const visible = section.items.filter(match);
                                    if (!visible.length) return null;
                                    return (
                                        <div key={section.group} className="pt-2 first:pt-0 space-y-1">
                                            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{section.group}</p>
                                            {visible.map(btn)}
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        <div className="flex-1 p-6 lg:p-8 bg-white overflow-y-auto">
                            {settingsSubTab === 'events' && (
                                <div className="max-w-3xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b border-neutral-200 pb-4 text-neutral-900">Yearly Event Management</h2>
                                    <form onSubmit={handleCreateEvent} className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-8 space-y-4">
                                        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 mb-2">Create New Event</h3>
                                        {/* Config-driven: TranslatableField renders the English input plus one
                                            per non-English language in LANGUAGES (lib/i18n) — so Marathi (and any
                                            future language) appears here automatically, exactly as in the edit row. */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <TranslatableField label="Event Title" field="title" value={newEventTitle} onValue={setNewEventTitle} tr={newEventTr} onTr={setEventTr} placeholder="e.g. BaglaBhairav Mahotsav 2027" />
                                            <TranslatableField label="Venue" field="venue" value={newEventVenue} onValue={setNewEventVenue} tr={newEventTr} onTr={setEventTr} placeholder="e.g. Nashik, Maharashtra" />
                                        </div>
                                        <TranslatableField label="Short Description" field="short_description" value={newEventShort} onValue={setNewEventShort} tr={newEventTr} onTr={setEventTr} multiline rows={2} />
                                        <TranslatableField label="Long Description" field="long_description" value={newEventLong} onValue={setNewEventLong} tr={newEventTr} onTr={setEventTr} multiline rows={4} />
                                        <TranslatableField label="Event Date / Duration" field="date_time" value={newEventDate} onValue={setNewEventDate} tr={newEventTr} onTr={setEventTr} placeholder="e.g. March 15-17, 2027" />
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
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Link to Event</label>
                                            <select value={newCatEventId} onChange={(e) => setNewCatEventId(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm bg-white cursor-pointer">
                                                <option value="">— Select event —</option>
                                                {eventsList.map(ev => (
                                                    <option key={ev.id} value={ev.id}>{ev.title}{ev.is_active ? ' ✓ (Active)' : ''}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-neutral-400 mt-1">Only tiers linked to the active event appear on the home page.</p>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Tier Title</label>
                                                <input type="text" placeholder="e.g. VIP Pass" value={newCatTitle} onChange={(e) => setNewCatTitle(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Status Type</label>
                                                <select
                                                    value={newCatIsEnquiry ? 'enquiry' : (newCatAllowEnquiry ? 'paid_enquire' : 'paid')}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setNewCatIsEnquiry(v === 'enquiry');
                                                        setNewCatAllowEnquiry(v === 'paid_enquire');
                                                    }}
                                                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm bg-white cursor-pointer"
                                                >
                                                    <option value="paid">Standard Paid</option>
                                                    <option value="paid_enquire">Paid + Enquire Now</option>
                                                    <option value="enquiry">Enquiry Only</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">Price / Fee (₹)</label>
                                                <input type="number" placeholder="5000" value={newCatPrice} onChange={(e) => setNewCatPrice(e.target.value)} className="w-full md:w-32 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm" required={!newCatIsEnquiry} />
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
                                    {/* Group categories by event */}
                                    <div className="space-y-8">
                                        {eventsList.map(ev => {
                                            const evCats = categoriesList.filter(c => c.event_id === ev.id);
                                            if (!evCats.length) return null;
                                            return (
                                                <div key={ev.id}>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <h3 className="text-sm font-bold text-neutral-700">{ev.title}</h3>
                                                        {ev.is_active && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {evCats.map(cat => (
                                                            <CategoryRow key={cat.id} category={cat} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {categoriesList.filter(c => !c.event_id).length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-bold text-neutral-400 mb-3">Unassigned (no event linked)</h3>
                                                <div className="space-y-4">
                                                    {categoriesList.filter(c => !c.event_id).map(cat => (
                                                        <CategoryRow key={cat.id} category={cat} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'media' && (
                                <div className="max-w-4xl">
                                    <h2 className="text-2xl font-bold mb-6 border-b border-neutral-200 pb-4 text-neutral-900">Gallery & Video Injector</h2>
                                    <form onSubmit={handleAddMedia} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50 p-6 border border-neutral-200 rounded-xl mb-8">
                                        <div className="md:col-span-2"><label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">Asset URL</label>
                                            <div className="flex gap-2">
                                                <input type="url" placeholder="https://... or upload →" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600" required />
                                                {mediaType === 'image' && <MediaPicker onSelected={(url) => setMediaUrl(url)} label="Upload" />}
                                            </div>
                                        </div>
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
                                                        {media.media_type === 'image'
                                                            ? <img src={media.url} alt="media" className="w-full h-full object-cover" />
                                                            : youtubeThumbnail(media.url)
                                                                ? <><img src={youtubeThumbnail(media.url)!} alt="video" className="w-full h-full object-cover" /><Video className="w-5 h-5 text-white absolute drop-shadow" /></>
                                                                : <Video className="w-6 h-6 text-neutral-400" />}
                                                    </div>
                                                    <div className="flex-1"><p className="text-sm font-bold text-neutral-900">{media.caption || 'Untitled Asset'}</p><div className="flex items-center gap-2 mt-1.5"><span className="uppercase tracking-wider font-bold text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">{media.media_type}</span><span className="text-xs text-neutral-500">Linked to: {media.events?.title || 'Unknown Event'}</span></div></div>
                                                </div>
                                                <button onClick={() => handleDeleteMedia(media.id)} className="text-neutral-400 hover:text-red-600 p-2 border border-transparent hover:border-red-200 rounded-lg bg-neutral-50 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'checkpoints' && (
                                <div className="max-w-2xl">
                                    <h2 className="text-2xl font-bold mb-2 border-b border-neutral-200 pb-4 text-neutral-900">Entry Checkpoints</h2>
                                    <p className="text-sm text-neutral-500 mb-6">Create one checkpoint per scan station (e.g. Main Entry, Lunch Day 1). Volunteers pick their station when they open the scanner page.</p>
                                    <form onSubmit={handleCreateCheckpoint} className="flex gap-3 mb-8">
                                        <input
                                            type="text"
                                            placeholder="e.g. Main Entry, Lunch Day 1"
                                            value={newCpName}
                                            onChange={e => setNewCpName(e.target.value)}
                                            className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-orange-600 text-sm"
                                            required
                                        />
                                        <button type="submit" disabled={saving || !newCpName.trim()} className="flex items-center gap-2 bg-neutral-900 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition">
                                            <Plus className="w-4 h-4" /> Add
                                        </button>
                                    </form>
                                    {checkpointsList.length === 0 ? (
                                        <p className="text-neutral-400 text-sm text-center py-8">No checkpoints yet. Add your first one above.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {checkpointsList.map(cp => (
                                                <div key={cp.id} className={`flex items-center justify-between p-4 border rounded-xl transition ${cp.is_active ? 'border-neutral-200 bg-white' : 'border-neutral-100 bg-neutral-50 opacity-60'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cp.is_active ? 'bg-green-500' : 'bg-neutral-300'}`} />
                                                        <span className="font-semibold text-neutral-900">{cp.name}</span>
                                                        {!cp.is_active && <span className="text-xs text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5">Inactive</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleCheckpoint(cp.id, !cp.is_active)}
                                                            disabled={saving}
                                                            className="text-xs font-semibold px-3 py-1.5 border border-neutral-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition disabled:opacity-40"
                                                        >
                                                            {cp.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCheckpoint(cp.id, cp.name)}
                                                            disabled={saving}
                                                            className="p-2 text-neutral-400 hover:text-red-600 border border-transparent hover:border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-40"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Gate operations: which wristband colour each Seva gets. */}
                                    <EntryBandsManager categories={categoriesList} />
                                </div>
                            )}

                            {settingsSubTab === 'formfields' && <FormFieldsManager categories={categoriesList} />}

                            {settingsSubTab === 'homecontent' && <HomeContentManager events={eventsList} />}
                            {settingsSubTab === 'contactsocial' && <ContactSocialManager />}
                            {settingsSubTab === 'contactmessages' && <ContactMessagesManager />}
                            {settingsSubTab === 'declaration' && <DeclarationManager />}
                            {settingsSubTab === 'consents' && <ConsentsManager />}
                            {settingsSubTab === 'payment' && <PaymentSettingsManager />}
                            {settingsSubTab === 'users' && <AdminUsersManager />}
                            {settingsSubTab === 'waitlist' && <WaitlistManager />}
                            {settingsSubTab === 'library' && <MediaLibraryManager />}
                            {settingsSubTab === 'branding' && <BrandingManager />}
                            {settingsSubTab === 'pageheaders' && <PageHeadersManager />}
                            {settingsSubTab === 'templates' && <TemplatesConfigManager />}
                            {settingsSubTab === 'donations' && <DonationsManager />}
                            {settingsSubTab === 'sevacategories' && <SevaCategoriesManager />}
                            {settingsSubTab === 'sponsors' && <SponsorsManager events={eventsList} />}
                            {settingsSubTab === 'messages' && can('audit:view') && <MessageLogPanel />}
                            {settingsSubTab === 'feedback' && <FeedbackManager />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
