// app/admin/constants.ts
// Shared admin constants + helpers (extracted from page.tsx).
import type { PaymentStatus } from './types';

// Money-terminal states are locked: they cannot be edited from the dashboard.
export const TERMINAL_STATUSES: PaymentStatus[] = ['completed', 'failed', 'refunded', 'amount_mismatch', 'advance_paid', 'awaiting_payment', 'payment_review', 'cheque_received'];

export const STATUS_LABEL: Record<PaymentStatus, string> = {
    completed: '✔ Paid', enquired: '💬 Enquired', contacted: '📞 Contacted',
    pending: '⏳ Pending', failed: '✖ Failed', refunded: '⏪ Refunded', amount_mismatch: '⚠ Amount Mismatch',
    advance_paid: '◐ Advance Paid', awaiting_payment: '⌛ Payment Link Sent', closed: '⊘ Closed/Lost',
    payment_review: '🔎 To Verify', cheque_received: '🧾 Cheque Pending', payment_rejected: '⛔ Rejected',
};

// Short labels for the payment mode shown on each row (online rows have no
// payment_method stored, so null/'razorpay' → Online).
export const PAYMENT_MODE_LABEL: Record<string, string> = {
    razorpay: 'Online', bank_transfer: 'Bank Transfer', cheque: 'Cheque', cash: 'Cash', dd: 'Demand Draft',
};

// Enquiry-pipeline statuses live in the separate Enquiries tab, not the ledger.
export const ENQUIRY_STATUSES = ['enquired', 'contacted', 'awaiting_payment', 'closed'];

// Section tabs for the registrations ledger. Each tab is a saved view over a
// single payment status (plus a "Master List" showing everything). Keeping the
// key === statusFilter value means these map cleanly onto RBAC section access.
export const REGISTRATION_SECTIONS: { key: string; label: string }[] = [
    { key: 'all', label: 'Master List' },
    { key: 'payment_review', label: '🔎 To Verify' },
    { key: 'cheque_received', label: '🧾 Cheque Pending' },
    { key: 'advance_paid', label: '◐ Advance Paid' },
    { key: 'completed', label: '✔ Paid' },
    { key: 'pending', label: '⏳ Pending' },
    { key: 'amount_mismatch', label: '⚠ Amount Mismatch' },
    { key: 'payment_rejected', label: '⛔ Rejected' },
    { key: 'failed', label: '✖ Failed' },
    { key: 'refunded', label: '⏪ Refunded' },
];

export function statusClasses(status: PaymentStatus) {
    switch (status) {
        case 'completed': return 'bg-green-100 text-green-700 border-green-200';
        case 'enquired': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'contacted': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'failed': return 'bg-red-100 text-red-700 border-red-200';
        case 'amount_mismatch': return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'advance_paid': return 'bg-amber-100 text-amber-800 border-amber-300';
        case 'awaiting_payment': return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'closed': return 'bg-neutral-200 text-neutral-500 border-neutral-300';
        case 'payment_review': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'cheque_received': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        case 'payment_rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
        default: return 'bg-neutral-200 text-neutral-700 border-neutral-300';
    }
}
