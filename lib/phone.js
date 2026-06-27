// lib/phone.js
// Canonical phone formatting. We store every phone as E.164 with the Indian
// country code (e.g. +919876543210) so the same person is one identity across
// registrations and sites. Returns null for anything that isn't a valid
// 10-digit Indian mobile (after stripping +91 / 0 / spaces).
export function normalizePhone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (!/^[6-9]\d{9}$/.test(d)) return null;
    return `+91${d}`;
}
