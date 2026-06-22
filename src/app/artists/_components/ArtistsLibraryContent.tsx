'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mic2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { updateAlbumInDB } from '@/app/albums/actions';
import type { Album, AlbumFormData } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { useArtistFilters } from '../_hooks/useArtistFilters';
import { ensureArtistRecord } from '../lib/ensureArtistRecord';
import {
  buildArtistSummaries,
  buildListenHistoryIndex,
  getArtistStats,
  getPopularAlbumId,
  getRelatedArtists,
} from '../utils';
import type { ArtistMobileTab, ArtistRecord, ListenHistoryEntry } from '../types';
import { ArtistDetailPanel } from './ArtistDetailPanel';
import type { ArtistLinksPatch } from './ArtistExternalLinksSection';
import { ArtistListSidebar } from './ArtistListSidebar';

export function ArtistsLibraryContent() {
  const searchParams = useSearchParams();
  const artistQuery = searchParams.get('artist')?.trim() || null;
  const isAuthenticated = useAuthState();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [listenHistoryIndex, setListenHistoryIndex] = useState<Map<number, ListenHistoryEntry>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [initialSelectionReady, setInitialSelectionReady] = useState(!artistQuery);
  const [artistRecord, setArtistRecord] = useState<ArtistRecord | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<ArtistMobileTab>('list');
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);
  const [artistProfileUrls, setArtistProfileUrls] = useState<Record<string, string | null>>({});
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>({
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
  });
  const [isSaving, setIsSaving] = useState(false);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);

  const summaries = useMemo(() => buildArtistSummaries(albums), [albums]);
  const {
    searchQuery,
    setSearchQuery,
    countryFilter,
    setCountryFilter,
    typeFilter,
    setTypeFilter,
    genreFilter,
    setGenreFilter,
    sortOption,
    setSortOption,
    countryOptions,
    typeOptions,
    genreOptions,
    filteredArtists,
  } = useArtistFilters(summaries);

  const selectedArtist = useMemo(
    () => filteredArtists.find((artist) => artist.name === selectedName) ?? null,
    [filteredArtists, selectedName],
  );

  const selectedArtistStats = useMemo(
    () => (selectedArtist ? getArtistStats(selectedArtist, listenHistoryIndex) : null),
    [selectedArtist, listenHistoryIndex],
  );

  const selectedPopularAlbumId = useMemo(
    () => (selectedArtist ? getPopularAlbumId(selectedArtist, listenHistoryIndex) : null),
    [selectedArtist, listenHistoryIndex],
  );

  const selectedRelatedArtists = useMemo(
    () =>
      selectedArtist
        ? getRelatedArtists(selectedArtist, summaries, artistProfileUrls)
        : [],
    [selectedArtist, summaries, artistProfileUrls],
  );

  const fetchLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createClient();
      const [albumRes, historyRes, artistsRes] = await Promise.all([
        client.from('album').select('*').order('release_date', { ascending: false }),
        client.from('album_listen_history').select('album_id, listened_at'),
        client.from('artists').select('artist_name, profile_image_url'),
      ]);
      if (albumRes.error) {
        toast.error('앨범 목록을 불러오지 못했습니다.');
        setAlbums([]);
      } else {
        setAlbums((albumRes.data ?? []) as Album[]);
      }
      if (historyRes.error) {
        setListenHistoryIndex(new Map());
      } else {
        setListenHistoryIndex(buildListenHistoryIndex(historyRes.data ?? []));
      }
      if (artistsRes.error) {
        setArtistProfileUrls({});
      } else {
        const profiles: Record<string, string | null> = {};
        for (const row of artistsRes.data ?? []) {
          const name = typeof row.artist_name === 'string' ? row.artist_name.trim() : '';
          if (!name) continue;
          profiles[name] =
            typeof row.profile_image_url === 'string' && row.profile_image_url.trim()
              ? row.profile_image_url.trim()
              : null;
        }
        setArtistProfileUrls(profiles);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    if (isLoading || initialSelectionReady) return;

    if (artistQuery && summaries.some((artist) => artist.name === artistQuery)) {
      setSelectedName(artistQuery);
      setMobileTab('detail');
    } else if (artistQuery) {
      setSelectedName(null);
    } else if (filteredArtists.length > 0) {
      setSelectedName(filteredArtists[0].name);
    }
    setInitialSelectionReady(true);
  }, [isLoading, initialSelectionReady, artistQuery, summaries, filteredArtists]);

  useEffect(() => {
    if (!initialSelectionReady) return;
    if (artistQuery && selectedName === null && !summaries.some((artist) => artist.name === artistQuery)) {
      return;
    }
    if (filteredArtists.length === 0) {
      setSelectedName(null);
      return;
    }
    if (!selectedName || !filteredArtists.some((artist) => artist.name === selectedName)) {
      setSelectedName(filteredArtists[0].name);
    }
  }, [filteredArtists, selectedName, initialSelectionReady, artistQuery, summaries]);

  useEffect(() => {
    if (!selectedName) {
      setArtistRecord(null);
      return;
    }
    let cancelled = false;
    void ensureArtistRecord(selectedName).then((record) => {
      if (!cancelled) setArtistRecord(record);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedName]);

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

  useEffect(() => {
    if (isAuthenticated !== true) return;
    void createClient()
      .from('headfi')
      .select('id, brand, model')
      .eq('category', '헤드폰')
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) => {
        setHeadfiOwnedHeadphones(
          (data ?? []).map((r) => ({
            id: r.id,
            brand: r.brand || '',
            model: r.model || '',
          })),
        );
      });
  }, [isAuthenticated]);

  const handleSelectArtist = (name: string) => {
    setSelectedName(name);
    setMobileTab('detail');
  };

  const handleRefreshBio = async () => {
    if (!selectedName || isAuthenticated !== true) return;
    setBioLoading(true);
    try {
      const res = await fetch('/api/artist-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: selectedName }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; bio?: string };
      if (!res.ok) {
        toast.error(payload.error ?? '소개 생성에 실패했습니다.');
        return;
      }
      const bio = typeof payload.bio === 'string' ? payload.bio : '';
      const { data } = await createClient()
        .from('artists')
        .select('*')
        .eq('artist_name', selectedName)
        .maybeSingle();
      if (data) {
        setArtistRecord(data as ArtistRecord);
      } else if (bio) {
        setArtistRecord((prev) => (prev ? { ...prev, bio } : prev));
      }
      toast.success('아티스트 소개를 갱신했습니다.');
    } catch {
      toast.error('소개 생성에 실패했습니다.');
    } finally {
      setBioLoading(false);
    }
  };

  const handleSaveLinks = async (patch: ArtistLinksPatch): Promise<boolean> => {
    if (!selectedName || !artistRecord?.id || isAuthenticated !== true) return false;
    setLinksSaving(true);
    try {
      const { error } = await createClient()
        .from('artists')
        .update(patch)
        .eq('id', artistRecord.id);
      if (error) {
        toast.error(error.message || '링크 저장에 실패했습니다.');
        return false;
      }
      setArtistRecord((prev) => (prev ? { ...prev, ...patch } : prev));
      toast.success('외부 링크를 저장했습니다.');
      return true;
    } catch {
      toast.error('링크 저장에 실패했습니다.');
      return false;
    } finally {
      setLinksSaving(false);
    }
  };

  const handleSaveProfileImage = async (profileImageUrl: string | null): Promise<boolean> => {
    if (!selectedName || !artistRecord?.id || isAuthenticated !== true) return false;
    setProfileSaving(true);
    try {
      const { error } = await createClient()
        .from('artists')
        .update({ profile_image_url: profileImageUrl })
        .eq('id', artistRecord.id);
      if (error) {
        toast.error(error.message || '프로필 이미지 저장에 실패했습니다.');
        return false;
      }
      setArtistRecord((prev) => (prev ? { ...prev, profile_image_url: profileImageUrl } : prev));
      toast.success('프로필 이미지를 저장했습니다.');
      return true;
    } catch {
      toast.error('프로필 이미지 저장에 실패했습니다.');
      return false;
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAlbumEditClick = () => {
    if (!viewingAlbum) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingAlbum;
    setViewingAlbum(null);
    setEditingAlbum(item);
    setAlbumFormData(
      albumToFormData(item, {
        album_intro: item.album_intro ?? item.ai_recommended_headphone_reason ?? '',
      }),
    );
  };

  const handleAlbumImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setAlbumFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleAlbumSave = async () => {
    if (!editingAlbum || isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        ...albumFormData,
        matching1: albumFormData.matching1 === ' ' ? '' : albumFormData.matching1,
        matching2: albumFormData.matching2 === ' ' ? '' : albumFormData.matching2,
      };
      const savedId = editingAlbum.id;
      await updateAlbumInDB(savedId, data);
      const { data: updatedRow } = await createClient()
        .from('album')
        .select('*')
        .eq('id', savedId)
        .single();
      if (updatedRow) {
        const updated = updatedRow as Album;
        setAlbums((prev) => prev.map((a) => (a.id === savedId ? updated : a)));
        setViewingAlbum(updated);
        setAudioTags(updated.audio_tags ?? []);
      }
      toast.success('앨범 정보가 수정되었습니다.');
      setEditingAlbum(null);
    } catch (e) {
      const message =
        e instanceof Error && e.message === 'Unauthorized'
          ? '로그인이 필요합니다.'
          : '저장 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

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
      const updated: Album = {
        ...viewingAlbum,
        audio_tags: payload.audio_tags ?? [],
        album_intro: payload.album_intro ?? '',
        ai_recommended_headphone_ids: null,
        ai_recommended_headphone_reason: null,
      };
      setViewingAlbum(updated);
      setAlbums((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setAudioTags((payload.audio_tags as string[]) ?? []);
      toast.success('앨범 소개와 태그를 갱신했습니다.');
    } catch {
      toast.error('앨범 소개 갱신에 실패했습니다.');
    } finally {
      setAlbumIntroLoading(false);
    }
  };

  const sidebar = (
    <ArtistListSidebar
      artists={filteredArtists}
      selectedName={selectedName}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      countryFilter={countryFilter}
      setCountryFilter={setCountryFilter}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      genreFilter={genreFilter}
      setGenreFilter={setGenreFilter}
      sortOption={sortOption}
      setSortOption={setSortOption}
      countryOptions={countryOptions}
      typeOptions={typeOptions}
      genreOptions={genreOptions}
      onSelect={handleSelectArtist}
    />
  );

  const detail = (
    <ArtistDetailPanel
      artist={selectedArtist}
      artistRecord={artistRecord}
      artistStats={selectedArtistStats}
      popularAlbumId={selectedPopularAlbumId}
      relatedArtists={selectedRelatedArtists}
      bioLoading={bioLoading}
      linksSaving={linksSaving}
      profileSaving={profileSaving}
      isAuthenticated={isAuthenticated}
      showMobileBack={mobileTab === 'detail'}
      onMobileBack={() => setMobileTab('list')}
      onAlbumClick={setViewingAlbum}
      onSelectArtist={handleSelectArtist}
      onRefreshBio={() => void handleRefreshBio()}
      onSaveLinks={handleSaveLinks}
      onSaveProfileImage={handleSaveProfileImage}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <h1 className="page-title mb-6 flex items-center gap-2">
        <Mic2 className="size-7 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
        Artists
      </h1>

      {isLoading ? (
        <div className="flex min-h-[16rem] items-center justify-center text-sm opacity-70">로딩 중...</div>
      ) : summaries.length === 0 ? (
        <p className="text-sm opacity-70">등록된 앨범이 없어 아티스트를 표시할 수 없습니다.</p>
      ) : (
        <>
          <div className="mb-4 flex gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab('list')}
              className="flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-opacity"
              style={{
                borderColor: 'var(--border)',
                background: mobileTab === 'list' ? 'var(--badge-bg)' : 'var(--card-bg)',
                opacity: mobileTab === 'list' ? 1 : 0.75,
              }}
            >
              목록
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('detail')}
              className="flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-opacity"
              style={{
                borderColor: 'var(--border)',
                background: mobileTab === 'detail' ? 'var(--badge-bg)' : 'var(--card-bg)',
                opacity: mobileTab === 'detail' ? 1 : 0.75,
              }}
            >
              상세
            </button>
          </div>

          <div className="hidden min-h-[calc(100dvh-12rem)] gap-6 lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <div className="sticky top-[4.5rem] max-h-[calc(100dvh-6rem)] min-h-0">{sidebar}</div>
            {detail}
          </div>

          <div className="lg:hidden">
            {mobileTab === 'list' ? (
              <div className="max-h-[calc(100dvh-14rem)] min-h-[20rem]">{sidebar}</div>
            ) : (
              detail
            )}
          </div>
        </>
      )}

      {viewingAlbum ? (
        <AlbumDetailModal
          viewingItem={viewingAlbum}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={(viewingAlbum.album_intro ?? '').trim()}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={() => setViewingAlbum(null)}
          onEdit={handleAlbumEditClick}
          onDelete={() => toast.info('삭제는 앨범 화면에서 진행해 주세요.')}
          isAuthenticated={isAuthenticated}
          onAlbumPatch={(updated) => {
            setViewingAlbum(updated);
            setAlbums((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }}
        />
      ) : null}

      {editingAlbum ? (
        <AlbumForm
          selectedItem={editingAlbum}
          formData={albumFormData}
          setFormData={setAlbumFormData}
          headfiOwnedHeadphones={headfiOwnedHeadphones}
          onClose={() => setEditingAlbum(null)}
          onSave={() => void handleAlbumSave()}
          onImageUpload={handleAlbumImageUpload}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  );
}
