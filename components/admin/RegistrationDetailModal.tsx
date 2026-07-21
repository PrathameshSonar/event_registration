// components/admin/RegistrationDetailModal.tsx
// Read-only detail view for one registration + its permitted actions. Presentational:
// all state + handlers are passed in from the admin dashboard. Extracted from page.tsx.
"use client";

import { X, Image as ImageIcon, RefreshCw, Check, Copy, Pencil, Mail, Undo2, Ban } from 'lucide-react';
import RegistrationActivity from '@/components/RegistrationActivity';
import { STATUS_LABEL, statusClasses } from '@/app/admin/constants';
import type { Registration } from '@/app/admin/types';

interface Props {
    reg: Registration;
    onClose: () => void;
    can: (perm: string) => boolean;
    /** Cancel is admin-only — no volunteer permission grants it. */
    isAdmin: boolean;
    verifyingId: string | null;
    syncingId: string | null;
    managingId: string | null;
    copiedLink: boolean;
    onViewProof: (id: string) => void;
    onVerify: (reg: Registration, action: string) => void;
    onCopyLink: (url: string) => void;
    onSyncBalance: (id: string) => void;
    onEdit: (reg: Registration) => void;
    onResendConfirmation: (reg: Registration) => void;
    onRefund: (reg: Registration) => void;
    onCancel: (reg: Registration) => void;
}

// Already-ended registrations have nothing left to cancel. Mirrors NOT_CANCELLABLE
// in app/api/admin/cancel-registration/route.js — the server is the real guard.
const NOT_CANCELLABLE = ['cancelled', 'refunded', 'failed', 'closed'];

