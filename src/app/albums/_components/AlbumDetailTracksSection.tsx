'use client';

import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { appleMusicImportStorefrontForCountry } from '@/lib/appleMusic';
import { fillAlbumTracksIfEmpty } from '../actions';
import {
  matchAlbumTracksToLyricsTrackIds,
  type LyricsTrackForMatch,
} from '../lyricsTrackMatch';
import type { Album, AlbumTrack } from '../types';
import { formatAlbumTrackDuration, normalizeAlbumTracksFromDb } from '../utils';

type AlbumDetailTracksSectionProps = {
  viewingItem: Album;
  hasLyricsTracks: boolean;
  lyricsTracks?: LyricsTrackForMatch[];
  onOpenLyrics: () => void;
  onOpenTrackLyrics?: (trackId: string) => void;
  onEditForTracks: () => void;
  onAlbumPatch?: (album: Album) => void;
  onImported?: () => void;
  isAuthenticated: boolean | null;
};

type ImportResponse = {
  tracks?: AlbumTrack[];
  error?: string;
};

export function AlbumDetailTracksSection({
  viewingItem,
  hasLyricsTracks,
  lyricsTracks = [],
  onOpenLyrics,
  onOpenTrackLyrics,
  onEditForTracks,
  onAlbumPatch,
  onImported,
  isAuthenticated,
}: AlbumDetailTracksSectionProps) {
  const tracks = normalizeAlbumTracksFromDb(viewingItem.tracks);
  const lyricsTrackIds = useMemo(
    () => matchAlbumTracksToLyricsTrackIds(tracks, lyricsTracks),
    [tracks, lyricsTracks],
  );
  const showTrackLyricsIcons = lyricsTrackIds.some((id) => Boolean(id));
  const showDiscHeaders = new Set(tracks.map((track) => (track.disc > 0 ? track.disc : 1))).size > 1;
  const appleMusicUrl = viewingItem.apple_music_url?.trim() ?? '';
  const canImportFromApple = Boolean(appleMusicUrl) && tracks.length === 0;
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleAppleImport = async () => {
    if (importing || !canImportFromApple || isAuthenticated !== true) return;
    setImportError(null);
    setImporting(true);
    try {
      const res = await fetch('/api/apple-music-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: appleMusicUrl,
          storefront: appleMusicImportStorefrontForCountry(viewingItem.country),
        }),
      });
      const data = (await res.json().catch(() => null)) as ImportResponse | null;
      if (!res.ok || !data || data.error) {
        setImportError(
          data?.error?.trim() ||
            (res.status === 404
              ? '앨범 정보를 찾지 못했습니다.'
              : '트랙 목록을 가져오지 못했습니다.'),
        );
        return;
      }
      const nextTracks = Array.isArray(data.tracks) ? data.tracks : [];
      if (nextTracks.length === 0) {
        setImportError('트랙 목록을 찾지 못했습니다.');
        return;
      }
      const result = await fillAlbumTracksIfEmpty(viewingItem.id, nextTracks);
      if (result.status === 'unauthorized') {
        setImportError('로그인이 필요합니다.');
        return;
      }
      if (result.status === 'not_found') {
        setImportError('앨범을 찾지 못했습니다.');
        return;
      }
      if (result.status === 'empty_tracks') {
        setImportError('트랙 목록을 찾지 못했습니다.');
        return;
      }
      if (result.status === 'already_filled') {
        onAlbumPatch?.(result.album);
        onImported?.();
        setImportError('이미 저장된 트랙이 있어 덮어쓰지 않았습니다.');
        return;
      }
      onAlbumPatch?.(result.album);
      onImported?.();
    } catch {
      setImportError('트랙 목록을 가져오지 못했습니다.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {hasLyricsTracks ? (
          <button
            type="button"
            onClick={onOpenLyrics}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium opacity-80 transition-opacity hover:opacity-100"
            style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
            aria-label="가사 보기"
            title="가사 보기"
          >
            <FileText className="size-3.5" strokeWidth={2} />
            Lyrics
          </button>
        ) : null}
      </div>

      {tracks.length === 0 ? (
        <div className="space-y-3 py-2">
          <p className="text-sm opacity-70">트랙리스트가 없어요</p>
          {importError ? (
            <p className="text-[11px]" style={{ color: '#ff3b30' }}>
              {importError}
            </p>
          ) : null}
          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2">
              {canImportFromApple ? (
                <button
                  type="button"
                  onClick={() => void handleAppleImport()}
                  className="btn-apple btn-apple-primary h-[36px] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={importing}
                  aria-busy={importing}
                >
                  {importing ? '불러오는 중…' : 'Apple Music에서 불러오기'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onEditForTracks}
                className="btn-apple btn-apple-secondary h-[36px] px-3 text-xs"
                disabled={importing}
              >
                수정에서 불러오기
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          {tracks.map((track, index) => (
            <TrackRow
              key={`${track.disc}-${track.no}-${index}`}
              track={track}
              lyricsTrackId={showTrackLyricsIcons ? lyricsTrackIds[index] ?? null : null}
              showLyricsIconSlot={showTrackLyricsIcons}
              onOpenTrackLyrics={onOpenTrackLyrics}
              showDivider={index < tracks.length - 1}
              showDiscHeader={
                showDiscHeaders &&
                (index === 0 ||
                  (tracks[index - 1]?.disc > 0 ? tracks[index - 1].disc : 1) !==
                    (track.disc > 0 ? track.disc : 1))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRow({
  track,
  showDiscHeader,
  showDivider,
  lyricsTrackId,
  showLyricsIconSlot,
  onOpenTrackLyrics,
}: {
  track: AlbumTrack;
  showDiscHeader: boolean;
  showDivider: boolean;
  lyricsTrackId: string | null;
  showLyricsIconSlot: boolean;
  onOpenTrackLyrics?: (trackId: string) => void;
}) {
  const disc = track.disc > 0 ? track.disc : 1;
  const duration =
    track.duration_ms != null && Number.isFinite(track.duration_ms) && track.duration_ms >= 0
      ? formatAlbumTrackDuration(track.duration_ms)
      : null;

  return (
    <div className={showDiscHeader ? 'pt-2' : undefined}>
      {showDiscHeader ? (
        <p className="pb-1.5 text-xs font-semibold opacity-70">Disc {disc}</p>
      ) : null}
      <div
        className={
          showLyricsIconSlot
            ? 'grid grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] items-start gap-2 py-2.5 sm:gap-3'
            : 'grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-2 py-2.5 sm:gap-3'
        }
        style={
          showDivider
            ? { borderBottom: '1px solid var(--border)' }
            : undefined
        }
      >
        <span className="pt-0.5 text-center text-sm font-semibold tabular-nums opacity-60">
          {track.no}
        </span>
        <p className="min-w-0 break-words text-sm leading-snug">{track.title}</p>
        {showLyricsIconSlot ? (
          lyricsTrackId && onOpenTrackLyrics ? (
            <button
              type="button"
              onClick={() => onOpenTrackLyrics(lyricsTrackId)}
              className="inline-flex size-7 items-center justify-center rounded-md opacity-75 transition-opacity hover:opacity-100"
              style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
              aria-label="가사 보기"
              title="가사 보기"
            >
              <FileText className="size-3.5" strokeWidth={2} />
            </button>
          ) : (
            <span className="size-7" aria-hidden />
          )
        ) : null}
        {duration ? (
          <span className="pt-0.5 text-right text-xs tabular-nums opacity-55">{duration}</span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
