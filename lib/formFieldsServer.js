// lib/formFieldsServer.js  (server-only)
// Resolves the registration-form fields FOR A SPECIFIC CATEGORY by merging the
// global field catalog (form_fields) with the category's settings
// (category_field_settings). Used by the public form-fields endpoint, the admin
// configurator, and the payment/enquiry routes for server-side validation.
import { BUILTIN_FIELDS, SALUTATION_OPTS, GENDER_OPTS } from './formFields';

const BUILTIN_BY_KEY = Object.fromEntries(BUILTIN_FIELDS.map((f) => [f.field_key, f]));

function optsFor(fieldKey, custom, customOptions) {
    if (custom) return Array.isArray(customOptions) ? customOptions : null;
    if (fieldKey === 'salutation') return SALUTATION_OPTS;
    if (fieldKey === 'gender') return GENDER_OPTS;
    return null;
}

// All catalog fields with the category's resolved visible/required/order
// (includes hidden fields — the admin UI needs them to toggle). Ordered.
export async function getCatalogForCategory(supabaseAdmin, categoryId) {
    let catalog = [];
    try {
        const { data } = await supabaseAdmin.from('form_fields').select('*');
        if (data) catalog = data;
    } catch {
        // form_fields table may not exist yet.
    }

    // No catalog at all → fall back to the code-defined built-ins.
    if (!catalog.length) {
        return BUILTIN_FIELDS.map((f) => ({
            id: null,
            field_key: f.field_key,
            field_type: f.field_type,
            is_custom: false,
            is_core: f.is_core,
            is_visible: true,
            is_required: f.default_required,
            sort_order: f.sort_order,
            label: f.label,
            label_hi: null,
            options: optsFor(f.field_key, false),
        }));
    }

    let settings = [];
    if (categoryId) {
        try {
            const { data } = await supabaseAdmin
                .from('category_field_settings')
                .select('*')
                .eq('category_id', categoryId);
            if (data) settings = data;
        } catch {
            // category_field_settings table may not exist yet.
        }
    }
    const setByField = {};
    settings.forEach((s) => { setByField[s.field_id] = s; });

    const out = catalog.map((f) => {
        const core = !!f.is_core;
        const s = setByField[f.id];
        // Built-ins default visible; custom fields are opt-in per category.
        const defVisible = core ? true : !f.is_custom;
        const defRequired = f.is_custom ? false : (BUILTIN_BY_KEY[f.field_key]?.default_required ?? false);
        return {
            id: f.id,
            field_key: f.field_key,
            field_type: f.field_type,
            is_custom: !!f.is_custom,
            is_core: core,
            is_visible: core ? true : (s ? s.is_visible : defVisible),
            is_required: core ? true : (s ? s.is_required : defRequired),
            sort_order: s ? s.sort_order : (f.sort_order ?? 100),
            label: f.label,
            label_hi: f.label_hi || null,
            options: optsFor(f.field_key, f.is_custom, f.options),
        };
    });

    out.sort((a, b) => a.sort_order - b.sort_order);
    return out;
}

// Visible fields only — for the public form + validation.
export async function getActiveFields(supabaseAdmin, categoryId) {
    const all = await getCatalogForCategory(supabaseAdmin, categoryId);
    return all.filter((f) => f.is_visible);
}

// Validates required fields + sanitizes custom answers against a category's config.
export async function validateSubmission(supabaseAdmin, categoryId, attendee, customFieldsRaw) {
    const fields = await getActiveFields(supabaseAdmin, categoryId);
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
