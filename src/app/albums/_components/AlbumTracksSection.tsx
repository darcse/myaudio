'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { AlbumTrack } from '../types';
import {
  emptyAlbumTrack,
  formatAlbumTrackDuration,
  renumberAlbumTracks,
} from '../utils';

type AlbumTracksSectionProps = {
  tracks: AlbumTrack[];
  appleMusicUrl: string;
  onChange: (tracks: AlbumTrack[]) => void;
};

type ImportResponse = {
  tracks?: AlbumTrack[];
  error?: string;
};

export function AlbumTracksSection({
  tracks,
  appleMusicUrl,
  onChange,
}: AlbumTracksSectionProps) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);

  const showDiscHeaders = useMemo(() => {
    const discs = new Set(tracks.map((track) => (track.disc > 0 ? track.disc : 1)));
    return discs.size > 1;
  }, [tracks]);

  const applyTracks = (next: AlbumTrack[]) => {
    onChange(renumberAlbumTracks(next));
  };

  const updateTitle = (index: number, title: string) => {
    applyTracks(tracks.map((track, i) => (i === index ? { ...track, title } : track)));
  };

  const moveTrack = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= tracks.length) return;
    const next = [...tracks];
    const [item] = next.splice(index, 1);
    const neighbor = next[Math.min(target, Math.max(0, next.length - 1))];
    next.splice(target, 0, {
      ...item,
      disc: neighbor?.disc ?? item.disc,
    });
    applyTracks(next);
  };

  const removeTrack = (index: number) => {
    applyTracks(tracks.filter((_, i) => i !== index));
  };

  const addTrack = () => {
    const lastDisc = tracks.length > 0 ? tracks[tracks.length - 1].disc || 1 : 1;
    applyTracks([...tracks, emptyAlbumTrack(lastDisc, tracks.length + 1)]);
  };

  const importTracks = async () => {
    if (importing) return;
    setImportError(null);
    const url = appleMusicUrl.trim();
    if (!url) {
      setImportError('기본 정보 탭에 Apple Music 주소를 먼저 넣어 주세요.');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/apple-music-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
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
        setImportError('트랙 목록을 찾지 못했습니다. 기존 트랙은 그대로 둡니다.');
        return;
      }
      applyTracks(nextTracks);
      setOverwriteConfirmOpen(false);
    } catch {
      setImportError('트랙 목록을 가져오지 못했습니다.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    if (tracks.length > 0) {
      setOverwriteConfirmOpen(true);
      return;
    }
    void importTracks();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-apple btn-apple-secondary h-[36px] px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={handleImportClick}
          disabled={importing}
          aria-busy={importing}
        >
          {importing ? '불러오는 중…' : 'Apple Music에서 불러오기'}
        </button>
      </div>

      {overwriteConfirmOpen ? (
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
        >
          <p className="text-sm font-medium">
            기존 트랙 {tracks.length}개를 덮어씁니다. 계속할까요?
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className="btn-apple btn-apple-secondary h-[34px] px-3 text-sm"
              onClick={() => setOverwriteConfirmOpen(false)}
              disabled={importing}
            >
              취소
            </button>
            <button
              type="button"
              className="btn-apple btn-apple-primary h-[34px] px-3 text-sm"
              onClick={() => void importTracks()}
              disabled={importing}
              aria-busy={importing}
            >
              확인
            </button>
          </div>
        </div>
      ) : null}

      {importError ? (
        <p className="text-[11px]" style={{ color: '#ff3b30' }}>
          {importError}
        </p>
      ) : null}

      {tracks.length === 0 ? (
        <p className="text-sm opacity-60">트랙이 없습니다. 불러오거나 아래에서 추가해 주세요.</p>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => {
            const disc = track.disc > 0 ? track.disc : 1;
            const showHeader =
              showDiscHeaders &&
              (index === 0 || (tracks[index - 1]?.disc > 0 ? tracks[index - 1].disc : 1) !== disc);
            return (
              <div key={`${disc}-${track.no}-${index}`} className="space-y-2">
                {showHeader ? (
                  <p className="pt-1 text-xs font-semibold opacity-70">Disc {disc}</p>
                ) : null}
                <div
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_auto] items-center gap-2 rounded-xl px-2 py-2 sm:gap-3 sm:px-3"
                  style={{ border: '1px solid var(--border)', background: 'var(--badge-bg)' }}
                >
                  <span className="text-center text-sm font-semibold tabular-nums opacity-70">
                    {track.no}
                  </span>
                  <input
                    className="input-apple h-[36px] w-full min-w-0 px-2.5 py-1.5 text-sm"
                    value={track.title}
                    onChange={(e) => updateTitle(index, e.target.value)}
                    placeholder="곡명"
                    aria-label={`트랙 ${track.no} 곡명`}
                  />
                  <span className="text-right text-xs tabular-nums opacity-60">
                    {formatAlbumTrackDuration(track.duration_ms)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30"
                      onClick={() => moveTrack(index, -1)}
                      disabled={index === 0}
                      aria-label="위로 이동"
                    >
                      <ArrowUp className="size-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 disabled:opacity-30"
                      onClick={() => moveTrack(index, 1)}
                      disabled={index === tracks.length - 1}
                      aria-label="아래로 이동"
                    >
                      <ArrowDown className="size-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
                      onClick={() => removeTrack(index)}
                      aria-label="트랙 삭제"
                    >
                      <Trash2 className="size-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="btn-apple btn-apple-secondary inline-flex h-[36px] items-center gap-1.5 px-3 text-xs"
        onClick={addTrack}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        트랙 추가
      </button>
    </div>
  );
}
