/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { countryOptions, genreOptions } from '@/app/albums/constants';
import type { LyricsAlbumCard } from '../types';

type AlbumOption = {
  id: number;
  album_name: string;
  artist: string | null;
  cover_image_url: string | null;
  release_date: string | null;
  genre1: string | null;
};

export function LyricsTranslateLibraryContent() {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<LyricsAlbumCard[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allAlbums, setAllAlbums] = useState<AlbumOption[]>([]);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listGenreFilter, setListGenreFilter] = useState('전체');
  const [listCountryFilter, setListCountryFilter] = useState('전체');
  const [listSortOrder, setListSortOrder] = useState('release_desc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const client = createClient();
        const [{ data: tracks, error: tracksError }, { data: albums, error: albumsError }] =
          await Promise.all([
            client
              .from('lyrics_translation_tracks')
              .select('id, album_id')
              .order('track_number'),
            client
              .from('album')
              .select('id, album_name, artist, cover_image_url, release_date, genre1, country'),
          ]);
        if (tracksError) throw tracksError;
        if (albumsError) throw albumsError;

        const trackRows = tracks ?? [];
        const albumMap = new Map((albums ?? []).map((a) => [a.id, a]));
        const trackIds = trackRows.map((t) => t.id);
        let translatedTrackIds = new Set<string>();
        if (trackIds.length > 0) {
          const { data: translations, error: trError } = await client
            .from('lyrics_translations')
            .select('track_id')
            .in('track_id', trackIds);
          if (trError) throw trError;
          translatedTrackIds = new Set((translations ?? []).map((t) => t.track_id));
        }

        const byAlbum = new Map<number, { trackCount: number; translatedCount: number }>();
        for (const t of trackRows) {
          const cur = byAlbum.get(t.album_id) ?? { trackCount: 0, translatedCount: 0 };
          cur.trackCount += 1;
          if (translatedTrackIds.has(t.id)) cur.translatedCount += 1;
          byAlbum.set(t.album_id, cur);
        }

        const next: LyricsAlbumCard[] = [];
        for (const [albumId, stats] of byAlbum) {
          const album = albumMap.get(albumId);
          if (!album) continue;
          next.push({
            albumId,
            albumName: album.album_name,
            artist: album.artist,
            country: album.country,
            coverImageUrl: album.cover_image_url,
            releaseDate: album.release_date,
            genre1: album.genre1,
            trackCount: stats.trackCount,
            translatedCount: stats.translatedCount,
          });
        }
        next.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
        if (!cancelled) setCards(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPicker = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const { data, error } = await createClient()
        .from('album')
        .select('id, album_name, artist, cover_image_url, release_date, genre1')
        .order('album_name');
      if (error) throw error;
      setAllAlbums((data as AlbumOption[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '앨범 목록을 불러오지 못했습니다.');
      setAllAlbums([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const filteredCards = useMemo(() => {
    const q = listSearchQuery.trim().toLowerCase();
    const filtered = cards.filter((card) => {
      const matchesSearch =
        !q ||
        card.albumName.toLowerCase().includes(q) ||
        (card.artist ?? '').toLowerCase().includes(q);
      const matchesGenre = listGenreFilter === '전체' || card.genre1 === listGenreFilter;
      const matchesCountry = listCountryFilter === '전체' || card.country === listCountryFilter;
      return matchesSearch && matchesGenre && matchesCountry;
    });
    return [...filtered].sort((a, b) => {
      if (listSortOrder === 'release_desc') {
        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
      }
      if (listSortOrder === 'release_asc') {
        return (a.releaseDate || '').localeCompare(b.releaseDate || '');
      }
      return a.albumName.localeCompare(b.albumName, 'ko');
    });
  }, [cards, listSearchQuery, listGenreFilter, listCountryFilter, listSortOrder]);

  const filteredAlbums = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return allAlbums;
    return allAlbums.filter(
      (a) =>
        a.album_name.toLowerCase().includes(q) ||
        (a.artist ?? '').toLowerCase().includes(q),
    );
  }, [allAlbums, pickerQuery]);

  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex flex-nowrap items-center justify-between gap-2">
        <h1 className="page-title flex min-w-0 flex-1 items-center gap-2">
          <BookOpen className="size-6 shrink-0 opacity-80 sm:size-7" strokeWidth={1.5} />
          <span className="truncate">Lyrics</span>
        </h1>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => void openPicker()}
            className="btn-apple inline-flex h-[42px] shrink-0 items-center gap-1.5 px-3 text-sm font-semibold"
          >
            <Plus className="size-4" strokeWidth={2} />
            가사 등록
          </button>
        ) : null}
      </div>

      {!loading && cards.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 w-full sm:w-[320px] sm:max-w-full">
            <input
              className="input-apple h-[38px] w-full px-3 py-2 pr-8 text-sm"
              placeholder="앨범명, 아티스트 검색..."
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
            />
            {listSearchQuery ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
                onClick={() => setListSearchQuery('')}
                title="검색어 지우기"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            ) : null}
          </div>
          <select
            className="select-apple h-[38px] px-3 py-2 text-sm"
            value={listGenreFilter}
            onChange={(e) => setListGenreFilter(e.target.value)}
            aria-label="장르 필터"
          >
            <option value="전체">장르: 전체</option>
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className="select-apple h-[38px] px-3 py-2 text-sm"
            value={listCountryFilter}
            onChange={(e) => setListCountryFilter(e.target.value)}
            aria-label="국가 필터"
          >
            <option value="전체">국가: 전체</option>
            {countryOptions.map((c) => (
              <option key={c.name} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <select
            className="select-apple h-[38px] px-3 py-2 text-sm"
            value={listSortOrder}
            onChange={(e) => setListSortOrder(e.target.value)}
            aria-label="정렬"
          >
            <option value="latest">최신 등록순</option>
            <option value="release_desc">발매일 최신순</option>
            <option value="release_asc">발매일 과거순</option>
          </select>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="size-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="empty-state-apple py-16 text-center">
          <p>{cards.length === 0 ? '트랙리스트가 등록된 앨범이 없습니다.' : '검색·필터 조건에 맞는 앨범이 없습니다.'}</p>
          {cards.length === 0 ? (
            <p className="mt-2 text-sm opacity-70">상단의 &apos;가사 등록&apos;으로 앨범을 선택해 시작하세요.</p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredCards.map((card) => (
            <button
              key={card.albumId}
              type="button"
              className="group cursor-pointer text-left"
              onClick={() => router.push(`/lyrics/${card.albumId}`)}
            >
              <div
                className="relative mb-3 aspect-square overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                {card.coverImageUrl ? (
                  <img src={card.coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-xs opacity-50"
                    style={{ background: 'var(--badge-bg)' }}
                  >
                    No Cover
                  </div>
                )}
              </div>
              <p className="truncate text-sm font-bold leading-tight">{card.albumName}</p>
              <p className="mt-0.5 line-clamp-2 break-words text-xs leading-snug opacity-60">
                {[
                  `${card.country ? `${countryOptions.find((c) => c.name === card.country)?.flag || ''} ` : ''}${card.artist || '-'}`.trim(),
                  card.releaseDate ? card.releaseDate.substring(0, 4) : null,
                  card.genre1 ? card.genre1.toUpperCase() : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 text-[11px] opacity-55">
                가사 {card.translatedCount}/{card.trackCount}곡
              </p>
            </button>
          ))}
        </div>
      )}

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="닫기"
            onClick={() => setPickerOpen(false)}
          />
          <div
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-bold">앨범 선택</h2>
              <button type="button" onClick={() => setPickerOpen(false)} className="rounded-lg p-1.5 hover:opacity-80" aria-label="닫기">
                <X className="size-5" />
              </button>
            </div>
            <div className="relative px-4 py-3">
              <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 opacity-45" />
              <input
                className="input-apple h-[40px] w-full py-2 pl-9 pr-3 text-sm"
                placeholder="앨범·아티스트 검색"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {pickerLoading ? (
                <p className="px-3 py-8 text-center text-sm opacity-60">불러오는 중...</p>
              ) : filteredAlbums.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm opacity-60">검색 결과가 없습니다.</p>
              ) : (
                filteredAlbums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:opacity-90"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => {
                      setPickerOpen(false);
                      router.push(`/lyrics/${album.id}`);
                    }}
                  >
                    <div
                      className="size-12 shrink-0 overflow-hidden rounded-lg"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{album.album_name}</p>
                      <p className="truncate text-xs opacity-60">{album.artist || '-'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
