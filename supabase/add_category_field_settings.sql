-- Per-category registration field configuration.
-- Run AFTER add_form_fields.sql.
--
-- form_fields  = the catalog of available fields (built-in + custom definitions).
-- This table  = which fields each category shows, requires, and in what order.
-- A category with no rows here falls back to sensible defaults
-- (built-ins visible, custom fields hidden).

CREATE TABLE IF NOT EXISTS category_field_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_id    UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
    is_visible  BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    sort_order  INTEGER DEFAULT 0,
    UNIQUE (category_id, field_id)
);

CREATE INDEX IF NOT EXISTS cfs_category_idx ON category_field_settings(category_id);

GRANT ALL ON category_field_settings TO service_role;
