// app/api/admin/qr/[id]/route.js
// Returns a QR code PNG for a given registration. Admin/viewer auth required.
import QRCode from 'qrcode';
import { authorize } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
    const { response } = await authorize({ requireAdmin: false });
    if (response) return response;

    const { id } = params;
    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000');

    const verifyUrl = `${siteUrl}/entry/${id}`;
    const shortId = id.split('-')[0].toUpperCase();

    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
        width: 400,
        margin: 3,
        color: { dark: '#171717', light: '#ffffff' },
    });

    return new Response(qrBuffer, {
        headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="entry-qr-${shortId}.png"`,
            'Cache-Control': 'no-store',
        },
    });
}
