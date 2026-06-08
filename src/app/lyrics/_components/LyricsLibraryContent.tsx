'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  saveLyricsToDB,
  updateLyricsInDB,
  deleteLyricsFromDB,
  uploadAudioFile,
  uploadCoverImage,
} from '../actions';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { Lyrics, SelectedLyrics } from '../types';
import {
  LYRICS_NO_ALBUM_KEY,
  groupLyricsByAlbum,
  findTracksForAlbumKey,
  toAlbumCards,
} from '../lib/album-groups';
import { LyricsList } from './LyricsList';
import { LyricsAlbumDetail } from './LyricsAlbumDetail';
import { LyricsForm } from './LyricsForm';
import { LyricsDetailModal } from './LyricsDetailModal';

const ITEMS_PER_PAGE = 20;

const initialFormData = {
  title: '',
  album: '',
  genre1: '',
  genre2: '',
  lyrics: '',
  cover_image_url: '',
  audio_url: '',
  youtube_url: '',
};

export function LyricsLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const albumParam = searchParams.get('album');
  const isAuthenticated = useAuthState();

  const [library, setLibrary] = useState<Lyrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedLyrics | null>(null);
  const [viewingItem, setViewingItem] = useState<Lyrics | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vibeAnalyzeLoading, setVibeAnalyzeLoading] = useState(false);

  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listGenreFilter, setListGenreFilter] = useState('전체');
  const [listGenre2Filter, setListGenre2Filter] = useState('전체');
  const [listSortOrder, setListSortOrder] = useState<'created_desc' | 'title_asc'>('created_desc');
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
  const [listCurrentPage, setListCurrentPage] = useState(1);

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createClient();
      const { data } = await client.from('lyrics').select('*').order('created_at', { ascending: false });
      setLibrary((data as Lyrics[]) || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (!viewId || library.length === 0) return;
    const row = library.find((l) => String(l.id) === String(viewId));
    if (row) setViewingItem(row);
  }, [library, searchParams]);

  useEffect(() => {
    if (!viewingItem?.id) return;
    const updated = library.find((l) => l.id === viewingItem.id);
    if (updated) {
      setViewingItem((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    }
  }, [library, viewingItem?.id]);

  useEffect(() => {
    setListCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listSearchQuery, listGenreFilter, listGenre2Filter, listSortOrder, itemsPerPage]);

  const genre2Options = useMemo(() => {
    const s = new Set<string>();
    library.forEach((x) => {
      if (x.genre2?.trim()) s.add(x.genre2.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [library]);

  const handleModalClose = useCallback(() => {
    setViewingItem(null);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('view');
    const q = sp.toString();
    router.replace(q ? `/lyrics?${q}` : '/lyrics');
  }, [router, searchParams]);

  const handleManualRegister = () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setSelectedItem({ isManual: true });
    setFormData(initialFormData);
    setCoverFile(null);
    setAudioFile(null);
  };

  const handleEditClick = () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!viewingItem) return;
    setSelectedItem(viewingItem);
    setFormData({
      title: viewingItem.title ?? '',
      album: viewingItem.album ?? '',
      genre1: viewingItem.genre1 ?? '',
      genre2: viewingItem.genre2 ?? '',
      lyrics: viewingItem.lyrics ?? '',
      cover_image_url: viewingItem.cover_image_url ?? '',
      audio_url: viewingItem.audio_url ?? '',
      youtube_url: viewingItem.youtube_url ?? '',
    });
    setCoverFile(null);
    setAudioFile(null);
    handleModalClose();
  };

  const handleLyricsPatch = useCallback((patch: Partial<Lyrics> & { id: number }) => {
    setViewingItem((v) => (v && v.id === patch.id ? { ...v, ...patch } : v));
    setLibrary((prev) => prev.map((item) => (item.id === patch.id ? { ...item, ...patch } : item)));
  }, []);

  const handleVibeAnalyze = async () => {
    if (!viewingItem) return;
    if (!viewingItem.lyrics?.trim()) {
      toast.error('가사 내용이 없어 바이브 분석을 할 수 없습니다.');
      return;
    }
    setVibeAnalyzeLoading(true);
    try {
      const res = await fetch('/api/analyze-lyrics-vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyricsId: viewingItem.id, lyricsText: viewingItem.lyrics }),
      });
      const payload = (await res.json()) as { error?: string; colors?: string[]; emoji?: string };
      if (!res.ok) {
        toast.error(
          typeof payload.error === 'string' ? payload.error : '바이브 분석에 실패했습니다.',
        );
        return;
      }
      if (payload.colors && payload.emoji) {
        handleLyricsPatch({
          id: viewingItem.id,
          vibe_colors: payload.colors,
          vibe_emoji: payload.emoji,
        });
        toast.success('바이브 분석을 저장했습니다.');
      }
    } catch {
      toast.error('바이브 분석 요청 중 오류가 났습니다.');
    } finally {
      setVibeAnalyzeLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!viewingItem) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!confirm('정말 이 가사 항목을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      await deleteLyricsFromDB(viewingItem.id);
      toast.success('삭제되었습니다.');
      handleModalClose();
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
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!formData.album.trim()) {
      toast.error('앨범명을 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const updateId =
        'id' in selectedItem && typeof selectedItem.id === 'number' ? selectedItem.id : null;
      let coverUrl = formData.cover_image_url;
      let audioUrl = formData.audio_url;
      if (coverFile) {
        coverUrl = await uploadCoverImage(coverFile);
      }
      if (audioFile) {
        audioUrl = await uploadAudioFile(audioFile);
      }
      const payload = { ...formData, cover_image_url: coverUrl, audio_url: audioUrl };
      let savedId: number | null = updateId;
      if (updateId != null) {
        await updateLyricsInDB(updateId, payload);
        toast.success('수정되었습니다.');
      } else {
        const inserted = await saveLyricsToDB(payload);
        toast.success('등록되었습니다.');
        savedId = inserted && typeof inserted.id === 'number' ? inserted.id : null;
      }
      setSelectedItem(null);
      setCoverFile(null);
      setAudioFile(null);
      await fetchLibrary();

      if (formData.lyrics?.trim() && savedId != null) {
        void fetch('/api/analyze-lyrics-vibe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lyricsId: savedId, lyricsText: formData.lyrics }),
        })
          .then((res) => {
            if (res.ok) void fetchLibrary();
          })
          .catch(() => {});
      }

      if (updateId != null) {
        const client = createClient();
        const { data: updatedRow } = await client.from('lyrics').select('*').eq('id', updateId).single();
        if (updatedRow) setViewingItem(updatedRow as Lyrics);

        const sp = new URLSearchParams(searchParams.toString());
        sp.set('view', String(updateId));
        router.replace(`/lyrics?${sp.toString()}`);
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
        const matchesGenre1 = listGenreFilter === '전체' || item.genre1 === listGenreFilter;
        const g2 = item.genre2?.trim() ?? '';
        const matchesGenre2 = listGenre2Filter === '전체' || g2 === listGenre2Filter;
        const lowerQuery = listSearchQuery.toLowerCase().trim();
        const matchesSearch =
          !lowerQuery ||
          (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
          (item.album && item.album.toLowerCase().includes(lowerQuery));
        return matchesGenre1 && matchesGenre2 && matchesSearch;
      }),
    [library, listSearchQuery, listGenreFilter, listGenre2Filter],
  );

  const albumGroups = useMemo(
    () => groupLyricsByAlbum(filteredLibrary, listSortOrder),
    [filteredLibrary, listSortOrder],
  );

  const albumCards = useMemo(() => toAlbumCards(albumGroups), [albumGroups]);

  const totalAlbumCount = albumCards.length;
  const listTotalPages = Math.ceil(totalAlbumCount / itemsPerPage) || 1;
  const paginatedAlbums = useMemo(() => {
    const start = (listCurrentPage - 1) * itemsPerPage;
    return albumCards.slice(start, start + itemsPerPage);
  }, [albumCards, listCurrentPage, itemsPerPage]);

  const albumPageTitle = useMemo(() => {
    if (!albumParam) return '';
    let decoded: string;
    try {
      decoded = decodeURIComponent(albumParam);
    } catch {
      decoded = albumParam;
    }
    return decoded === LYRICS_NO_ALBUM_KEY ? '(앨범 미지정)' : decoded;
  }, [albumParam]);

  const detailTracksRaw = useMemo(() => {
    if (!albumParam) return null;
    if (library.length === 0) return [];
    let decoded: string;
    try {
      decoded = decodeURIComponent(albumParam);
    } catch {
      decoded = albumParam;
    }
    return findTracksForAlbumKey(library, decoded);
  }, [albumParam, library]);

  const sortedDetailTracks = useMemo(() => {
    if (!detailTracksRaw) return [];
    const copy = [...detailTracksRaw];
    if (listSortOrder === 'title_asc') {
      return copy.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
    }
    return copy.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
  }, [detailTracksRaw, listSortOrder]);

  const openAlbum = (key: string) => {
    router.push(`/lyrics?album=${encodeURIComponent(key)}`);
  };

  const handleBackFromAlbum = () => {
    router.push('/lyrics');
  };

  const showAlbumDetail = Boolean(albumParam?.length);

  return (
    <div className="relative min-h-screen max-w-6xl mx-auto px-4 sm:px-6 py-8" style={{ color: 'var(--foreground)' }}>
      <div className="flex flex-nowrap flex-row items-center justify-between gap-2 mb-6 w-full min-w-0">
        <h1 className="page-title flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <Mic2 className="size-6 sm:size-7 opacity-80 shrink-0" strokeWidth={1.5} />
          <span className="truncate">Lyrics</span>
        </h1>
        {isAuthenticated ? (
          <button
            type="button"
            className="btn-apple btn-apple-secondary h-[42px] px-3 flex items-center justify-center shrink-0"
            onClick={handleManualRegister}
          >
            <span className="text-lg leading-none sm:mr-1">＋</span>
            <span className="hidden sm:inline">가사 등록하기</span>
          </button>
        ) : null}
      </div>

      {selectedItem ? (
        <LyricsForm
          selectedItem={selectedItem}
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setSelectedItem(null);
            setCoverFile(null);
            setAudioFile(null);
          }}
          onSave={handleSave}
          isSaving={isSaving}
          coverFile={coverFile}
          setCoverFile={setCoverFile}
          audioFile={audioFile}
          setAudioFile={setAudioFile}
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
      ) : showAlbumDetail ? (
        <LyricsAlbumDetail
          albumTitle={albumPageTitle}
          tracks={sortedDetailTracks}
          onBack={handleBackFromAlbum}
          onLyricsClick={(t) => {
            setViewingItem(t);
            const sp = new URLSearchParams(searchParams.toString());
            sp.set('view', String(t.id));
            router.replace(`/lyrics?${sp.toString()}`);
          }}
        />
      ) : (
        <LyricsList
          paginatedAlbums={paginatedAlbums}
          listSearchQuery={listSearchQuery}
          setListSearchQuery={setListSearchQuery}
          listGenreFilter={listGenreFilter}
          setListGenreFilter={setListGenreFilter}
          listGenre2Filter={listGenre2Filter}
          setListGenre2Filter={setListGenre2Filter}
          genre2Options={genre2Options}
          listSortOrder={listSortOrder}
          setListSortOrder={setListSortOrder}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          listCurrentPage={listCurrentPage}
          setListCurrentPage={setListCurrentPage}
          totalAlbumCount={totalAlbumCount}
          listTotalPages={listTotalPages}
          isLibraryEmpty={library.length === 0}
          onAlbumOpen={openAlbum}
        />
      )}

      {viewingItem ? (
        <LyricsDetailModal
          viewingItem={viewingItem}
          onClose={handleModalClose}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onVibeAnalyze={isAuthenticated ? handleVibeAnalyze : undefined}
          vibeAnalyzeLoading={vibeAnalyzeLoading}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
        />
      ) : null}
    </div>
  );
}
