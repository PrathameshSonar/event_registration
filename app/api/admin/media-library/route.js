// app/api/admin/media-library/route.js
//
// The media library: every uploaded file, browsable / reusable / deletable.
//
// Before this existed, uploads went straight to storage and only the returned URL
// was written onto whatever row was being edited — so nothing could be listed,
// reused or removed, and every replaced file was orphaned in the bucket forever.
//
// TWO BUCKETS, because visibility is a STORAGE decision, not a UI flag:
//   visibility 'public'  → `event-media` (public)  → permanent public URL.
//   visibility 'private' → `admin-docs`  (private) → NO public URL; reachable only
//                          via a short-lived signed URL from /api/admin/media-file/[id].
// A signed contract or vendor invoice must not sit behind a permanent public URL,
// so hiding it in the UI would not be enough.
//
//   GET    ?kind=&visibility=&q=   → list
//   POST   multipart { file, kind?, visibility?, title? }  → upload + index
//   PATCH  { id, ...fields }       → edit label / flags
//   DELETE { id, force? }          → remove from storage + index (409 if in use)
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const PUBLIC_BUCKET = 'event-media';
const PRIVATE_BUCKET = 'admin-docs';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;  // 15 MB — hero/collage photos can be large
const MAX_DOC_BYTES = 25 * 1024 * 1024;    // 25 MB — brochures/decks are bigger than photos
// A doc flagged attach_to_ticket rides on EVERY confirmation email, so it's capped
// far lower than the upload limit: many inboxes bounce messages over ~10 MB.
const MAX_TICKET_ATTACH_BYTES = 5 * 1024 * 1024; // 5 MB

// Which columns on other tables point at a media URL. Used to warn before a delete
// silently breaks a page. (Kept explicit rather than clever: a new consumer of the
// library must be added here, or its images can be deleted out from under it.)
const USAGE = [
    { table: 'events', column: 'hero_image_url', label: 'event hero image' },
    { table: 'categories', column: 'media_url', label: 'ticket tier image' },
    { table: 'event_guests', column: 'photo_url', label: 'guest photo' },
    { table: 'event_media', column: 'url', label: 'gallery' },
    { table: 'event_news', column: 'image_url', label: 'announcement image' },
    { table: 'event_news', column: 'attachment_url', label: 'announcement attachment' },
    { table: 'sponsors', column: 'logo_url', label: 'sponsor logo' },
];

const bucketReady = {};
async function ensureBucket(bucket, isPublic, mimes, maxBytes) {
    if (bucketReady[bucket]) return;
    const { data } = await supabaseAdmin.storage.getBucket(bucket);
    if (!data) {
        await supabaseAdmin.storage.createBucket(bucket, {
            public: isPublic, fileSizeLimit: maxBytes, allowedMimeTypes: mimes,
        });
    }
    bucketReady[bucket] = true;
}

const extOf = (name, mime) => {
    const fromName = String(name || '').split('.').pop();
    if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/i.test(fromName)) return fromName.toLowerCase();
    return (mime || '').split('/').pop() || 'bin';
};

