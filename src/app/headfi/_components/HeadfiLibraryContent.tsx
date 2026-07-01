'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart2, Headphones, Map, Music, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import type { Album } from '@/app/albums/types';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { saveHeadfiToDB, updateHeadfiInDB, deleteHeadfiFromDB, uploadHeadfiFrGraphImage } from '../actions';
import { DAC_AMP_DAP_CATEGORIES, isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import { isPositionMapCategory } from '@/lib/headfiPosition';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { Headfi, SelectedHeadfi } from '../types';
import { HeadfiMatchScoreModal } from './HeadfiMatchScoreModal';
import { HeadfiSpendingStatsModal } from './HeadfiSpendingStatsModal';
import { HeadfiForm } from './HeadfiForm';
import { HeadfiDetailModal } from './HeadfiDetailModal';
import { HeadfiList } from './HeadfiList';

const initialFormData = {
  brand: '',
  model: '',
  category: '',
  type1: '',
  type2: '',
  impedance: '',
  db1: '',
  db2: '',
  volume: '',
  volume_type: '',
  purchase_date: '',
  price: '',
  status1: '',
  status2: '',
  cable: '',
  cable_price: '',
  eartip: '',
  eartip_price: '',
  accessory: '',
  accessory_price: '',
  unit: '',
  etc: '',
  speaker_type1: '',
  speaker_type2: '',
  dap_spec: '',
  dap_output: '',
  matching: '',
  gain: '',
  temp: '',
  bright: '',
  bass_quantity: '',
  bass_depth: '',
  bass_speed: '',
  dynamics_slam: '',
  midrange_body: '',
  tone_warmth: '',
  vocal_position: '',
  midrange_clarity: '',
  treble_brightness: '',
  treble_smoothness: '',
  treble_airiness: '',
  resolution: '',
  separation: '',
  soundstage: '',
  imaging: '',
  timbre: '',
  memo: '',
  image_url: '',
  fr_graph_url: '',
  amp_type: '',
  output_impedance: '',
  chipset: '',
  vrms_bal: '',
  vrms_single: '',
};

type ListSortOption = 'created_desc' | 'created_asc' | 'purchase_desc' | 'purchase_asc';

const ITEMS_PER_PAGE = 20;

function normalizeFormData(item: Headfi | null) {
  const safeItem = item || {};
  const normalizedEntries = Object.entries(safeItem).map(([key, value]) => {
    if (value === null || value === undefined) return [key, ''];
    if (typeof value === 'number') return [key, String(value)];
    return [key, value];
  });
  return { ...initialFormData, ...Object.fromEntries(normalizedEntries) };
}

export function HeadfiLibraryContent() {
  const [library, setLibrary] = useState<Headfi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedHeadfi | null>(null);
  const [viewingItem, setViewingItem] = useState<Headfi | null>(null);
  const isAuthenticated = useAuthState();
  const [formData, setFormData] = useState(initialFormData);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listCategoryFilter, setListCategoryFilter] = useState('전체');
  const [listStatusFilter, setListStatusFilter] = useState('전체');
  const [listType1Filter, setListType1Filter] = useState('전체');
  const [listType2Filter, setListType2Filter] = useState('전체');
  const [listSortOption, setListSortOption] = useState<ListSortOption>('purchase_desc');
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [spendingModalOpen, setSpendingModalOpen] = useState(false);

  const [registeredAlbums, setRegisteredAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[]
  >([]);
  const [dacAmpList, setDacAmpList] = useState<{ id: number; brand: string; model: string }[]>([]);
  const [wirelessMatchingList, setWirelessMatchingList] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{ id: number; brand: string; model: string } | null>(
    null,
  );
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string; image_url?: string | null }[]
  >([]);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);

  const openAlbumById = useCallback(async (albumId: number) => {
    const { data, error } = await createClient().from('album').select('*').eq('id', albumId).maybeSingle();
    if (error || !data) {
      toast.error('앨범 정보를 불러오지 못했습니다.');
      return;
    }
    setViewingAlbum(data as Album);
  }, []);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createClient();
      const { data } = await client.from('headfi').select('*').order('created_at', { ascending: false });
      setLibrary((data as Headfi[]) || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model')
      .in('category', [...DAC_AMP_DAP_CATEGORIES])
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setDacAmpList((data || []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' }))),
      );
    client
      .from('headfi')
      .select('id,brand,model')
      .eq('category', '기타')
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setWirelessMatchingList(
          (data || []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
        ),
      );
  }, [library]);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    const statusFromUrl = searchParams.get('status');
    const sortFromUrl = searchParams.get('sort');
    if (categoryFromUrl) setListCategoryFilter(categoryFromUrl);
    if (statusFromUrl) setListStatusFilter(statusFromUrl);
    if (
      sortFromUrl === 'created_desc' ||
      sortFromUrl === 'created_asc' ||
      sortFromUrl === 'purchase_desc' ||
      sortFromUrl === 'purchase_asc'
    ) {
      setListSortOption(sortFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setListCurrentPage(1);
    if (listCategoryFilter !== '헤드폰') {
      setListType1Filter('전체');
      setListType2Filter('전체');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listSearchQuery, listCategoryFilter, listStatusFilter, listType1Filter, listType2Filter, listSortOption]);

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (!viewId || !library.length) return;
    const item = library.find((i) => String(i.id) === viewId);
    if (item) setViewingItem(item);
  }, [searchParams, library]);

  useEffect(() => {
    if (!viewingItem?.id) return;
    const updated = library.find((i) => i.id === viewingItem.id);
    if (updated) {
      setViewingItem((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    }
  }, [library, viewingItem?.id]);

  useEffect(() => {
    if (!viewingItem?.id) {
      setRegisteredAlbums([]);
      return;
    }
    const client = createClient();
    const id = viewingItem.id;
    void client
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
  }, [viewingItem?.id]);

  useEffect(() => {
    if (
      !viewingItem ||
      !['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'].includes(viewingItem.category)
    ) {
      setMatchedMatchingDevice(null);
      return;
    }
    const m = viewingItem.matching;
    if (!m || m === ' ' || !/^\d+$/.test(String(m))) {
      setMatchedMatchingDevice(null);
      return;
    }
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model')
      .eq('id', Number(m))
      .single()
      .then(({ data }) => {
        setMatchedMatchingDevice(data ? { id: data.id, brand: data.brand || '', model: data.model || '' } : null);
      });
  }, [viewingItem?.id, viewingItem?.category, viewingItem?.matching]);

  useEffect(() => {
    if (!viewingItem?.id || !isDacAmpDapCategory(viewingItem.category)) {
      setMatchedHeadphones([]);
      return;
    }
    const idStr = String(viewingItem.id);
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model,category,image_url')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', idStr)
      .order('brand')
      .order('model')
      .then(({ data }) => setMatchedHeadphones(data || []));
  }, [viewingItem?.id, viewingItem?.category]);

  useEffect(() => {
    if (!viewingAlbum?.id) {
      setRecommendedHeadphones([]);
      setAudioTags([]);
      return;
    }
    setAudioTags(viewingAlbum.audio_tags ?? []);
    const ids = (viewingAlbum.manual_recommended_headphone_ids ?? []).slice(0, 2);
    if (ids.length === 0) {
      setRecommendedHeadphones([]);
      return;
    }
    void createClient()
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
  }, [viewingAlbum?.id, viewingAlbum?.manual_recommended_headphone_ids, viewingAlbum?.audio_tags]);

  const handleRefreshAlbumIntro = async () => {
    if (!viewingAlbum || isAuthenticated === false) return;
    setAlbumIntroLoading(true);
    try {
      const res = await fetch('/api/album-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: viewingAlbum.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setViewingAlbum({
        ...viewingAlbum,
        album_intro: payload.album_intro ?? '',
        ai_recommended_headphone_ids: null,
        ai_recommended_headphone_reason: null,
      });
      toast.success('앨범 소개를 갱신했습니다.');
    } catch {
      toast.error('앨범 소개 갱신에 실패했습니다.');
    } finally {
      setAlbumIntroLoading(false);
    }
  };

  const handleCloseView = () => {
    setViewingItem(null);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('view');
    const qs = sp.toString();
    router.replace(qs ? `/headfi?${qs}` : '/headfi', { scroll: false });
  };

  const handleManualRegister = () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setSelectedItem({ isManual: true });
    setFormData(initialFormData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleFrGraphFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadHeadfiFrGraphImage(file);
      setFormData((prev) => ({ ...prev, fr_graph_url: url }));
      toast.success('FR 그래프 이미지를 업로드했습니다. 저장하면 반영됩니다.');
    } catch {
      toast.error('FR 그래프 업로드에 실패했습니다. Storage 버킷 headfi-fr 설정을 확인해 주세요.');
    }
    e.target.value = '';
  };

  const handleEditClick = () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setSelectedItem(viewingItem);
    setFormData(normalizeFormData(viewingItem));
    handleCloseView();
  };

  const handleDeleteClick = async () => {
    if (!viewingItem) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!confirm('정말 이 기기를 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      await deleteHeadfiFromDB(viewingItem.id);
      toast.success('기기가 삭제되었습니다.');
      handleCloseView();
      await fetchLibrary();
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setIsSaving(true);
    try {
      let savedId: number | null = null;
      const isNew = !('id' in selectedItem && selectedItem.id);
      if ('id' in selectedItem && selectedItem.id) {
        await updateHeadfiInDB(Number(selectedItem.id), formData);
        savedId = Number(selectedItem.id);
        toast.success('기기 정보가 수정되었습니다.');
      } else {
        const result = await saveHeadfiToDB(formData);
        savedId = result?.id ?? null;
        toast.success('기기가 라이브러리에 등록되었습니다.');
      }

      setSelectedItem(null);
      await fetchLibrary();

      if (savedId != null) {
        const client = createClient();
        const { data: updatedRow } = await client.from('headfi').select('*').eq('id', savedId).single();
        if (updatedRow) setViewingItem(updatedRow as Headfi);

        const sp = new URLSearchParams(searchParams.toString());
        sp.set('view', String(savedId));
        router.replace(`/headfi?${sp.toString()}`, { scroll: false });

        const wired = formData.category === '헤드폰' || formData.category === '이어폰';
        if (wired) {
          const { data: row } = await client
            .from('headfi')
            .select('recommended_genres')
            .eq('id', savedId)
            .single();
          const needsGen =
            !row?.recommended_genres || (Array.isArray(row.recommended_genres) && row.recommended_genres.length === 0);
          if (needsGen) {
            void fetch('/api/headfi-recommended-genres', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ headfiId: savedId }),
            })
              .then((res) => {
                if (res.ok) void fetchLibrary();
              })
              .catch(() => {});
          }
        }

        if (isNew && isPositionMapCategory(formData.category)) {
          void fetch('/api/headfi-position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ headfiId: savedId }),
          })
            .then((res) => {
              if (res.ok) void fetchLibrary();
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLibrary = useMemo(
    () =>
      library.filter((item) => {
        const matchesCategory = listCategoryFilter === '전체' || item.category === listCategoryFilter;
        const matchesStatus = listStatusFilter === '전체' || item.status2 === listStatusFilter;
        let matchesType1 = true;
        let matchesType2 = true;
        if (listCategoryFilter === '헤드폰') {
          matchesType1 = listType1Filter === '전체' || item.type1 === listType1Filter;
          matchesType2 = listType2Filter === '전체' || item.type2 === listType2Filter;
        }
        const lowerQuery = listSearchQuery.toLowerCase().trim();
        const matchesSearch =
          !lowerQuery ||
          (item.brand && item.brand.toLowerCase().includes(lowerQuery)) ||
          (item.model && item.model.toLowerCase().includes(lowerQuery));
        return matchesCategory && matchesStatus && matchesType1 && matchesType2 && matchesSearch;
      }),
    [library, listSearchQuery, listCategoryFilter, listStatusFilter, listType1Filter, listType2Filter],
  );

  const sortedLibrary = useMemo(
    () =>
      [...filteredLibrary].sort((a, b) => {
        const field = listSortOption.startsWith('created') ? 'created_at' : 'purchase_date';
        const ascending = listSortOption.endsWith('_asc');
        const va = a[field];
        const vb = b[field];
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        const diff = new Date(va).getTime() - new Date(vb).getTime();
        return ascending ? diff : -diff;
      }),
    [filteredLibrary, listSortOption],
  );

  const totalFilteredCount = sortedLibrary.length;
  const listTotalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE) || 1;
  const listStartIndex = (listCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLibrary = sortedLibrary.slice(listStartIndex, listStartIndex + ITEMS_PER_PAGE);

  return (
    <div className="relative min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title flex items-center gap-2 shrink-0">
          <Headphones className="size-7 opacity-80 shrink-0" strokeWidth={1.5} /> Head-fi
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center gap-1.5"
              onClick={() => setSpendingModalOpen(true)}
            >
              <BarChart2 className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
              <span className="hidden sm:inline">소비 통계</span>
            </button>
          ) : null}
          <Link
            href="/headfi/map"
            className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center gap-1.5"
          >
            <Map className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">포지션 맵</span>
          </Link>
          <button
            type="button"
            className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center gap-1.5"
            onClick={() => setScoreModalOpen(true)}
          >
            <Shuffle className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">기기 매칭</span>
          </button>
          <Link
            href="/headfi/match"
            className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center gap-1.5"
          >
            <Music className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">앨범 매칭</span>
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              className="btn-apple btn-apple-secondary flex h-[42px] w-[42px] items-center justify-center"
              onClick={handleManualRegister}
              aria-label="기기 등록하기"
            >
              <span className="text-lg leading-none">＋</span>
            </button>
          ) : null}
        </div>
      </div>

      {selectedItem ? (
        <HeadfiForm
          selectedItem={selectedItem}
          formData={formData}
          setFormData={setFormData}
          dacAmpList={dacAmpList}
          wirelessMatchingList={wirelessMatchingList}
          onClose={() => setSelectedItem(null)}
          onSave={handleSave}
          onImageUpload={handleImageUpload}
          onFrGraphFileChange={handleFrGraphFileChange}
          isSaving={isSaving}
        />
      ) : null}

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
        <HeadfiList
          paginatedLibrary={paginatedLibrary}
          listSearchQuery={listSearchQuery}
          setListSearchQuery={setListSearchQuery}
          listCategoryFilter={listCategoryFilter}
          setListCategoryFilter={setListCategoryFilter}
          listType1Filter={listType1Filter}
          setListType1Filter={setListType1Filter}
          listType2Filter={listType2Filter}
          setListType2Filter={setListType2Filter}
          listStatusFilter={listStatusFilter}
          setListStatusFilter={setListStatusFilter}
          listSortOption={listSortOption}
          setListSortOption={(v) => setListSortOption(v as ListSortOption)}
          listCurrentPage={listCurrentPage}
          setListCurrentPage={setListCurrentPage}
          totalFilteredCount={totalFilteredCount}
          listTotalPages={listTotalPages}
          isLibraryEmpty={library.length === 0}
          onItemClick={(item) => {
            setViewingItem(item);
          }}
        />
      )}

      <HeadfiMatchScoreModal
        open={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        library={library}
      />

      <HeadfiSpendingStatsModal
        open={spendingModalOpen}
        onClose={() => setSpendingModalOpen(false)}
        library={library}
      />

      {viewingAlbum ? (
        <AlbumDetailModal
          viewingItem={viewingAlbum}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={(viewingAlbum.album_intro ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={() => setViewingAlbum(null)}
          onEdit={() => {
            const id = viewingAlbum.id;
            setViewingAlbum(null);
            router.push(`/albums?view=${id}`);
          }}
          onDelete={() => toast.info('삭제는 앨범 화면에서 진행해 주세요.')}
          isAuthenticated={isAuthenticated}
          onAlbumPatch={(updated) => setViewingAlbum(updated)}
          onHeadfiClick={(id) => {
            setViewingAlbum(null);
            void createClient()
              .from('headfi')
              .select('*')
              .eq('id', id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) setViewingItem(data as Headfi);
              });
          }}
        />
      ) : null}

      {viewingItem ? (
        <HeadfiDetailModal
          viewingItem={viewingItem}
          registeredAlbums={registeredAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
          onClose={handleCloseView}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onHeadfiPatch={(patch) => {
            setViewingItem((v) => (v ? { ...v, ...patch } : null));
            const targetId = typeof patch.id === 'number' ? patch.id : undefined;
            if (targetId != null) {
              setLibrary((prev) =>
                prev.map((item) => (item.id === targetId ? { ...item, ...patch } : item)),
              );
            }
          }}
          onAlbumClick={(id) => void openAlbumById(id)}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
        />
      ) : null}
    </div>
  );
}
