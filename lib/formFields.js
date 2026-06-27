// lib/formFields.js
// Pure metadata for the built-in registration fields (no DB / no React).
// Safe to import from both client and server.
//
// Built-in fields map to real columns on `registrations`. Admin can toggle
// visible/required and reorder them, but cannot delete them. Core fields
// (name/email/phone) are always visible and required because payment,
// ticket email, and the QR entry pass all depend on them.

export const SALUTATION_OPTS = ['Shri', 'Smt', 'Kumari', 'Mr', 'Ms', 'Dr'];
export const GENDER_OPTS = ['Male', 'Female', 'Other'];

export const BUILTIN_FIELDS = [
    { field_key: 'salutation', label: 'Title',             field_type: 'select',   tKey: 'form_title',      is_core: false, default_required: true, sort_order: 0 },
    { field_key: 'firstName',  label: 'First Name',        field_type: 'text',     tKey: 'form_first_name', is_core: true,  default_required: true, sort_order: 1 },
    { field_key: 'lastName',   label: 'Last Name',         field_type: 'text',     tKey: 'form_last_name',  is_core: true,  default_required: true, sort_order: 2 },
    { field_key: 'gotra',      label: 'Gotra',             field_type: 'text',     tKey: 'form_gotra',      is_core: false, default_required: true, sort_order: 3 },
    { field_key: 'gender',     label: 'Gender',            field_type: 'select',   tKey: 'form_gender',     is_core: false, default_required: true, sort_order: 4 },
    { field_key: 'dob',        label: 'Date of Birth',     field_type: 'date',     tKey: 'form_dob',        is_core: false, default_required: true, sort_order: 5 },
    { field_key: 'phone',      label: 'WhatsApp Number',   field_type: 'tel',      tKey: 'form_whatsapp',   is_core: true,  default_required: true, sort_order: 6 },
    { field_key: 'email',      label: 'Email',             field_type: 'email',    tKey: 'form_email',      is_core: true,  default_required: true, sort_order: 7 },
    { field_key: 'pincode',    label: 'Pincode',           field_type: 'text',     tKey: 'form_pincode',    is_core: false, default_required: true, sort_order: 8 },
    { field_key: 'problem',    label: 'Problem / Samasya', field_type: 'textarea', tKey: 'form_problem',    is_core: false, default_required: true, sort_order: 9 },
];

export const BUILTIN_KEYS = new Set(BUILTIN_FIELDS.map(f => f.field_key));
export const CORE_KEYS = new Set(BUILTIN_FIELDS.filter(f => f.is_core).map(f => f.field_key));
export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea'];
