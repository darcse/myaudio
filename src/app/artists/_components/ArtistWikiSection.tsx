/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';

type ArtistWikiSectionProps = {
  wikiUrl: string | null;
  artistName: string;
};

export function ArtistWikiSection({ wikiUrl, artistName }: ArtistWikiSectionProps) {
  const [wikiData, setWikiData] = useState<{
    extract: string;
    thumbnail?: { source: string };
  } | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  useEffect(() => {
    if (!wikiUrl?.trim()) {
      setWikiData(null);
      return;
    }
    setWikiData(null);
    setWikiLoading(true);
    try {
      const url = new URL(wikiUrl.trim());
      const lang = url.hostname.split('.')[0];
      const title = decodeURIComponent(url.pathname.replace('/wiki/', ''));

      void fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      )
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
  }, [wikiUrl]);

  if (!wikiUrl?.trim()) return null;

  return (
    <div className="border-b py-6" style={{ borderColor: 'var(--border)' }}>
      <strong className="mb-3 block text-sm">Wikipedia</strong>
      {wikiLoading ? (
        <div className="flex items-center gap-2 py-2 opacity-60">
          <div
            className="size-4 animate-spin rounded-full border-2"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--foreground)',
            }}
          />
          <span className="text-xs">Wikipedia 정보 불러오는 중...</span>
        </div>
      ) : null}
      {!wikiLoading && wikiData ? (
        <div className="flex gap-4">
          {wikiData.thumbnail?.source ? (
            <img
              src={wikiData.thumbnail.source}
              alt={artistName}
              className="h-20 w-16 shrink-0 rounded-xl object-cover"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-4 text-sm leading-relaxed opacity-80">{wikiData.extract}</p>
            <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-apple mt-2 inline-block text-xs"
            >
              Wikipedia에서 더 보기 →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
