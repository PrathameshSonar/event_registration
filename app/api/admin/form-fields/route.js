// Admin CRUD for registration form fields.
// GET also self-seeds the built-in field rows on first access.
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { BUILTIN_FIELDS, BUILTIN_KEYS, CUSTOM_FIELD_TYPES } from '@/lib/formFields';

export const dynamic = 'force-dynamic';

// Ensure every built-in field has a row (insert any missing with defaults).
async function ensureBuiltins() {
    const { data: existing } = await supabaseAdmin.from('form_fields').select('field_key');
    const have = new Set((existing || []).map(r => r.field_key));
    const toInsert = BUILTIN_FIELDS
        .filter(f => !have.has(f.field_key))
        .map(f => ({
            field_key: f.field_key, label: f.label, field_type: f.field_type,
            is_custom: false, is_core: f.is_core, is_visible: true,
            is_required: f.default_required, sort_order: f.sort_order,
        }));
    if (toInsert.length) await supabaseAdmin.from('form_fields').insert(toInsert);
}

export async function GET() {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    await ensureBuiltins();
    const { data, error } = await supabaseAdmin
        .from('form_fields')
        .select('*')
        .order('sort_order');
    if (error) return NextResponse.json({ error: 'Failed to load fields.' }, { status: 500 });
    return NextResponse.json({ fields: data || [] });
}

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { label, label_hi, field_type, options, is_required } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: 'Label required.' }, { status: 400 });
    const type = CUSTOM_FIELD_TYPES.includes(field_type) ? field_type : 'text';

    // Unique key from the label + a short random suffix.
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
        is_required: !!is_required,
        sort_order: (count || 0) + 1,
    };
    const { data, error } = await supabaseAdmin.from('form_fields').insert(row).select().single();
    if (error) return NextResponse.json({ error: 'Create failed.' }, { status: 500 });
    return NextResponse.json({ field: data });
}

export async function PATCH(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from('form_fields').select('*').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Field not found.' }, { status: 404 });

    const patch = {};
    if (updates.is_visible !== undefined) patch.is_visible = !!updates.is_visible;
    if (updates.is_required !== undefined) patch.is_required = !!updates.is_required;
    if (updates.sort_order !== undefined) patch.sort_order = Number(updates.sort_order) || 0;
    // Label/options only editable on custom fields (built-in labels are translated in-app).
    if (existing.is_custom) {
        if (updates.label !== undefined) patch.label = String(updates.label).trim();
        if (updates.label_hi !== undefined) patch.label_hi = String(updates.label_hi).trim() || null;
        if (updates.options !== undefined) patch.options = Array.isArray(updates.options) ? updates.options.filter(Boolean) : null;
    }
    // Core fields can never be hidden or made optional.
    if (existing.is_core) { patch.is_visible = true; patch.is_required = true; }

    const { data, error } = await supabaseAdmin.from('form_fields').update(patch).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    return NextResponse.json({ field: data });
}

export async function DELETE(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from('form_fields').select('field_key, is_custom').eq('id', id).single();
    if (!existing) return NextResponse.json({ error: 'Field not found.' }, { status: 404 });
    if (!existing.is_custom || BUILTIN_KEYS.has(existing.field_key)) {
        return NextResponse.json({ error: 'Built-in fields cannot be deleted — hide them instead.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('form_fields').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
}
