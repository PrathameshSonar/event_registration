// lib/age.js
// Per-category age restriction (min/max) computed from the attendee's DOB.
// Pure JS — safe to import on both the client (CheckoutForm) and the server
// (payment / enquiry / offline routes) so the rule can't diverge.

// Whole years old as of today, or null for an invalid/empty DOB.
export function computeAge(dobStr) {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
}

// Returns an error string if the DOB fails the category's age limits, else null.
// A category with no min_age and no max_age is open to all (never errors).
export function ageError(category, dobStr) {
    const min = Number(category?.min_age) || 0;
    const max = Number(category?.max_age) || 0;
    if (!min && !max) return null; // open to all ages

    const age = computeAge(dobStr);
    if (age == null) return 'Please enter a valid date of birth for this tier.';
    if (min && age < min) {
        return max ? `This tier is for ages ${min}–${max} only.` : `This tier is for ages ${min} and above.`;
    }
    if (max && age > max) {
        return min ? `This tier is for ages ${min}–${max} only.` : `This tier is for ages ${max} and below.`;
    }
    return null;
}

// Short human label for the restriction, or null if open to all.
export function ageLimitLabel(category) {
    const min = Number(category?.min_age) || 0;
    const max = Number(category?.max_age) || 0;
    if (min && max) return `Ages ${min}–${max}`;
    if (min) return `Ages ${min}+`;
    if (max) return `Up to age ${max}`;
    return null;
}
