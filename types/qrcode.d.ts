// Ambient declaration for the `qrcode` package (it ships no bundled TS types).
// Only the helpers we use are typed; the rest fall back to `any`.
declare module 'qrcode' {
    interface QRCodeToDataURLOptions {
        width?: number;
        margin?: number;
        color?: { dark?: string; light?: string };
        errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }
    export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
    export function toBuffer(text: string, options?: QRCodeToDataURLOptions): Promise<Buffer>;
    const _default: { toDataURL: typeof toDataURL; toBuffer: typeof toBuffer };
    export default _default;
}
