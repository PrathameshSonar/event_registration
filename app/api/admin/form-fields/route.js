// Admin: registration form field configuration.
//   GET    ?categoryId=<id>  → all catalog fields with this category's settings
//   POST                     → create a custom field in the catalog (global)
//   PATCH  {categoryId,fields}→ SAVE this category's visible/required/order (batch)
//   DELETE {id}              → delete a custom field from the catalog
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';
import { getCatalogForCategory } from '@/lib/formFieldsServer';
import { BUILTIN_FIELDS, BUILTIN_KEYS, CUSTOM_FIELD_TYPES } from '@/lib/formFields';

export const dynamic = 'force-dynamic';

// Ensure every built-in field exists in the catalog (insert any missing).
async function ensureBuiltins() {
    const { data: existing } = await supabaseAdmin.from('form_fields').select('field_key');
    const have = new Set((existing || []).map((r) => r.field_key));
    const toInsert = BUILTIN_FIELDS
        .filter((f) => !have.has(f.field_key))
        .map((f) => ({
            field_key: f.field_key, label: f.label, field_type: f.field_type,
            is_custom: false, is_core: f.is_core, is_visible: true,
            is_required: f.default_required, sort_order: f.sort_order,
        }));
    if (toInsert.length) await supabaseAdmin.from('form_fields').insert(toInsert);
}

export async function GET(request) {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    await ensureBuiltins();
    const categoryId = request.nextUrl.searchParams.get('categoryId');
    const fields = await getCatalogForCategory(supabaseAdmin, categoryId);
    return NextResponse.json({ fields });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { label, label_hi, translations, field_type, options } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: 'Label required.' }, { status: 400 });
    const type = CUSTOM_FIELD_TYPES.includes(field_type) ? field_type : 'text';

    const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
    const field_key = `custom_${slug || 'field'}_${Math.random().toString(36).slice(2, 7)}`;

    const { count } = await supabaseAdmin.from('form_fields').select('id', { count: 'exact', head: true });

    const row = {
        field_key,
        label: label.trim(),
        label_hi: label_hi?.trim() || null,
        field_type: type,
        options: type === 'select' && Array.isArray(options) ? options.filter(Boolean) : null,
        is_custom: true,
        is_core: false,
        is_visible: true,
        is_required: false,
        sort_order: (count || 0) + 1,
    };
    // Only include translations when non-empty, so the insert still works if the
    // translations column hasn't been migrated yet (see run_all.sql, section 9b).
    if (translations && typeof translations === 'object' && Object.keys(translations).length) {
        row.translations = translations;
    }
    const { data, error } = await supabaseAdmin.from('form_fields').insert(row).select().single();
    if (error) return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'form_field.create', entity: 'form_field', entityId: data?.id,
        summary: `Created custom field "${row.label}" (${type})`,
    });
    return NextResponse.json({ field: data });
}

// Batch-save a category's field settings (the "Save Changes" button).
export async function PATCH(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { categoryId, fields } = await request.json();
    if (!categoryId) return NextResponse.json({ error: 'Missing category.' }, { status: 400 });
    if (!Array.isArray(fields)) return NextResponse.json({ error: 'No fields provided.' }, { status: 400 });

    const rows = fields
        .filter((f) => f.field_id)
        .map((f) => ({
            category_id: categoryId,
            field_id: f.field_id,
            is_visible: f.is_core ? true : !!f.is_visible,
            is_required: f.is_core ? true : !!f.is_required,
            sort_order: Number(f.sort_order) || 0,
        }));

    const { error } = await supabaseAdmin
        .from('category_field_settings')
        .upsert(rows, { onConflict: 'category_id,field_id' });
    if (error) {
        console.error('Field settings save error:', error.message);
        return NextResponse.json({ error: 'Save failed.' }, { status: 500 });
    }
    await logAudit({
        session, request,
        action: 'form_field.update', entity: 'form_field', entityId: categoryId,
        summary: `Saved form-field settings for a tier (${rows.length} field(s))`,
        metadata: { categoryId, count: rows.length },
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from('form_fields').select('field_key, is_custom').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Field not found.' }, { status: 404 });
    if (!existing.is_custom || BUILTIN_KEYS.has(existing.field_key)) {
        return NextResponse.json({ error: 'Built-in fields cannot be deleted — hide them instead.' }, { status: 400 });
    }
    // category_field_settings rows cascade-delete via FK.
    const { error } = await supabaseAdmin.from('form_fields').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    await logAudit({
        session, request,
        action: 'form_field.delete', entity: 'form_field', entityId: id,
        summary: `Deleted custom field "${existing.field_key}"`,
    });
    return NextResponse.json({ ok: true });
}
