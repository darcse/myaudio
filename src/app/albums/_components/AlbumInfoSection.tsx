/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Music } from 'lucide-react';
import { toast } from 'sonner';
import { countryOptions } from '../constants';
import { getYoutubeId } from '../utils';
import type { Album } from '../types';
import { getMoodVibeEmoji, MoodMiniCard } from './albumDetailMoodMiniCard';
import { AlbumCoverBlurBackdrop } from './AlbumCoverBlurBackdrop';
import { getMoodVibeGradient } from '../moodGradient';

type AlbumInfoSectionProps = {
  viewingItem: Album;
  isAuthenticated?: boolean | null;
  onNavigateToMood?: (moodName: string) => void;
  onAlbumPatch?: (album: Album) => void;
};

export function AlbumInfoHeroSection({ viewingItem }: Pick<AlbumInfoSectionProps, 'viewingItem'>) {
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  useEffect(() => {
    setYoutubeOpen(false);
  }, [viewingItem.id]);

  return (
    <>
      <div className="relative w-full shrink-0 overflow-hidden rounded-t-[var(--radius-lg)]" style={{ height: 300 }}>
        <AlbumCoverBlurBackdrop coverImageUrl={viewingItem.cover_image_url} />
        {viewingItem.cover_image_url ? (
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
        ) : (
          <div className="absolute inset-0 z-[1] flex items-center justify-center" style={{ background: 'var(--badge-bg)' }}>
            <Music className="size-12 opacity-30" strokeWidth={1.5} />
          </div>
        )}
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

export function AlbumInfoSection({
  viewingItem,
  isAuthenticated = null,
  onNavigateToMood,
  onAlbumPatch,
}: AlbumInfoSectionProps) {
  const [wikiData, setWikiData] = useState<{
    extract: string;
    thumbnail?: { source: string };
  } | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moodOptions, setMoodOptions] = useState<string[]>([]);
  const [moodsLoading, setMoodsLoading] = useState(false);
  const [savingMood, setSavingMood] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const currentMood =
    typeof viewingItem.mood_name === 'string' ? viewingItem.mood_name.trim() : '';
  const canEditMood = isAuthenticated === true && typeof onAlbumPatch === 'function';

  const updatePickerPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 256), Math.min(352, window.innerWidth - 24));
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
    const estimatedHeight = Math.min(window.innerHeight * 0.55, 320);
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : below;
    setPickerPos({ top, left, width });
  };

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

  useEffect(() => {
    setPickerOpen(false);
    setMoodOptions([]);
    setPickerPos(null);
  }, [viewingItem.id]);

  useLayoutEffect(() => {
    if (!pickerOpen) return;
    updatePickerPosition();
  }, [pickerOpen, moodOptions.length, moodsLoading]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    const onReposition = () => updatePickerPosition();
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [pickerOpen]);

  const openMoodPicker = async () => {
    if (!canEditMood || savingMood) return;
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    setPickerOpen(true);
    updatePickerPosition();
    if (moodOptions.length > 0) return;
    setMoodsLoading(true);
    try {
      const res = await fetch('/api/album-mood-groups?listOnly=1');
      const data = (await res.json().catch(() => ({}))) as {
        groups?: { mood_name?: string }[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || '무드 목록을 불러오지 못했습니다.');
        setPickerOpen(false);
        return;
      }
      const names: string[] = [];
      const seen = new Set<string>();
      for (const g of data.groups ?? []) {
        const name = typeof g.mood_name === 'string' ? g.mood_name.trim() : '';
        if (!name || seen.has(name)) continue;
        seen.add(name);
        names.push(name);
      }
      if (names.length === 0) {
        toast.error('등록된 무드 그룹이 없습니다.');
        setPickerOpen(false);
        return;
      }
      setMoodOptions(names);
    } catch {
      toast.error('무드 목록을 불러오지 못했습니다.');
      setPickerOpen(false);
    } finally {
      setMoodsLoading(false);
    }
  };

  const selectMood = async (moodName: string) => {
    if (!canEditMood || savingMood) return;
    if (moodName === currentMood) {
      setPickerOpen(false);
      return;
    }
    setSavingMood(true);
    try {
      const res = await fetch('/api/album-mood-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: viewingItem.id, mood_name: moodName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        mood_name?: string;
        mood_manually_set?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || '무드를 저장하지 못했습니다.');
        return;
      }
      const nextName = typeof data.mood_name === 'string' ? data.mood_name.trim() : moodName;
      onAlbumPatch?.({
        ...viewingItem,
        mood_name: nextName,
        mood_manually_set: true,
      });
      setPickerOpen(false);
      toast.success('무드를 저장했습니다.');
    } catch {
      toast.error('무드를 저장하지 못했습니다.');
    } finally {
      setSavingMood(false);
    }
  };

  return (
    <>
      <div className="flex flex-row gap-4 items-start text-sm">
        {currentMood || canEditMood ? (
          <div className="relative shrink-0 w-fit max-w-full min-w-0" ref={triggerRef}>
            <MoodMiniCard
              moodName={currentMood || '무드 선택'}
              placeholder={!currentMood}
              disabled={savingMood}
              onClick={
                canEditMood
                  ? () => void openMoodPicker()
                  : currentMood && onNavigateToMood
                    ? () => onNavigateToMood(currentMood)
                    : undefined
              }
            />
            {pickerOpen && pickerPos
              ? createPortal(
                  <div
                    ref={panelRef}
                    className="fixed z-[80] overflow-hidden rounded-xl shadow-lg"
                    style={{
                      top: pickerPos.top,
                      left: pickerPos.left,
                      width: pickerPos.width,
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                    }}
                    role="listbox"
                    aria-label="무드 선택"
                  >
                    {moodsLoading ? (
                      <p className="px-3 py-3 text-xs opacity-60">무드 목록 불러오는 중…</p>
                    ) : (
                      <ul className="max-h-[min(55vh,22rem)] overflow-y-auto py-1">
                        {moodOptions.map((name, index) => {
                          const selected = name === currentMood;
                          return (
                            <li key={`${index}-${name}`}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                disabled={savingMood}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-opacity hover:opacity-100 disabled:opacity-50"
                                style={{
                                  opacity: selected ? 1 : 0.85,
                                  background: selected
                                    ? 'color-mix(in srgb, var(--foreground) 8%, var(--card-bg))'
                                    : undefined,
                                }}
                                onClick={() => void selectMood(name)}
                              >
                                <span
                                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[11px]"
                                  style={{ background: getMoodVibeGradient(name), color: '#fff' }}
                                  aria-hidden
                                >
                                  {getMoodVibeEmoji(name)}
                                </span>
                                <span className="min-w-0 flex-1 break-words leading-snug">{name}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {currentMood && onNavigateToMood ? (
                      <div className="border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                        <button
                          type="button"
                          className="text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
                          onClick={() => {
                            setPickerOpen(false);
                            onNavigateToMood(currentMood);
                          }}
                        >
                          무드보드에서 보기
                        </button>
                      </div>
                    ) : null}
                  </div>,
                  document.body,
                )
              : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-y-2 min-w-0 flex-1 opacity-90">
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
