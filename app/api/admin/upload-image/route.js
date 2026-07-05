// app/api/admin/upload-image/route.js
// Admin-only image upload. Stores the file in the public `event-media` Supabase
// bucket and returns its permanent public URL, so admins can upload from their
// computer instead of pasting an external link. multipart/form-data: field "file".
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const BUCKET = 'event-media';
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

let bucketReady = false;
async function ensureBucket() {
    if (bucketReady) return;
    const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
    if (!data) {
        await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ALLOWED });
    }
    bucketReady = true;
}

export async function POST(request) {
    const { response } = await authorize({ requireAdmin: true });
    if (response) return response;

    let form;
    try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 }); }
    const file = form.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, WEBP, GIF or AVIF images are allowed.' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is larger than 6 MB.' }, { status: 400 });

    try {
        await ensureBucket();
        const ext = EXT[file.type] || 'jpg';
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(name, buffer, { contentType: file.type, upsert: false });
        if (upErr) {
            console.error('Image upload failed:', upErr.message);
            return NextResponse.json({ error: 'Upload failed. Try again.' }, { status: 500 });
        }
        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(name);
        return NextResponse.json({ ok: true, url: data.publicUrl });
    } catch (e) {
        console.error('Image upload error:', e?.message);
        return NextResponse.json({ error: 'Upload failed. Try again.' }, { status: 500 });
    }
}
