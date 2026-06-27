-- Dynamic registration form fields.
-- Admin controls which fields show on the registration form, which are required,
-- and can add custom fields. Built-in fields map to real columns on `registrations`;
-- custom field answers are stored in the `custom_fields` JSONB column.
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS form_fields (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key   TEXT NOT NULL UNIQUE,        -- 'gotra', 'gender', or 'custom_xxx'
    label       TEXT NOT NULL,
    label_hi    TEXT,
    field_type  TEXT NOT NULL DEFAULT 'text', -- text | number | date | select | textarea | tel | email
    options     JSONB,                        -- for 'select': ["A","B","C"]
    is_custom   BOOLEAN DEFAULT false,        -- true = admin-created
    is_core     BOOLEAN DEFAULT false,        -- true = locked (name/email/phone)
    is_visible  BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Custom field answers live here, keyed by field_key.
ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

GRANT ALL ON form_fields TO service_role;

-- Built-in field rows are auto-seeded by the admin dashboard on first load.
