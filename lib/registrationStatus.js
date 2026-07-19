// lib/registrationStatus.js
// CLIENT + SERVER SAFE (no Supabase import). Whether public registration is
// currently open for an event.
//
// Registration closes when EITHER:
//   • the admin flips the master switch off (events.registration_open = false), OR
//   • the event has ended — end_at is in the past (auto-close after completion).
//
// A missing/empty event is treated as OPEN so a lookup failure never silently
// blocks sign-ups; the create routes still do their own category checks.
export function isRegistrationOpen(event) {
    if (!event) return true;
    if (event.registration_open === false) return false;
    if (event.end_at) {
        const end = new Date(event.end_at).getTime();
        if (Number.isFinite(end) && end < Date.now()) return false;
    }
    return true;
}

// Why it's closed — for choosing the public message. null = open.
export function registrationClosedReason(event) {
    if (!event) return null;
    if (event.registration_open === false) return 'closed';
    if (event.end_at) {
        const end = new Date(event.end_at).getTime();
        if (Number.isFinite(end) && end < Date.now()) return 'ended';
    }
    return null;
}
