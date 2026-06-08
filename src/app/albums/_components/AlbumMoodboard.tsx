/* eslint-disable @next/next/no-img-element */
'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, LayoutGrid, LayoutList, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Album } from '../types';
import { getMoodGradientPair, hexToRgba } from '../moodGradient';

function moodCardGlassStyle(moodName: string): CSSProperties {
  const pair = getMoodGradientPair(moodName);
  return {
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: `linear-gradient(135deg, ${hexToRgba(pair.a, 0.35)}, ${hexToRgba(pair.b, 0.35)})`,
  };
}

export type AlbumMoodGroupApi = {
  mood_name: string;
  album_ids: (number | string)[];
};

type AlbumMoodboardProps = {
  library: Album[];
  onAlbumClick: (album: Album) => void;
  viewMode: 'list' | 'moodboard';
  onViewModeChange: (mode: 'list' | 'moodboard') => void;
  isAuthenticated: boolean;
  selectedYearLabel: string;
};

function resolveAlbums(ids: (number | string)[], library: Album[]): Album[] {
  const map = new Map(library.map((a) => [a.id, a]));
  return ids
    .map((raw) => {
      const id = typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : parseInt(String(raw), 10);
      return Number.isInteger(id) ? map.get(id) : undefined;
    })
    .filter((a): a is Album => !!a);
}

function albumYearBadgeLabel(album: Album, fallback: string): string {
  if (Array.isArray(album.year)) {
    const values = album.year.map((value) => String(value).trim()).filter(Boolean);
    if (values.length > 0) return values[0];
  } else if (album.year != null) {
    const value = String(album.year).trim();
    if (value) return value;
  }
  return fallback;
}

