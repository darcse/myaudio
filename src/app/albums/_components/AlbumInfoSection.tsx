/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Music } from 'lucide-react';
import { countryOptions } from '../constants';
import { getYoutubeId } from '../utils';
import type { Album } from '../types';
import { MoodMiniCard } from './albumDetailMoodMiniCard';

type AlbumInfoSectionProps = {
  viewingItem: Album;
  onNavigateToMood?: (moodName: string) => void;
};

export function AlbumInfoHeroSection({ viewingItem }: Pick<AlbumInfoSectionProps, 'viewingItem'>) {
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  useEffect(() => {
    setYoutubeOpen(false);
  }, [viewingItem.id]);

  return (
    <>
      <div className="relative w-full shrink-0 overflow-hidden rounded-t-[var(--radius-lg)]" style={{ height: 300 }}>
        {viewingItem.cover_image_url ? (
          <>
            <div className="absolute inset-0 overflow-hidden" aria-hidden>
              <img
                src={viewingItem.cover_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover blur-xl scale-110"
              />
            </div>
            <div className="absolute inset-0 z-[1] flex items-center justify-center p-6 pointer-events-none">
              <img
                src={viewingItem.cover_image_url}
                alt="앨범 커버"
                className="aspect-square max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center z-[1]" style={{ background: 'var(--badge-bg)' }}>
            <Music className="size-12 opacity-30" strokeWidth={1.5} />
          </div>
        )}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 z-[3] p-5">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {viewingItem.genre1 && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                {viewingItem.genre1}
              </span>
            )}
            {viewingItem.genre2 && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                {viewingItem.genre2}
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white leading-snug line-clamp-2">{viewingItem.album_name}</h2>
              <p className="text-sm text-white/70 mt-0.5 truncate">
                {viewingItem.artist ? (
                  <Link
                    href={`/artists?artist=${encodeURIComponent(viewingItem.artist)}`}
                    className="transition-colors hover:text-white hover:underline"
                  >
                    {viewingItem.artist}
                  </Link>
                ) : (
                  '—'
                )}{' '}
                {viewingItem.artist_type && `(${viewingItem.artist_type})`}
                {viewingItem.country && (
                  <span className="ml-1.5">
                    {countryOptions.find((c) => c.name === viewingItem.country)?.flag}
                  </span>
                )}
              </p>
            </div>
            {viewingItem.title_song_url && getYoutubeId(viewingItem.title_song_url) && (
              <button
                type="button"
                onClick={() => setYoutubeOpen((o) => !o)}
                className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full transition-colors"
                style={{ background: youtubeOpen ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }}
                title="타이틀 곡 재생"
              >
                {youtubeOpen ? (
                  <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24" aria-hidden>
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white fill-current ml-0.5" viewBox="0 0 24 24" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {youtubeOpen && viewingItem.title_song_url && getYoutubeId(viewingItem.title_song_url) ? (
        <div className="aspect-video w-full shrink-0">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${getYoutubeId(viewingItem.title_song_url)}?autoplay=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </>
  );
}

export function AlbumInfoSection({ viewingItem, onNavigateToMood }: AlbumInfoSectionProps) {
  const [wikiData, setWikiData] = useState<{
    extract: string;
    thumbnail?: { source: string };
  } | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  useEffect(() => {
    if (!viewingItem.wiki_url?.trim()) {
      setWikiData(null);
      return;
    }
    setWikiData(null);
    setWikiLoading(true);
    try {
      const url = new URL(viewingItem.wiki_url.trim());
      const lang = url.hostname.split('.')[0];
      const title = decodeURIComponent(url.pathname.replace('/wiki/', ''));

      fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.extract) {
            setWikiData({
              extract: data.extract,
              thumbnail: data.thumbnail,
            });
          }
        })
        .catch(() => null)
        .finally(() => setWikiLoading(false));
    } catch {
      setWikiLoading(false);
    }
  }, [viewingItem.wiki_url]);

  return (
    <>
      <div className="flex flex-row gap-4 items-start text-sm opacity-90">
        {typeof viewingItem.mood_name === 'string' && viewingItem.mood_name.trim() ? (
          <div className="shrink-0 w-fit max-w-full min-w-0">
            <MoodMiniCard moodName={viewingItem.mood_name} onNavigate={onNavigateToMood} />
          </div>
        ) : null}
        <div className="flex flex-col gap-y-2 min-w-0 flex-1">
          <p><strong>발매일:</strong> {viewingItem.release_date || '-'}</p>
          <p><strong>앨범 타입:</strong> {viewingItem.album_type || '-'}</p>
        </div>
      </div>

      {wikiLoading ? (
        <div className="flex items-center gap-2 py-2 opacity-60">
          <div
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--foreground)',
            }}
          />
          <span className="text-xs">Wikipedia 정보 불러오는 중...</span>
        </div>
      ) : null}

      {!wikiLoading && wikiData ? (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <strong className="block mb-3 text-sm">📖 Wikipedia</strong>
          <div className="flex gap-4">
            {wikiData.thumbnail?.source ? (
              <img
                src={wikiData.thumbnail.source}
                alt={viewingItem.artist ?? 'artist'}
                className="w-16 h-20 object-cover rounded-xl flex-shrink-0"
                style={{ border: '1px solid var(--border)' }}
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed opacity-80 line-clamp-3">
                {wikiData.extract}
              </p>
              {viewingItem.wiki_url ? (
                <a
                  href={viewingItem.wiki_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-apple text-xs mt-2 inline-block"
                >
                  Wikipedia에서 더 보기 →
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
