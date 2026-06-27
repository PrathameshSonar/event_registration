// lib/formFieldsServer.js  (server-only)
// Resolves the active registration-form field list by merging code-defined
// built-ins with the admin's DB overrides. Used by the public form-fields
// endpoint AND by the payment/enquiry routes for server-side validation.
import { BUILTIN_FIELDS, SALUTATION_OPTS, GENDER_OPTS } from './formFields';

export async function getActiveFields(supabaseAdmin) {
    let rows = [];
    try {
        const { data, error } = await supabaseAdmin.from('form_fields').select('*');
        if (!error && data) rows = data;
    } catch {
        // Table may not exist yet — fall back to code defaults below.
    }
    const byKey = {};
    rows.forEach(r => { byKey[r.field_key] = r; });

    const out = [];

    // Built-ins: DB row overrides code defaults; core always visible+required.
    for (const f of BUILTIN_FIELDS) {
        const row = byKey[f.field_key];
        const visible = f.is_core ? true : (row ? row.is_visible : true);
        if (!visible) continue;
        const required = f.is_core ? true : (row ? row.is_required : f.default_required);
        out.push({
            field_key: f.field_key,
            field_type: f.field_type,
            is_custom: false,
            is_core: f.is_core,
            is_required: required,
            sort_order: row ? row.sort_order : f.sort_order,
            label: f.label,
            label_hi: null,
            options: f.field_key === 'salutation' ? SALUTATION_OPTS
                : f.field_key === 'gender' ? GENDER_OPTS
                : null,
        });
    }

    // Custom fields (visible only)
    for (const r of rows) {
        if (r.is_custom && r.is_visible) {
            out.push({
                field_key: r.field_key,
                field_type: r.field_type || 'text',
                is_custom: true,
                is_core: false,
                is_required: !!r.is_required,
                sort_order: r.sort_order || 0,
                label: r.label,
                label_hi: r.label_hi || null,
                options: Array.isArray(r.options) ? r.options : null,
            });
        }
    }

    out.sort((a, b) => a.sort_order - b.sort_order);
    return out;
}

// Validates + sanitizes submitted values against the active field config.
// Returns { error } on the first missing required field, else { customFields }.
export async function validateSubmission(supabaseAdmin, attendee, customFieldsRaw) {
    const fields = await getActiveFields(supabaseAdmin);
    const raw = (customFieldsRaw && typeof customFieldsRaw === 'object') ? customFieldsRaw : {};
    const clean = {};

    for (const f of fields) {
        if (f.is_custom) {
            let v = raw[f.field_key];
            if (v != null) v = String(v).replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
            if (f.is_required && (!v || v === '')) return { error: `Missing required field: ${f.label}.` };
            if (v) clean[f.field_key] = v;
        } else if (f.is_required) {
            const v = attendee?.[f.field_key];
            if (!v || String(v).trim() === '') return { error: `Missing required field: ${f.label}.` };
        }
    }
    return { customFields: clean };
}