function MoodCollage({ albums }: { albums: Album[] }) {
  const slots = Array.from({ length: 6 }, (_, i) => albums[i] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1 mb-3 w-full aspect-[3/2]">
      {slots.map((item, i) => (
        <div
          key={i}
          className="relative rounded-md overflow-hidden min-h-0"
          style={{ background: 'var(--badge-bg)' }}
        >
          {item?.cover_image_url ? (
            <img src={item.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">—</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ViewModeIcons({
  viewMode,
  onViewModeChange,
}: {
  viewMode: 'list' | 'moodboard';
  onViewModeChange: (mode: 'list' | 'moodboard') => void;
}) {
  const iconBtn = (mode: 'list' | 'moodboard', Icon: typeof LayoutList, label: string) => (
    <button
      key={mode}
      type="button"
      title={label}
      aria-label={label}
      onClick={() => onViewModeChange(mode)}
      className="h-[38px] w-[38px] flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-90"
      style={
        viewMode === mode
          ? { background: 'var(--foreground)', color: 'var(--background)' }
          : { background: 'var(--card-bg)', border: '1px solid var(--border)' }
      }
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
  return (
    <div className="flex items-center gap-1 shrink-0">
      {iconBtn('list', LayoutList, '목록 뷰')}
      {iconBtn('moodboard', LayoutGrid, '무드보드 뷰')}
    </div>
  );
}

export function AlbumMoodboard({
  library,
  onAlbumClick,
  viewMode,
  onViewModeChange,
  isAuthenticated,
  selectedYearLabel,
}: AlbumMoodboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moodQuery = searchParams.get('mood') ?? '';
  const [groups, setGroups] = useState<AlbumMoodGroupApi[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading'>('idle');
  const [expandedMood, setExpandedMood] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!isAuthenticated) {
      setGroups([]);
      setLoadState('idle');
      return;
    }
    if (library.length === 0) {
      setGroups([]);
      setLoadState('idle');
      return;
    }
    setLoadState('loading');
    try {
      const res = await fetch('/api/album-mood-groups', { method: 'GET' });
      const data = (await res.json()) as { groups?: AlbumMoodGroupApi[]; error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : '불러오지 못했습니다.');
        setGroups([]);
        return;
      }
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {
      toast.error('불러오지 못했습니다.');
      setGroups([]);
    } finally {
      setLoadState('idle');
    }
  }, [library.length, isAuthenticated]);

  useEffect(() => {
    if (viewMode !== 'moodboard') return;
    void loadGroups();
  }, [viewMode, loadGroups]);

  useEffect(() => {
    if (viewMode !== 'moodboard') {
      setExpandedMood(null);
      return;
    }
    if (groups.length === 0) {
      setExpandedMood(null);
      return;
    }
    const raw = moodQuery.trim();
    if (!raw) {
      setExpandedMood(null);
      return;
    }
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }
    const hit = groups.find((x) => x.mood_name.trim() === decoded.trim());
    if (hit) setExpandedMood(hit.mood_name);
    else setExpandedMood(null);
  }, [viewMode, groups, moodQuery]);

  const clearMoodQuery = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('mood');
    const q = sp.toString();
    router.replace(q ? `/albums?${q}` : '/albums');
  }, [router, searchParams]);

  const expandedAlbums = useMemo(() => {
    if (!expandedMood) return [];
    const g = groups.find((x) => x.mood_name === expandedMood);
    if (!g?.album_ids?.length) return [];
    return resolveAlbums(g.album_ids, library).sort(
      (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
    );
  }, [expandedMood, groups, library]);

  if (expandedMood != null) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 gap-y-3 mb-5 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                setExpandedMood(null);
                if (moodQuery.trim()) clearMoodQuery();
              }}
              className="h-[38px] w-[38px] flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-90"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              aria-label="무드보드로 돌아가기"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </button>
            <p className="text-base font-semibold truncate min-w-0" style={{ color: 'var(--foreground)' }}>
              {expandedMood}
            </p>
          </div>
          <ViewModeIcons viewMode={viewMode} onViewModeChange={onViewModeChange} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {expandedAlbums.map((item) => (
            <button
              key={item.id}
              type="button"
              className="group text-left w-full"
              onClick={() => onAlbumClick(item)}
            >
              <div
                className="relative aspect-square mb-2 rounded-xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                <span
                  className="absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
                  style={{
                    background: '#2F3440',
                    color: '#EAEAF0',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
                  }}
                >
                  {albumYearBadgeLabel(item, selectedYearLabel)}
                </span>
                {item.cover_image_url ? (
                  <img src={item.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs opacity-45"
                    style={{ background: 'var(--badge-bg)' }}
                  >
                    No Cover
                  </div>
                )}
              </div>
              <p className="font-bold text-sm leading-tight line-clamp-2">{item.album_name}</p>
              <p className="text-xs opacity-60 truncate mt-0.5">{item.artist ?? ''}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-w-0">
        <h2 className="text-base font-bold flex items-center gap-2 shrink-0" style={{ color: 'var(--foreground)' }}>
          <Sparkles className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
          Moodboard
        </h2>
        <ViewModeIcons viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      {!isAuthenticated ? (
        <div className="empty-state-apple text-center py-12">
          <p>로그인 후 무드보드를 이용할 수 있습니다.</p>
        </div>
      ) : library.length === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>등록된 앨범이 없습니다.</p>
        </div>
      ) : loadState === 'loading' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
          <p className="text-sm opacity-60">무드보드를 준비하는 중…</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>무드 그룹을 불러오지 못했습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g) => {
            const list = resolveAlbums(g.album_ids ?? [], library);
            return (
              <button
                key={g.mood_name}
                type="button"
                onClick={() => setExpandedMood(g.mood_name)}
                className="album-mood-card text-left rounded-2xl p-4 overflow-hidden hover:opacity-95"
                style={moodCardGlassStyle(g.mood_name)}
              >
                <MoodCollage albums={list} />
                <p className="text-sm font-extrabold leading-snug truncate mt-3 tracking-tight" style={{ color: 'var(--foreground)' }}>
                  {g.mood_name}
                </p>
                <p className="text-xs font-semibold mt-1.5 tabular-nums" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                  {list.length}장
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