export default function RegistrationDetailModal({
    reg, onClose, can, isAdmin, verifyingId, syncingId, managingId, copiedLink,
    onViewProof, onVerify, onCopyLink, onSyncBalance, onEdit, onResendConfirmation, onRefund, onCancel,
}: Props) {
    const cancellable = isAdmin && !NOT_CANCELLABLE.includes(reg.payment_status);
    return (
        <div className="fixed inset-0 bg-neutral-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                    <h2 className="text-xl font-bold text-neutral-900">Registration Details</h2>
                    <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-600 transition rounded-full hover:bg-red-50"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 text-sm">
                    {reg.payment_status === 'cancelled' && (
                        <div className="bg-neutral-900 text-white p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-1"><Ban className="w-4 h-4" /><span className="text-xs uppercase tracking-wider font-bold">Cancelled{reg.cancelled_at ? ` on ${new Date(reg.cancelled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</span></div>
                            <p className="text-sm text-neutral-200">{reg.cancellation_reason || 'No reason recorded.'}</p>
                            {Number(reg.amount_paid || 0) > 0 && (
                                <p className="text-xs text-amber-300 mt-2">₹{Number(reg.amount_paid).toLocaleString('en-IN')} was paid and has <strong>not</strong> been refunded — cancelling never returns money.</p>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Profile Info</h3>
                            <p><span className="text-neutral-500 block text-xs">Name</span><span className="font-semibold">{reg.salutation} {reg.first_name} {reg.last_name}</span></p>
                            <p className="mt-3"><span className="text-neutral-500 block text-xs">Gotra</span><span className="font-semibold">{reg.gotra || 'Not provided'}</span></p>
                            <p className="mt-3"><span className="text-neutral-500 block text-xs">DOB / Gender</span><span>{reg.date_of_birth} ({reg.gender})</span></p>
                            <p className="mt-3"><span className="text-neutral-500 block text-xs">Total Attendees</span><span className="font-bold">{reg.attendees_count} Person(s)</span></p>
                            {reg.created_at && (
                                <p className="mt-3"><span className="text-neutral-500 block text-xs">Registered on</span><span className="font-semibold">{new Date(reg.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
                            )}
                            {Array.isArray(reg.attendees) && reg.attendees.length > 0 && (
                                <div className="mt-3"><span className="text-neutral-500 block text-xs mb-1">Attendee Names</span><ol className="list-decimal ml-4 text-sm text-neutral-800 space-y-0.5">{reg.attendees.map((a, i) => <li key={i}>{a.name}</li>)}</ol></div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Communications</h3>
                            <p><span className="text-neutral-500 block text-xs">Contact Info</span><span className="font-semibold block">{reg.phone}</span><span className="text-xs text-neutral-600">{reg.email}</span></p>
                            <p className="mt-3"><span className="text-neutral-500 block text-xs">Address</span><span>{reg.taluka}, {reg.state} - {reg.pincode}</span></p>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Payment</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
                                <p>
                                    <span className="text-neutral-500 block text-xs mb-1">Status</span>
                                    <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-xs font-semibold border ${statusClasses(reg.payment_status)}`}>{STATUS_LABEL[reg.payment_status]}</span>
                                </p>
                                <p><span className="text-neutral-500 block text-xs">Total</span><span className="font-bold">₹{reg.total_amount}</span></p>
                                {reg.payment_status === 'advance_paid' ? (
                                    <>
                                        <p><span className="text-neutral-500 block text-xs">Paid</span><span className="font-bold text-green-700">₹{reg.amount_paid}</span></p>
                                        <p><span className="text-neutral-500 block text-xs">Balance Due</span><span className="font-bold text-amber-700">₹{reg.amount_due}</span></p>
                                    </>
                                ) : reg.payment_status === 'amount_mismatch' ? (
                                    <p><span className="text-neutral-500 block text-xs">Recorded</span><span className="font-bold text-amber-700">₹{reg.amount_paid}</span><span className="block text-[11px] text-neutral-400">short of ₹{reg.total_amount}</span></p>
                                ) : (
                                    <p><span className="text-neutral-500 block text-xs">Plan</span><span className="font-semibold capitalize">{reg.payment_plan || 'full'}</span></p>
                                )}
                            </div>
                            {reg.razorpay_payment_id && (
                                <p className="mt-3"><span className="text-neutral-500 block text-xs">Payment Ref</span><span className="font-mono text-xs text-neutral-600 break-all">{reg.razorpay_payment_id}</span></p>
                            )}
                            {reg.payment_method && reg.payment_method !== 'razorpay' && (
                                <div className="mt-3 space-y-1">
                                    <p><span className="text-neutral-500 block text-xs">Payment Method</span><span className="font-semibold capitalize">{reg.payment_method.replace('_', ' ')}</span></p>
                                    {reg.offline_reference && <p><span className="text-neutral-500 block text-xs">Reference</span><span className="font-mono text-xs text-neutral-600 break-all">{reg.offline_reference}</span></p>}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {reg.offline_proof_path && (
                                            <button type="button" onClick={() => onViewProof(reg.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"><ImageIcon className="w-3.5 h-3.5" /> View proof</button>
                                        )}
                                        {can('payments:verify') && reg.payment_status === 'completed' && (
                                            <button type="button" onClick={() => onVerify(reg, 'reverse')} disabled={verifyingId === reg.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50"><X className="w-3.5 h-3.5" /> Reverse payment</button>
                                        )}
                                        {can('payments:verify') && reg.payment_status === 'amount_mismatch' && (
                                            <button type="button" onClick={() => onVerify(reg, 'approve')} disabled={verifyingId === reg.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 transition disabled:opacity-50">Reconcile amount</button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {reg.payment_status === 'advance_paid' && (
                                <div className="mt-2">
                                    {reg.balance_link_url && (
                                        <a href={reg.balance_link_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-orange-600 hover:underline break-all">Balance payment link →</a>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {reg.balance_link_url && (
                                            <button
                                                type="button"
                                                onClick={() => onCopyLink(reg.balance_link_url!)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                                                title="Copy balance payment link to clipboard"
                                            >
                                                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copiedLink ? 'Copied!' : 'Copy link'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onSyncBalance(reg.id)}
                                            disabled={syncingId === reg.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-green-300 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition disabled:opacity-50"
                                            title="Check Razorpay and mark as paid if the balance is cleared"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === reg.id ? 'animate-spin' : ''}`} />
                                            {syncingId === reg.id ? 'Syncing…' : 'Sync payment'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="col-span-1 md:col-span-2 bg-orange-50 border border-orange-100 p-4 rounded-xl">
                            <span className="text-xs uppercase tracking-wider font-bold text-orange-800 block mb-1">Issue/Samasya Provided</span>
                            <p className="text-neutral-900 whitespace-pre-wrap">{reg.problem_samasya || "None declared."}</p>
                        </div>
                        {reg.custom_fields && Object.keys(reg.custom_fields).length > 0 && (
                            <div className="col-span-1 md:col-span-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 border-b pb-1">Additional Fields</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(reg.custom_fields).map(([key, value]) => (
                                        <p key={key}><span className="text-neutral-500 block text-xs">{key.replace(/^custom_/, '').replace(/_[a-z0-9]{5}$/, '').replace(/_/g, ' ')}</span><span className="font-semibold">{value}</span></p>
                                    ))}
                                </div>
                            </div>
                        )}
                        <RegistrationActivity registrationId={reg.id} />
                    </div>
                </div>
                {(can('registrations:manage') || can('payments:refund') || cancellable) && (
                    <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap gap-2 justify-end">
                        {can('registrations:manage') && <button onClick={() => onEdit(reg)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition"><Pencil className="w-4 h-4" /> Edit details</button>}
                        {reg.payment_status === 'completed' && (
                            <>
                                {can('registrations:manage') && <button onClick={() => onResendConfirmation(reg)} disabled={managingId === reg.id} className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition disabled:opacity-50"><Mail className="w-4 h-4" /> Resend confirmation</button>}
                                {can('payments:refund') && <button onClick={() => onRefund(reg)} disabled={managingId === reg.id} className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 rounded-lg text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50"><Undo2 className="w-4 h-4" /> Refund</button>}
                            </>
                        )}
                        {cancellable && (
                            <button
                                onClick={() => onCancel(reg)}
                                disabled={managingId === reg.id}
                                title="Cancel this registration — releases the seat, voids the pass. Does not refund."
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-800 rounded-lg text-sm font-semibold text-white bg-neutral-800 hover:bg-black transition disabled:opacity-50"
                            >
                                <Ban className="w-4 h-4" /> Cancel registration
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
