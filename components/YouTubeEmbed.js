// components/YouTubeEmbed.js
// Shows the YouTube thumbnail with a play button; loads the iframe only on click.
// Faster page loads and no third-party scripts until the user actually plays.
"use client";

import { useState } from 'react';
import { youtubeThumbnail, youtubeEmbedUrl } from '@/lib/youtube';

export default function YouTubeEmbed({ url, title }) {
    const [playing, setPlaying] = useState(false);
    const thumb = youtubeThumbnail(url);

    if (playing) {
        return (
            <iframe
                src={youtubeEmbedUrl(url, { autoplay: true })}
                title={title || 'YouTube Video'}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    // No recognisable ID — fall back to a plain iframe so nothing breaks.
    if (!thumb) {
        return (
            <iframe
                src={youtubeEmbedUrl(url)}
                title={title || 'YouTube Video'}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => setPlaying(true)}
            className="relative w-full h-full group block bg-black"
            aria-label={`Play ${title || 'video'}`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt={title || 'Video thumbnail'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition">
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-700 shadow-lg transition">
                    <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1"><path d="M8 5v14l11-7z" /></svg>
                </span>
            </span>
        </button>
    );
}
