'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Disc, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import {
  deleteAlbumFromDB,
  saveAlbumToDB,
  searchMusicBrainz,
  updateAlbumInDB,
} from '../actions';
import { AlbumList } from './AlbumList';
import { AlbumMoodboard } from './AlbumMoodboard';
import { MoodRecommendModal } from './MoodRecommendModal';
import { MusicTasteModal, type TasteResult } from './MusicTasteModal';
import { AlbumSearchSection } from './AlbumSearchSection';
import { AlbumForm } from './AlbumForm';
import { AlbumDetailModal } from './AlbumDetailModal';
import type { Album, AlbumFormData, MusicBrainzSearchItem, SelectedAlbum } from '../types';
import { albumMatchesLotteryYearFilter, albumMatchesYearFilter, buildDynamicYearOptions } from '../utils';

const ITEMS_PER_PAGE = 20;
const inputBaseClass = 'input-apple px-3 py-2 w-full h-[42px]';

const initialFormData: AlbumFormData = {
  artist: '',
  artist_type: '',
  country: '',
  album_name: '',
  album_type: '',
  year: ['2026'],
  release_date: '',
  genre1: '',
  genre2: '',
  cover_image_url: '',
  matching1: '',
  matching2: '',
  title_song_url: '',
  wiki_url: '',
  album_intro: '',
  recommended_hp1: '',
  recommended_hp2: '',
  recommended_hp3: '',
  mood_names: [],
};

function formYearsFromAlbum(year: Album['year']): string[] {
  if (year == null) return ['2026'];
  if (Array.isArray(year)) return year.length > 0 ? [...year] : ['2026'];
  const s = String(year).trim();
  return s ? [s] : ['2026'];
}

