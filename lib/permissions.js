// lib/permissions.js
// Shared RBAC catalog + helpers (used by both server and client).
//
// Roles:
//   'admin'     → full access to everything (implicit ALL permissions).
//   'volunteer' → exactly the permissions an admin grants via checkboxes.
//
// Admin always bypasses permission checks.

// The assignable permissions shown as checkboxes when creating a volunteer.
export const PERMISSIONS = [
    { key: 'dashboard:view',       label: 'View dashboard',                     group: 'General' },
    { key: 'registrations:view',   label: 'View registrations',                 group: 'Registrations' },
    { key: 'registrations:manage', label: 'Add / edit registrations & status',  group: 'Registrations' },
    { key: 'qr:send',              label: 'Send QR entry passes',               group: 'Registrations' },
    { key: 'export:data',          label: 'Export data & receipts',             group: 'Registrations' },
    { key: 'payments:verify',      label: 'Verify offline payments',            group: 'Payments' },
    { key: 'payments:refund',      label: 'Refund / reverse payments',          group: 'Payments' },
    { key: 'reminders:send',       label: 'Send payment reminders',             group: 'Payments' },
    { key: 'enquiries:manage',     label: 'Manage enquiry pipeline',            group: 'Enquiries' },
    // Gate operations. 'checkin:scan' is what opens /scan and records an entry —
    // deliberately separate from 'scanlog:view' (reading who came) so a gate
    // volunteer can scan without being handed the whole attendance log, and a
    // back-office volunteer can read the log without being able to admit people.
    { key: 'checkin:scan',         label: 'Scan entry passes at the gate',      group: 'Entry' },
    { key: 'scanlog:view',         label: 'View scan log',                      group: 'Entry' },
    { key: 'audit:view',           label: 'View audit log',                     group: 'General' },
    { key: 'settings:manage',      label: 'Manage event settings & content',    group: 'Settings' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Acting on registrations implies being able to see them — auto-granted so an
// admin doesn't have to remember to also tick "View registrations".
const IMPLIES_REGISTRATIONS_VIEW = ['registrations:manage', 'qr:send', 'payments:verify', 'payments:refund', 'reminders:send', 'export:data'];

// Expand a raw permission array with implied permissions and drop unknown keys.
export function expandPermissions(perms) {
    const set = new Set((Array.isArray(perms) ? perms : []).filter((p) => PERMISSION_KEYS.includes(p)));
    if (IMPLIES_REGISTRATIONS_VIEW.some((p) => set.has(p))) set.add('registrations:view');
    if (set.has('enquiries:manage')) set.add('registrations:view');
    return [...set];
}

// The effective permission list for a session, by role.
export function effectivePermissions(role, perms) {
    if (role === 'admin') return [...PERMISSION_KEYS];
    return expandPermissions(perms); // volunteer
}

// Does this session hold a permission? Admin always does.
export function hasPermission(session, key) {
    if (!session) return false;
    if (session.role === 'admin') return true;
    return Array.isArray(session.permissions) && session.permissions.includes(key);
}
