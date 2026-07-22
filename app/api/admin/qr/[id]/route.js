// app/api/admin/qr/[id]/route.js
// Returns a QR code PNG for a given registration.
// Gated on `qr:send`, not `registrations:view`: handing someone this PNG issues a
// working entry pass, which is the same act as the bulk send — a read-only role
// must not be able to mint one. (`qr:send` implies `registrations:view`.)
import QRCode from 'qrcode';
import { authorize } from '@/lib/adminGuard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getQrConfig } from '@/lib/settingsServer';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
    const { response } = await authorize({ requirePermission: 'qr:send' });
    if (response) return response;

    const { id } = await params;

    // Entry passes are only valid for fully-paid registrations. Refuse to mint a
    // QR for anything else (advance_paid, pending, enquired, failed, …).
    const { data: reg, error } = await supabaseAdmin
        .from('registrations')
        .select('payment_status')
        .eq('id', id)
        .single();
    if (error || !reg) {
        return new Response('Registration not found.', { status: 404 });
    }
    if (reg.payment_status !== 'completed') {
        return new Response('QR is only available for fully-paid registrations.', { status: 409 });
    }

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

    const verifyUrl = `${siteUrl}/entry/${id}`;
    const shortId = id.split('-')[0].toUpperCase();

    const qrCfg = await getQrConfig();
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
        width: qrCfg.download_size,   // the download is deliberately larger than the emailed one
        margin: qrCfg.margin,
        color: { dark: qrCfg.dark, light: qrCfg.light },
    });

    return new Response(qrBuffer, {
        headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="entry-qr-${shortId}.png"`,
            'Cache-Control': 'no-store',
        },
    });
}
