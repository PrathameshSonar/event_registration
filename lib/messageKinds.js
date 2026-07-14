// lib/messageKinds.js
// CLIENT + SERVER SAFE. The catalog of outbound message types.
//
// Deliberately kept OUT of lib/messageLog.js: that module imports the
// service-role Supabase client, so a client component importing a constant from
// it would drag SUPABASE_SERVICE_ROLE_KEY into the browser bundle. Same split as
// lib/formFields.js (safe) vs lib/formFieldsServer.js (server-only).
//
// An unknown/absent kind still logs (as null) — the log is never gated on this
// list being complete. This exists for labels and the admin filter dropdown.
export const MESSAGE_KINDS = {
    ticket: 'Ticket confirmation',
    qr: 'QR entry pass',
    balance_link: 'Balance payment link',
    balance_reminder: 'Balance reminder (re-send)',
    payment_link: 'Payment link (enquiry)',
    cancellation: 'Cancellation notice',
    offline_submitted: 'Offline payment received',
    offline_rejected: 'Offline payment rejected',
    waitlist: 'Waitlist — seat open',
    broadcast: 'Broadcast announcement',
    feedback: 'Thank-you / feedback request',
    donation_receipt: 'Donation receipt',
    self_service: 'Find my registration',
};
