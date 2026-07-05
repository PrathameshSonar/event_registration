// lib/escape.js
// HTML-escape a value before interpolating it into an HTML email template, so a
// user-supplied field (name, gotra, reference, admin note, etc.) can't inject
// markup or links into the email we send.
export function escapeHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
