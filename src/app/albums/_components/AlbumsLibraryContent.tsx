'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Disc, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import {
  searchMusicBrainz,
} from '../actions';
import { useAlbumMutations, enqueueNewAlbumIntroGeneration } from '../_hooks/useAlbumMutations';
import { AlbumList } from './AlbumList';
import { AlbumMoodboard } from './AlbumMoodboard';
import { AlbumGenreboard } from './AlbumGenreboard';
import type { LibraryViewMode } from './albumBoardShared';
import { MoodRecommendModal } from './MoodRecommendModal';
import { MusicTasteModal, type TasteResult } from './MusicTasteModal';
import { AlbumSearchSection } from './AlbumSearchSection';
import { AlbumForm } from './AlbumForm';
import { AlbumDetailModal } from './AlbumDetailModal';
import { HeadfiDetailModal } from '@/app/headfi/_components/HeadfiDetailModal';
import type { Headfi } from '@/app/headfi/types';
import { useAlbumFilters } from '../_hooks/useAlbumFilters';
import type { Album, AlbumFormData, MusicBrainzSearchItem, SelectedAlbum } from '../types';

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
  const { isSaving, isDeleting, albumIntroLoading, saveAlbum, deleteAlbum, refreshAlbumIntro } =
    useAlbumMutations({ isAuthenticated });
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>('list');
  const [library, setLibrary] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    listSearchQuery,
    setListSearchQuery,
    listYearFilter,
    setListYearFilter,
    listGenreFilter,
    setListGenreFilter,
    listCountryFilter,
    setListCountryFilter,
    listSortOrder,
    setListSortOrder,
    listCurrentPage,
    setListCurrentPage,
    dynamicYearOptions,
    yearLotteryPool,
    paginatedLibrary,
    totalFilteredCount,
    listTotalPages,
  } = useAlbumFilters(library);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicBrainzSearchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedAlbum | null>(null);
  const [formData, setFormData] = useState<AlbumFormData>(initialFormData);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [mbCurrentPage, setMbCurrentPage] = useState(1);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [viewingItem, setViewingItem] = useState<Album | null>(null);
  const [viewingHeadfi, setViewingHeadfi] = useState<Headfi | null>(null);
  const [registeredAlbums, setRegisteredAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[]
  >([]);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [aiRecommendedHeadphones, setAiRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
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
    const g = searchParams.get('genre');
    if (m?.trim()) setLibraryViewMode('moodboard');
    else if (g?.trim()) setLibraryViewMode('genreboard');
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
    const ids = (viewingItem.manual_recommended_headphone_ids ?? []).slice(0, 2);
    if (ids.length === 0) {
      setRecommendedHeadphones([]);
      return;
    }
    const client = createClient();
    client
      .from('headfi')
      .select('id, brand, model, image_url')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((h) => h.id === id))
          .filter(
            (h): h is { id: number; brand: string; model: string; image_url: string | null } => !!h,
          )
          .map((h) => ({
            id: h.id,
            brand: h.brand || '',
            model: h.model || '',
            image_url: h.image_url ?? null,
          }));
        setRecommendedHeadphones(ordered);
      });
  }, [viewingItem?.id, viewingItem?.manual_recommended_headphone_ids, viewingItem?.audio_tags]);

  useEffect(() => {
    if (!viewingItem?.id) {
      setAiRecommendedHeadphones([]);
      return;
    }
    const ids = viewingItem.ai_recommended_headphone_ids ?? [];
    if (ids.length === 0) {
      setAiRecommendedHeadphones([]);
      return;
    }
    const client = createClient();
    client
      .from('headfi')
      .select('id, brand, model, image_url')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((h) => h.id === id))
          .filter(
            (h): h is { id: number; brand: string; model: string; image_url: string | null } => !!h,
          )
          .map((h) => ({
            id: h.id,
            brand: h.brand || '',
            model: h.model || '',
            image_url: h.image_url ?? null,
          }));
        setAiRecommendedHeadphones(ordered);
      });
  }, [viewingItem?.id, viewingItem?.ai_recommended_headphone_ids]);

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

  const mbTotalPages = Math.ceil(totalResults / ITEMS_PER_PAGE) || 1;

  const handleSearch = async (page = 1, searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    if (searchQuery != null) setQuery(searchQuery);
    setHasSearched(true);
    setIsSearching(true);
    try {
      const result = await searchMusicBrainz(q, page, ITEMS_PER_PAGE);
      if (result.error) {
        toast.error(result.error);
        return;
      }
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

  const openHeadfiById = useCallback(async (id: number) => {
    const { data, error } = await createClient().from('headfi').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast.error('기기 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingHeadfi(data as Headfi);
  }, []);

  const openAlbumById = useCallback(
    async (albumId: number) => {
      const cached = library.find((a) => a.id === albumId);
      if (cached) {
        openAlbumDetail(cached);
        return;
      }
      const { data, error } = await createClient().from('album').select('*').eq('id', albumId).maybeSingle();
      if (error || !data) {
        toast.error('앨범 정보를 불러오지 못했습니다.');
        return;
      }
      openAlbumDetail(data as Album);
    },
    [library],
  );

  const albumParam = searchParams.get('album');

  useEffect(() => {
    if (!albumParam || isLoading) return;
    const albumId = parseInt(albumParam, 10);
    if (!Number.isFinite(albumId)) return;
    if (viewingItem?.id === albumId) return;
    void openAlbumById(albumId);
  }, [albumParam, isLoading, openAlbumById, viewingItem?.id]);

  useEffect(() => {
    if (!viewingHeadfi?.id) {
      setRegisteredAlbums([]);
      return;
    }
    const id = viewingHeadfi.id;
    void createClient()
      .from('album')
      .select('id, album_name, artist, cover_image_url, release_date')
      .contains('manual_recommended_headphone_ids', [id])
      .then(({ data }) => {
        const rows = data || [];
        rows.sort(
          (a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
        );
        setRegisteredAlbums(rows);
      });
  }, [viewingHeadfi?.id]);

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
    if (!viewingItem) return;
    await refreshAlbumIntro({
      album: viewingItem,
      assignMood: true,
      onUpdated: (updated, tags) => {
        setViewingItem(updated);
        setLibrary((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setAudioTags(tags);
      },
      onMoodAssigned: (albumId, moodName) => {
        setViewingItem((prev) => (prev?.id === albumId ? { ...prev, mood_name: moodName } : prev));
        setLibrary((prev) =>
          prev.map((a) => (a.id === albumId ? { ...a, mood_name: moodName } : a)),
        );
      },
    });
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
    const mids = (item.manual_recommended_headphone_ids ?? []).slice(0, 2);
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
      recommended_hp3: '',
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
    if (!selectedItem) return;
    const updateId =
      'id' in selectedItem && typeof selectedItem.id === 'number' ? selectedItem.id : null;
    const result = await saveAlbum({
      formItem: selectedItem,
      formData,
      createSuccessMessage: '앨범이 라이브러리에 등록되었습니다.',
    });
    if (result.status === 'skipped' || result.status === 'error') return;

    setSelectedItem(null);
    handleClearSearch();
    await fetchLibrary(true);

    if (result.status === 'updated' && updateId != null && result.album) {
      setLibrary((prev) => prev.map((a) => (a.id === updateId ? result.album! : a)));
      setViewingItem((prev) => (prev?.id === updateId ? result.album! : prev));
    }

    if (result.status === 'created') {
      let savedNewId: number | undefined;
      if (result.saved && typeof result.saved === 'object' && 'id' in result.saved) {
        savedNewId = (result.saved as { id: number }).id;
      }
      if (savedNewId != null) {
        enqueueNewAlbumIntroGeneration(savedNewId, () => {
          void fetchLibrary(true);
        });
      }
    }
  };

  const handleDeleteFromForm = async () => {
    if (!selectedItem || !('id' in selectedItem) || typeof selectedItem.id !== 'number') return;
    const deleted = await deleteAlbum({ albumId: selectedItem.id });
    if (!deleted) return;
    setSelectedItem(null);
    setViewingItem(null);
    await fetchLibrary(true);
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
    if (!viewingItem) return;
    const deleted = await deleteAlbum({ albumId: viewingItem.id });
    if (!deleted) return;
    setViewingItem(null);
    await fetchLibrary(true);
  };

  return (
    <div className="relative min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2">
          <Disc className="size-7 opacity-80 shrink-0" strokeWidth={1.5} /> Albums
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/albums/stats"
            className="btn-apple btn-apple-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <BarChart3 className="size-4" strokeWidth={1.5} />
            앨범 통계
          </Link>
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
            />
          ) : libraryViewMode === 'genreboard' ? (
            <AlbumGenreboard
              library={library}
              onAlbumClick={openAlbumDetail}
              viewMode={libraryViewMode}
              onViewModeChange={setLibraryViewMode}
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
          aiRecommendedHeadphones={aiRecommendedHeadphones}
          albumIntro={(viewingItem.album_intro ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={closeAlbumDetail}
          onEdit={handleEditClick}
          onDelete={handleDeleteFromModal}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
          onNavigateToMood={navigateToMood}
          onAlbumPatch={(updated) => {
            setViewingItem(updated);
            setLibrary((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }}
          onHeadfiClick={(id) => void openHeadfiById(id)}
        />
      )}

      {viewingHeadfi ? (
        <HeadfiDetailModal
          viewingItem={viewingHeadfi}
          registeredAlbums={registeredAlbums}
          matchedMatchingDevice={null}
          matchedHeadphones={[]}
          onClose={() => setViewingHeadfi(null)}
          onEdit={() => {
            const id = viewingHeadfi.id;
            setViewingHeadfi(null);
            router.push(`/headfi?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 헤드파이 화면에서 진행해 주세요.')}
          onHeadfiPatch={(patch) => setViewingHeadfi((v) => (v ? { ...v, ...patch } : null))}
          onAlbumClick={(id) => void openAlbumById(id)}
          isAuthenticated={isAuthenticated}
        />
      ) : null}
    </div>
  );
}