export function AlbumsLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthState();
  const [libraryViewMode, setLibraryViewMode] = useState<'list' | 'moodboard'>('list');
  const [library, setLibrary] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listYearFilter, setListYearFilter] = useState('');
  const [listGenreFilter, setListGenreFilter] = useState('전체');
  const [listCountryFilter, setListCountryFilter] = useState('전체');
  const [listSortOrder, setListSortOrder] = useState('release_desc');
  const [listCurrentPage, setListCurrentPage] = useState(1);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicBrainzSearchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedAlbum | null>(null);
  const [formData, setFormData] = useState<AlbumFormData>(initialFormData);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [mbCurrentPage, setMbCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [viewingItem, setViewingItem] = useState<Album | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [tasteModalOpen, setTasteModalOpen] = useState(false);
  const [tasteResult, setTasteResult] = useState<TasteResult | null>(null);
  const [tasteLoading, setTasteLoading] = useState(false);

  const fetchLibrary = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const client = createClient();
      const { data } = await client.from('album').select('*').order('created_at', { ascending: false });
      setLibrary((data as Album[]) || []);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    const m = searchParams.get('mood');
    if (m?.trim()) setLibraryViewMode('moodboard');
  }, [searchParams]);

  useEffect(() => {
    setViewingItem((prev) => {
      if (!prev) return prev;
      const fresh = library.find((a) => a.id === prev.id);
      return fresh ? { ...prev, ...fresh } : prev;
    });
  }, [library]);

  useEffect(() => {
    if (!viewingItem?.id) {
      setRecommendedHeadphones([]);
      setAudioTags([]);
      return;
    }
    setAudioTags(viewingItem.audio_tags ?? []);
    const ids = viewingItem.manual_recommended_headphone_ids ?? [];
    if (ids.length === 0) {
      setRecommendedHeadphones([]);
      return;
    }
    const client = createClient();
    client
      .from('headfi')
      .select('id, brand, model')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((h) => h.id === id))
          .filter((h): h is { id: number; brand: string; model: string } => !!h);
        setRecommendedHeadphones(ordered);
      });
  }, [viewingItem?.id, viewingItem?.manual_recommended_headphone_ids, viewingItem?.audio_tags]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model')
      .eq('category', '헤드폰')
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) => {
        setHeadfiOwnedHeadphones(
          (data || []).map((r) => ({
            id: r.id,
            brand: r.brand || '',
            model: r.model || '',
          })),
        );
      });
  }, [isAuthenticated]);

  const dynamicYearOptions = useMemo(() => buildDynamicYearOptions(library), [library]);

  useEffect(() => {
    if (dynamicYearOptions.length === 0) {
      setListYearFilter('');
      return;
    }
    setListYearFilter((prev) => {
      if (prev && dynamicYearOptions.includes(prev)) return prev;
      return dynamicYearOptions[0];
    });
  }, [dynamicYearOptions]);

  useEffect(() => {
    setListCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listSearchQuery, listYearFilter, listGenreFilter, listCountryFilter, listSortOrder]);

  const listFilterCommon = useCallback(
    (item: Album) => {
      const matchesGenre = listGenreFilter === '전체' || item.genre1 === listGenreFilter;
      const matchesCountry = listCountryFilter === '전체' || item.country === listCountryFilter;
      const lowerQuery = listSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !lowerQuery ||
        (item.album_name && item.album_name.toLowerCase().includes(lowerQuery)) ||
        (item.artist && item.artist.toLowerCase().includes(lowerQuery)) ||
        (item.genre2 && item.genre2.toLowerCase().includes(lowerQuery));
      return matchesGenre && matchesCountry && matchesSearch;
    },
    [listGenreFilter, listCountryFilter, listSearchQuery],
  );

  const filteredLibrary = useMemo(
    () =>
      library.filter(
        (item) => albumMatchesYearFilter(item, listYearFilter) && listFilterCommon(item),
      ),
    [library, listYearFilter, listFilterCommon],
  );

  const yearLotteryPool = useMemo(
    () => library.filter((item) => albumMatchesLotteryYearFilter(item, listYearFilter)),
    [library, listYearFilter],
  );

  const sortedLibrary = useMemo(
    () =>
      [...filteredLibrary].sort((a, b) => {
        if (listSortOrder === 'release_desc') {
          return (b.release_date || '').localeCompare(a.release_date || '');
        }
        if (listSortOrder === 'release_asc') {
          return (a.release_date || '').localeCompare(b.release_date || '');
        }
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }),
    [filteredLibrary, listSortOrder],
  );

  const totalFilteredCount = sortedLibrary.length;
  const listTotalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE) || 1;
  const listStartIndex = (listCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLibrary = sortedLibrary.slice(listStartIndex, listStartIndex + ITEMS_PER_PAGE);
  const mbTotalPages = Math.ceil(totalResults / ITEMS_PER_PAGE) || 1;

  const handleSearch = async (page = 1, searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    if (searchQuery != null) setQuery(searchQuery);
    setHasSearched(true);
    setIsSearching(true);
    try {
      const result = await searchMusicBrainz(q, page, ITEMS_PER_PAGE);
      setSearchResults(result.items || []);
      setTotalResults(result.total || 0);
      setMbCurrentPage(page);
    } catch {
      toast.error('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setHasSearched(false);
  };

  const handleManualRegister = () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setSelectedItem({ isManual: true });
    setFormData(initialFormData);
  };

  const handleSelectAlbum = (album: MusicBrainzSearchItem) => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setSelectedItem(album);
    setFormData({
      ...initialFormData,
      album_name: album.album_name || '',
      artist: album.artist || '',
      release_date: album.release_date || '',
      album_type: album.album_type || '',
      cover_image_url: album.cover_image_url || '',
      wiki_url: '',
      year: ['2026'],
      mood_names: [],
    });
  };

  const openAlbumDetail = (item: Album) => {
    setViewingItem(item);
  };

  const closeAlbumDetail = () => {
    setViewingItem(null);
    void fetchLibrary(true);
  };

  const navigateToMood = (moodName: string) => {
    setViewingItem(null);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('view');
    sp.set('mood', moodName);
    router.replace(`/albums?${sp.toString()}`);
    setLibraryViewMode('moodboard');
  };

  const handleRefreshAlbumIntro = async () => {
    if (!viewingItem || isAuthenticated === false) return;
    setAlbumIntroLoading(true);
    try {
      const res = await fetch('/api/album-intro', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: viewingItem.id }),
      });
      let payload: { error?: string; audio_tags?: string[]; album_intro?: string } = {};
      try {
        payload = await res.json();
      } catch {
        throw new Error('응답을 읽을 수 없습니다.');
      }
      if (!res.ok) throw new Error(payload.error ?? 'Generation failed');
      const updated: Album = {
        ...viewingItem,
        audio_tags: payload.audio_tags ?? [],
        album_intro: payload.album_intro ?? '',
        ai_recommended_headphone_ids: null,
        ai_recommended_headphone_reason: null,
      };
      setViewingItem(updated);
      setLibrary((prev) => prev.map((a) => (a.id === viewingItem.id ? updated : a)));
      setAudioTags(payload.audio_tags ?? []);
      toast.success('앨범 소개와 태그를 갱신했습니다.');
      const albumId = viewingItem.id;
      void fetch('/api/album-mood-assign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId }),
      })
        .then(async (assignRes) => {
          if (!assignRes.ok) return;
          const client = createClient();
          const { data: moodRow } = await client
            .from('album')
            .select('mood_name')
            .eq('id', albumId)
            .maybeSingle();
          const moodName =
            moodRow && typeof (moodRow as { mood_name?: unknown }).mood_name === 'string'
              ? String((moodRow as { mood_name: string }).mood_name).trim() || null
              : null;
          if (!moodName) return;
          setViewingItem((prev) => (prev?.id === albumId ? { ...prev, mood_name: moodName } : prev));
          setLibrary((prev) =>
            prev.map((a) => (a.id === albumId ? { ...a, mood_name: moodName } : a)),
          );
        })
        .catch(() => {});
    } catch {
      toast.error('앨범 소개 갱신에 실패했습니다.');
    } finally {
      setAlbumIntroLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!viewingItem) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingItem;
    setViewingItem(null);
    setSelectedItem(item);
    const mids = item.manual_recommended_headphone_ids ?? [];
    setFormData({
      artist: item.artist ?? '',
      artist_type: item.artist_type ?? '',
      country: item.country ?? '',
      album_name: item.album_name ?? '',
      album_type: item.album_type ?? '',
      year: formYearsFromAlbum(item.year),
      release_date: item.release_date ?? '',
      genre1: item.genre1 ?? '',
      genre2: item.genre2 ?? '',
      cover_image_url: item.cover_image_url ?? '',
      matching1: item.matching1 ?? '',
      matching2: item.matching2 ?? '',
      title_song_url: item.title_song_url ?? '',
      wiki_url: item.wiki_url ?? '',
      album_intro: item.album_intro ?? item.ai_recommended_headphone_reason ?? '',
      recommended_hp1: mids[0] != null ? String(mids[0]) : '',
      recommended_hp2: mids[1] != null ? String(mids[1]) : '',
      recommended_hp3: mids[2] != null ? String(mids[2]) : '',
      mood_names: Array.isArray(item.mood_names) ? [...item.mood_names] : [],
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!selectedItem) return;
    setIsSaving(true);

    const updateId =
      'id' in selectedItem && typeof selectedItem.id === 'number' ? selectedItem.id : null;
    const data = {
      ...formData,
      matching1: formData.matching1 === ' ' ? '' : formData.matching1,
      matching2: formData.matching2 === ' ' ? '' : formData.matching2,
    };

    let savedNewId: number | undefined;

    try {
      if (updateId != null) {
        await updateAlbumInDB(updateId, data);
        toast.success('앨범 정보가 수정되었습니다.');
      } else {
        const saved = await saveAlbumToDB(data);
        toast.success('앨범이 라이브러리에 등록되었습니다.');
        if (saved && typeof saved === 'object' && 'id' in saved) {
          savedNewId = (saved as { id: number }).id;
        }
      }
      const savedId = updateId;
      setSelectedItem(null);
      handleClearSearch();
      await fetchLibrary(true);
      if (savedId != null) {
        const client = createClient();
        const { data: updatedRow } = await client.from('album').select('*').eq('id', savedId).single();
        if (updatedRow) {
          const updated = updatedRow as Album;
          setLibrary((prev) => prev.map((a) => (a.id === savedId ? updated : a)));
          setViewingItem((prev) => (prev?.id === savedId ? updated : prev));
        }
      }
    } catch (e) {
      const message = e instanceof Error && e.message === 'Unauthorized'
        ? '로그인이 필요합니다.'
        : '저장 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }

    if (savedNewId != null) {
      const newAlbumId = savedNewId;
      void fetch('/api/album-intro', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: newAlbumId }),
      })
        .then((res) => {
          if (!res.ok) {
            toast.error('앨범 소개 자동 생성에 실패했습니다. 나중에 새로고침으로 다시 시도할 수 있어요.');
            return null;
          }
          toast.success('앨범 소개와 태그가 생성되었습니다.');
          return fetch('/api/album-mood-assign', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ albumId: newAlbumId }),
          });
        })
        .then(() => {
          void fetchLibrary(true);
        })
        .catch(() => {
          toast.error('앨범 소개 자동 생성에 실패했습니다. 나중에 새로고침으로 다시 시도할 수 있어요.');
        });
    }
  };

  const handleDeleteFromForm = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!selectedItem || !('id' in selectedItem) || typeof selectedItem.id !== 'number') return;
    if (!confirm('정말 이 앨범을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      await deleteAlbumFromDB(selectedItem.id);
      toast.success('앨범이 삭제되었습니다.');
      setSelectedItem(null);
      setViewingItem(null);
      await fetchLibrary(true);
    } catch (e) {
      const message = e instanceof Error && e.message === 'Unauthorized'
        ? '로그인이 필요합니다.'
        : '삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyzeTaste = async () => {
    if (library.length === 0) {
      toast.error('등록된 앨범이 없어 취향 분석을 할 수 없습니다.');
      return;
    }
    setTasteModalOpen(true);
    setTasteLoading(true);
    setTasteResult(null);
    try {
      const res = await fetch('/api/analyze-music-taste');
      let data: TasteResult & { error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('parse');
      }
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('등록된 앨범이 없어 취향 분석을 할 수 없습니다.');
        } else {
          toast.error('취향 분석에 실패했습니다.');
        }
        setTasteResult(null);
        return;
      }
      setTasteResult(data);
    } catch {
      toast.error('취향 분석에 실패했습니다.');
      setTasteResult(null);
    } finally {
      setTasteLoading(false);
    }
  };

  const handleDeleteFromModal = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!viewingItem) return;
    if (!confirm('정말 이 앨범을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      await deleteAlbumFromDB(viewingItem.id);
      toast.success('앨범이 삭제되었습니다.');
      setViewingItem(null);
      await fetchLibrary(true);
    } catch (e) {
      const message = e instanceof Error && e.message === 'Unauthorized'
        ? '로그인이 필요합니다.'
        : '삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2">
          <Disc className="size-7 opacity-80 shrink-0" strokeWidth={1.5} /> Albums
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMoodModalOpen(true)}
            className="btn-apple btn-apple-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <span>🎵</span>
            기분 추천
          </button>
          <button
            type="button"
            onClick={() => void handleAnalyzeTaste()}
            className="btn-apple btn-apple-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Sparkles className="size-4" strokeWidth={1.5} />
            취향 분석
          </button>
        </div>
      </div>

      {isAuthenticated && (
        <AlbumSearchSection
          query={query}
          setQuery={setQuery}
          albums={searchResults}
          hasSearched={hasSearched}
          isSearching={isSearching}
          totalResults={totalResults}
          currentPage={mbCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          mbTotalPages={mbTotalPages}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onManualRegister={handleManualRegister}
          onSelectAlbum={handleSelectAlbum}
          isAuthenticated={isAuthenticated}
          inputBaseClass={inputBaseClass}
        />
      )}

      {selectedItem && (
        <AlbumForm
          selectedItem={selectedItem}
          formData={formData}
          setFormData={setFormData}
          headfiOwnedHeadphones={headfiOwnedHeadphones}
          onClose={() => setSelectedItem(null)}
          onSave={handleSave}
          onDelete={'id' in selectedItem && typeof selectedItem.id === 'number' ? handleDeleteFromForm : undefined}
          onImageUpload={handleImageUpload}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--foreground)',
            }}
          />
        </div>
      ) : (
        <div className={`${isAuthenticated ? 'mt-8 pt-8 border-t-2' : ''}`} style={{ borderColor: 'var(--border)' }}>
          {libraryViewMode === 'moodboard' ? (
            <AlbumMoodboard
              library={library}
              onAlbumClick={openAlbumDetail}
              viewMode={libraryViewMode}
              onViewModeChange={setLibraryViewMode}
              isAuthenticated={isAuthenticated === true}
              selectedYearLabel={listYearFilter}
            />
          ) : library.length === 0 ? (
            <div className="empty-state-apple text-center py-12">
              <p>등록된 앨범이 없습니다.</p>
            </div>
          ) : (
            <AlbumList
              yearOptions={dynamicYearOptions}
              lotteryPool={yearLotteryPool}
              paginatedLibrary={paginatedLibrary}
              listSearchQuery={listSearchQuery}
              setListSearchQuery={setListSearchQuery}
              listYearFilter={listYearFilter}
              setListYearFilter={setListYearFilter}
              listGenreFilter={listGenreFilter}
              setListGenreFilter={setListGenreFilter}
              listCountryFilter={listCountryFilter}
              setListCountryFilter={setListCountryFilter}
              listSortOrder={listSortOrder}
              setListSortOrder={setListSortOrder}
              listCurrentPage={listCurrentPage}
              setListCurrentPage={setListCurrentPage}
              totalFilteredCount={totalFilteredCount}
              listTotalPages={listTotalPages}
              onItemClick={openAlbumDetail}
              onGenreLabelClick={(genre) => {
                setListGenreFilter(genre);
                setListCurrentPage(1);
              }}
              onSubGenreLabelClick={(subGenre) => {
                setListSearchQuery(subGenre);
                setListCurrentPage(1);
              }}
              libraryViewMode={libraryViewMode}
              onLibraryViewModeChange={setLibraryViewMode}
            />
          )}
        </div>
      )}

      {tasteModalOpen && (
        <MusicTasteModal
          result={tasteResult}
          isLoading={tasteLoading}
          onClose={() => setTasteModalOpen(false)}
        />
      )}

      {moodModalOpen && (
        <MoodRecommendModal
          onClose={() => setMoodModalOpen(false)}
          onAlbumClick={(albumId) => {
            const album = library.find((a) => a.id === albumId);
            if (album) openAlbumDetail(album);
          }}
        />
      )}

      {viewingItem && (
        <AlbumDetailModal
          viewingItem={viewingItem}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={(viewingItem.album_intro ?? viewingItem.ai_recommended_headphone_reason ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={closeAlbumDetail}
          onEdit={handleEditClick}
          onDelete={handleDeleteFromModal}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
          onNavigateToMood={navigateToMood}
        />
      )}
    </div>
  );
}
