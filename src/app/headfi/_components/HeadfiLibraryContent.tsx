'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { saveHeadfiToDB, updateHeadfiInDB, deleteHeadfiFromDB } from '../actions';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { Headfi, SelectedHeadfi } from '../types';
import { HeadfiForm } from './HeadfiForm';
import { HeadfiDetailModal } from './HeadfiDetailModal';
import { HeadfiList } from './HeadfiList';

const initialFormData = {
  brand: '',
  model: '',
  category: '헤드폰',
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
  etc: '',
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

  const [matchedAlbums, setMatchedAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[]
  >([]);
  const [dacAmpList, setDacAmpList] = useState<{ id: number; brand: string; model: string }[]>([]);
  const [matchedMatchingDevice, setMatchedMatchingDevice] = useState<{ id: number; brand: string; model: string } | null>(
    null,
  );
  const [matchedHeadphones, setMatchedHeadphones] = useState<
    { id: number; brand: string; model: string; category: string }[]
  >([]);

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
      .eq('category', 'DAC/AMP')
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) =>
        setDacAmpList((data || []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' }))),
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
      setMatchedAlbums([]);
      return;
    }
    const client = createClient();
    const id = viewingItem.id;
    Promise.all([
      client
        .from('album')
        .select('id, album_name, artist, cover_image_url, release_date')
        .contains('manual_recommended_headphone_ids', [id]),
      client
        .from('album')
        .select('id, album_name, artist, cover_image_url, release_date')
        .contains('ai_recommended_headphone_ids', [id]),
    ]).then(([manualRes, aiRes]) => {
      const map = new Map<
        number,
        { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }
      >();
      (manualRes.data || []).forEach((a) => map.set(a.id, a));
      (aiRes.data || []).forEach((a) => map.set(a.id, a));
      const merged = Array.from(map.values());
      merged.sort((a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime());
      setMatchedAlbums(merged);
    });
  }, [viewingItem?.id]);

  useEffect(() => {
    if (!viewingItem || (viewingItem.category !== '헤드폰' && viewingItem.category !== '이어폰')) {
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
    if (!viewingItem?.id || viewingItem.category !== 'DAC/AMP') {
      setMatchedHeadphones([]);
      return;
    }
    const idStr = String(viewingItem.id);
    const client = createClient();
    client
      .from('headfi')
      .select('id,brand,model,category')
      .in('category', ['헤드폰', '이어폰'])
      .eq('matching', idStr)
      .order('brand')
      .order('model')
      .then(({ data }) => setMatchedHeadphones(data || []));
  }, [viewingItem?.id, viewingItem?.category]);

  const handleCloseView = () => {
    setViewingItem(null);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('view');
    const qs = sp.toString();
    router.replace(qs ? `/headfi?${qs}` : '/headfi');
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
        router.replace(`/headfi?${sp.toString()}`);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title flex items-center gap-2">
          <Headphones className="size-7 opacity-80 shrink-0" strokeWidth={1.5} /> Head-fi
        </h1>
        {isAuthenticated ? (
          <button
            type="button"
            className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center"
            onClick={handleManualRegister}
          >
            <span className="text-lg leading-none sm:mr-1">＋</span>
            <span className="hidden sm:inline">기기 등록하기</span>
          </button>
        ) : null}
      </div>

      {selectedItem ? (
        <HeadfiForm
          selectedItem={selectedItem}
          formData={formData}
          setFormData={setFormData}
          dacAmpList={dacAmpList}
          onClose={() => setSelectedItem(null)}
          onSave={handleSave}
          onImageUpload={handleImageUpload}
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
            const sp = new URLSearchParams(searchParams.toString());
            sp.set('view', String(item.id));
            router.replace(`/headfi?${sp.toString()}`);
          }}
        />
      )}

      {viewingItem ? (
        <HeadfiDetailModal
          viewingItem={viewingItem}
          matchedAlbums={matchedAlbums}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
          onClose={handleCloseView}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
        />
      ) : null}
    </div>
  );
}