export async function GET(request) {
    const { response } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const sp = request.nextUrl.searchParams;
    const kind = sp.get('kind');
    const visibility = sp.get('visibility');
    const q = (sp.get('q') || '').trim();

    let query = supabaseAdmin.from('media_library').select('*').order('created_at', { ascending: false }).limit(500);
    if (kind) query = query.eq('kind', kind);
    if (visibility) query = query.eq('visibility', visibility);
    if (q) query = query.or(`title.ilike.%${q}%,filename.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) {
        console.error('media library read failed:', error.message);
        return NextResponse.json({ error: 'Failed to load the media library.' }, { status: 500 });
    }
    return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    let form;
    try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 }); }

    const file = form.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

    const isImage = IMAGE_TYPES.includes(file.type);
    const isDoc = DOC_TYPES.includes(file.type);
    if (!isImage && !isDoc) {
        return NextResponse.json({ error: 'Unsupported file type. Images (JPG/PNG/WEBP/GIF/AVIF) or documents (PDF, Word, Excel, PowerPoint, TXT, CSV) only.' }, { status: 400 });
    }

    const kind = isImage ? 'image' : 'document';
    // Images are always public (they're rendered on the site by <img src>). Only a
    // document can be private — an image in a private bucket couldn't be displayed.
    const visibility = kind === 'document' && form.get('visibility') === 'private' ? 'private' : 'public';

    const max = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
    if (file.size > max) {
        return NextResponse.json({ error: `File is larger than ${Math.round(max / 1024 / 1024)} MB.` }, { status: 400 });
    }

    const bucket = visibility === 'private' ? PRIVATE_BUCKET : PUBLIC_BUCKET;

    try {
        await ensureBucket(
            bucket,
            visibility === 'public',
            visibility === 'private' ? DOC_TYPES : [...IMAGE_TYPES, ...DOC_TYPES],
            max,
        );

        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extOf(file.name, file.type)}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: upErr } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
            contentType: file.type, upsert: false,
        });
        if (upErr) {
            console.error('media upload failed:', upErr.message);
            return NextResponse.json({ error: 'Upload failed. Try again.' }, { status: 500 });
        }

        // Private files get NO url — they're only ever reachable via a signed URL.
        const url = visibility === 'public'
            ? supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl
            : null;

        const title = String(form.get('title') || '').trim() || file.name;

        const { data: row, error: insErr } = await supabaseAdmin.from('media_library').insert({
            kind, visibility, bucket, path, url,
            filename: file.name, mime: file.type, size_bytes: file.size,
            title,
            uploaded_by: session?.username || session?.name || session?.role || 'admin',
        }).select('*').single();

        if (insErr) {
            // Don't leave the object orphaned if we couldn't index it — that's the
            // exact failure this whole table exists to prevent.
            await supabaseAdmin.storage.from(bucket).remove([path]);
            console.error('media library insert failed:', insErr.message);
            return NextResponse.json({ error: 'Upload could not be recorded. Try again.' }, { status: 500 });
        }

        await logAudit({
            session, request, action: 'media.upload', entity: 'media', entityId: row.id,
            summary: `Uploaded ${kind} "${title}"${visibility === 'private' ? ' (private)' : ''}`,
            metadata: { kind, visibility, size_bytes: file.size, mime: file.type },
        });

        return NextResponse.json({ ok: true, item: row, url: row.url });
    } catch (e) {
        console.error('media upload error:', e?.message);
        return NextResponse.json({ error: 'Upload failed. Try again.' }, { status: 500 });
    }
}

export async function PATCH(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { id, title, description, is_download, attach_to_ticket, sort_order } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const updates = {};
    if (title !== undefined) updates.title = String(title).trim() || null;
    if (description !== undefined) updates.description = String(description).trim() || null;
    if (sort_order !== undefined) updates.sort_order = Number(sort_order) || 0;
    // Booleans assigned explicitly so `false` isn't dropped.
    if (is_download !== undefined) updates.is_download = !!is_download;
    if (attach_to_ticket !== undefined) updates.attach_to_ticket = !!attach_to_ticket;

    if (!Object.keys(updates).length) return NextResponse.json({ ok: true });

    // A private file must never be exposed through a public surface — the homepage
    // Downloads list and the ticket email both hand out its URL, and it has none.
    if (updates.is_download || updates.attach_to_ticket) {
        const { data: row } = await supabaseAdmin.from('media_library').select('visibility, kind, size_bytes').eq('id', id).single();
        if (row?.visibility === 'private') {
            return NextResponse.json({ error: 'This file is private — make it a public document before publishing or emailing it.' }, { status: 400 });
        }
        if (row?.kind !== 'document') {
            return NextResponse.json({ error: 'Only documents can be published as downloads or attached to emails.' }, { status: 400 });
        }
        // This file would ride along on EVERY confirmation email. A 25 MB deck sent
        // to a few thousand registrants is both a deliverability problem (many
        // inboxes bounce >10 MB) and a bandwidth bill, so cap it well below the
        // upload limit.
        if (updates.attach_to_ticket && Number(row?.size_bytes || 0) > MAX_TICKET_ATTACH_BYTES) {
            return NextResponse.json({
                error: `Too large to attach to every ticket email (${(row.size_bytes / 1024 / 1024).toFixed(1)} MB). Keep email attachments under ${MAX_TICKET_ATTACH_BYTES / 1024 / 1024} MB — publish it as a download instead and link to it.`,
            }, { status: 400 });
        }
    }

    const { error } = await supabaseAdmin.from('media_library').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

    await logAudit({
        session, request, action: 'media.update', entity: 'media', entityId: id,
        summary: `Updated media "${updates.title || id}"`,
        metadata: updates,
    });
    return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
    const { response, session } = await authorize({ requirePermission: 'settings:manage' });
    if (response) return response;

    const { id, force } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const { data: row } = await supabaseAdmin.from('media_library').select('*').eq('id', id).single();
    if (!row) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

    // Deleting a file that's still on the site would leave a broken image. Check
    // first and make the admin confirm, rather than silently breaking a page.
    if (!force && row.url) {
        const inUse = [];
        for (const u of USAGE) {
            const { count } = await supabaseAdmin
                .from(u.table)
                .select('id', { count: 'exact', head: true })
                .eq(u.column, row.url);
            if (count) inUse.push({ where: u.label, count });
        }
        if (inUse.length) {
            return NextResponse.json({
                error: 'This file is still in use.',
                inUse,
            }, { status: 409 });
        }
    }

    const { error: rmErr } = await supabaseAdmin.storage.from(row.bucket).remove([row.path]);
    if (rmErr) console.error('storage delete failed (removing the index row anyway):', rmErr.message);

    const { error } = await supabaseAdmin.from('media_library').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });

    await logAudit({
        session, request, action: 'media.delete', entity: 'media', entityId: id,
        summary: `Deleted ${row.kind} "${row.title || row.filename}"${force ? ' (forced — was still in use)' : ''}`,
        metadata: { forced: !!force, visibility: row.visibility },
    });
    return NextResponse.json({ ok: true });
}
