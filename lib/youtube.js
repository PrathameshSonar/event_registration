// Helpers for normalising YouTube URLs.
// Admin may paste any form: watch?v=, youtu.be/, /embed/, /shorts/, or a bare ID.

export function youtubeId(url) {
    if (!url) return null;
    const str = String(url).trim();
    // Already a bare 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const patterns = [
        /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const re of patterns) {
        const m = str.match(re);
        if (m) return m[1];
    }
    return null;
}

// maxresdefault isn't always available; hqdefault always is.
export function youtubeThumbnail(url) {
    const id = youtubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeEmbedUrl(url, { autoplay = false } = {}) {
    const id = youtubeId(url);
    if (!id) return url; // fall back to whatever was stored
    return `https://www.youtube.com/embed/${id}${autoplay ? '?autoplay=1' : ''}`;
}
