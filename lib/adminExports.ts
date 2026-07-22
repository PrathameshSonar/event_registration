// lib/adminExports.ts
// Client-side export builders for the admin registrations ledger (CSV, Excel,
// combined receipts PDF, financial statement). Pure functions of the row set —
// extracted from app/admin/page.tsx. Browser APIs (Blob/URL/window) are only
// touched inside the functions, so this stays a plain module.
import type { Registration } from '@/app/admin/types';
import { STATUS_LABEL, PAYMENT_MODE_LABEL } from '@/app/admin/constants';
import { toast } from '@/lib/uiStore';

// Export filenames carry the brand, so they follow Settings -> Branding & SEO
// too. Kept as a PARAMETER rather than a settings read: this module is pure and
// runs in the browser, and the caller (the admin page) already has branding.
const fileSlug = (name: string) => (String(name || '').replace(/[^A-Za-z0-9]+/g, '') || 'Site');

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const today = () => new Date().toISOString().split('T')[0];

function download(blob: Blob, filename: string) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Stable receipt number from the created date + short id.
export const invoiceNo = (reg: Registration) =>
    `RCPT-${new Date(reg.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${reg.id.split('-')[0].toUpperCase()}`;

export function downloadRegistrationsCsv(rows: Registration[], siteName: string) {
    const headers = ["Date", "Status", "Title", "First Name", "Last Name", "Gotra", "Gender", "DOB", "Phone", "Email", "Pincode", "Taluka", "State", "Category", "Attendees", "Donation", "Total Paid", "Issue/Samasya", "Razorpay ID"];
    const csvData = rows.map(reg => [
        new Date(reg.created_at).toLocaleDateString(), reg.payment_status.toUpperCase(), reg.salutation || '', reg.first_name || '', reg.last_name || '', reg.gotra || '', reg.gender || '', reg.date_of_birth || '', reg.phone || '', reg.email || '', reg.pincode || '', reg.taluka || '', reg.state || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, `"${(reg.problem_samasya || '').replace(/"/g, '""')}"`, reg.razorpay_payment_id || 'N/A'
    ]);
    const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
    download(new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' }), `${fileSlug(siteName)}_Registrations_${today()}.csv`);
}

// Excel export — a real .xls (Excel-native HTML table), no extra dependency.
export function downloadRegistrationsExcel(rows: Registration[], siteName: string) {
    const headers = ["Date", "Status", "Title", "First Name", "Last Name", "Gotra", "Gender", "DOB", "Phone", "Email", "Pincode", "Taluka", "State", "Category", "Attendees", "Donation", "Total", "Payment Mode", "Reference", "Issue/Samasya", "Razorpay ID"];
    const data = rows.map(reg => [
        new Date(reg.created_at).toLocaleString('en-IN'), STATUS_LABEL[reg.payment_status], reg.salutation || '', reg.first_name || '', reg.last_name || '', reg.gotra || '', reg.gender || '', reg.date_of_birth || '', reg.phone || '', reg.email || '', reg.pincode || '', reg.taluka || '', reg.state || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, PAYMENT_MODE_LABEL[reg.payment_method || 'razorpay'] || 'Online', reg.offline_reference || '', reg.problem_samasya || '', reg.razorpay_payment_id || '',
    ]);
    const table = `<table border="1"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${data.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${table}</body></html>`;
    download(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' }), `${fileSlug(siteName)}_Registrations_${today()}.xls`);
}

// Combined receipts (PDF) — a print-friendly window of all PAID rows (one per page).
export function printReceiptsPdf(rows: Registration[], eventTitle: string, siteName: string) {
    const paid = rows.filter(r => r.payment_status === 'completed');
    if (paid.length === 0) { toast.error('No paid registrations in the current filter.'); return; }
    const row = (l: string, v: string) => `<tr><td style="padding:6px 0;color:#6b7280;">${l}</td><td style="padding:6px 0;font-weight:700;color:#111827;text-align:right;">${v}</td></tr>`;
    const receipts = paid.map(reg => {
        const mode = PAYMENT_MODE_LABEL[reg.payment_method || 'razorpay'] || 'Online';
        const ref = reg.razorpay_payment_id || reg.offline_reference || '';
        return `<div class="rcpt">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #171717;padding-bottom:12px;margin-bottom:16px;">
                <div><div style="font-size:22px;font-weight:800;">${esc(siteName)}</div><div style="font-size:12px;color:#6b7280;">${esc(eventTitle)}</div></div>
                <div style="text-align:right;"><div style="font-size:11px;letter-spacing:.08em;color:#6b7280;text-transform:uppercase;">Payment Receipt</div><div style="font-size:13px;font-weight:700;color:#ea580c;">${invoiceNo(reg)}</div><div style="font-size:11px;color:#9ca3af;">${new Date(reg.created_at).toLocaleDateString('en-IN')}</div></div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                ${row('Name', esc([reg.salutation, reg.first_name, reg.last_name].filter(Boolean).join(' ')))}
                ${row('Phone', esc(reg.phone))}
                ${row('Email', esc(reg.email))}
                ${reg.gotra ? row('Gotra', esc(reg.gotra)) : ''}
                ${row('Category', esc(reg.categories?.title || '—'))}
                ${row('Attendees', `${reg.attendees_count || 1}`)}
                ${row('Payment Mode', esc(mode))}
                ${ref ? row('Reference', esc(ref)) : ''}
                <tr><td style="padding:12px 0 0;border-top:1px solid #e5e7eb;font-weight:700;">Amount Paid</td><td style="padding:12px 0 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:800;color:#16a34a;font-size:18px;">₹${Number(reg.total_amount || 0).toLocaleString('en-IN')}</td></tr>
            </table>
            <div style="margin-top:14px;font-size:11px;color:#9ca3af;">This is a computer-generated payment receipt. No-refund registration.</div>
        </div>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipts</title><style>
        @page{margin:16mm} body{font-family:Arial,sans-serif;color:#111827;margin:0;}
        .rcpt{page-break-after:always;padding:8px;} .rcpt:last-child{page-break-after:auto;}
    </style></head><body>${receipts}</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast.error('Allow pop-ups to generate the receipts PDF.'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
}

// Financial statement (Excel) — PAID rows only, financial columns + total.
export function downloadFinancialStatement(rows: Registration[], siteName: string) {
    const paid = rows.filter(r => r.payment_status === 'completed');
    if (paid.length === 0) { toast.error('No paid registrations in the current filter.'); return; }
    const headers = ['Receipt No', 'Date', 'Name', 'Phone', 'Email', 'Category', 'Attendees', 'Donation', 'Amount', 'Payment Mode', 'Reference'];
    const data = paid.map(reg => [
        invoiceNo(reg), new Date(reg.created_at).toLocaleDateString('en-IN'), `${reg.salutation || ''} ${reg.first_name} ${reg.last_name}`.trim(), reg.phone || '', reg.email || '', reg.categories?.title || 'Deleted Tier', reg.attendees_count || 1, reg.donation_amount || 0, reg.total_amount || 0, PAYMENT_MODE_LABEL[reg.payment_method || 'razorpay'] || 'Online', reg.razorpay_payment_id || reg.offline_reference || '',
    ]);
    const total = paid.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const body = data.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    const totalRow = `<tr><td colspan="8" style="font-weight:bold;text-align:right;">Total</td><td style="font-weight:bold;">${total}</td><td></td><td></td></tr>`;
    const table = `<table border="1"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}${totalRow}</tbody></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h3>${esc(siteName)} — Financial Statement</h3>${table}</body></html>`;
    download(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' }), `${fileSlug(siteName)}_Financial_${today()}.xls`);
}
