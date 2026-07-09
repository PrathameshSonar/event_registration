// lib/attendees.js
// Sanitize the group-attendee list into a clean [{ name }] array (or null).
// Strips HTML, trims, caps name length + list size. Shared by the online +
// offline registration routes.
export function sanitizeAttendees(input, maxCount = 20) {
    if (!Array.isArray(input)) return null;
    const out = input
        .map((a) => {
            const raw = a && typeof a === 'object' ? a.name : a;
            const name = String(raw || '').replace(/<[^>]*>/g, '').trim().slice(0, 80);
            return name ? { name } : null;
        })
        .filter(Boolean)
        .slice(0, Math.max(1, maxCount));
    return out.length ? out : null;
}
