'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Mic2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { deleteAlbumFromDB, saveAlbumToDB, updateAlbumInDB } from '@/app/albums/actions';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { useArtistFilters } from '../_hooks/useArtistFilters';
import { ensureArtistRecord } from '../lib/ensureArtistRecord';
import { updateArtistNames, applyAlbumNameRetarget } from '../lib/updateArtistNames';
import {
  applyArtistNameAltMap,
  buildArtistSummaries,
  buildComposerSummaries,
  buildArtistNameAltMap,
  buildListenHistoryIndex,
  findArtistWikiUrl,
  findComposerWikiUrl,
  getArtistStats,
  getPrimaryGenre1,
  getPopularAlbumId,
  getRelatedArtists,
  isSameArtistName,
  normalizeArtistNameAlt,
} from '../utils';
import type { ArtistLibraryRole, ArtistRecord, ArtistSummary, ListenHistoryEntry } from '../types';
import { ArtistDetailPanel } from './ArtistDetailPanel';
import type { ArtistLinksPatch } from './ArtistExternalLinksSection';
import { ArtistListSidebar } from './ArtistListSidebar';
import { ArtistLotteryModal } from './ArtistLotteryModal';
import { ArtistTopControlBar } from './ArtistTopControlBar';

const LG_UP_MQ = '(min-width: 1024px)';

function isLgUpViewport() {
  return typeof window !== 'undefined' && window.matchMedia(LG_UP_MQ).matches;
}

const initialAlbumFormData: AlbumFormData = {
  artist: '',
  artist_type: '',
  country: '',
  album_name: '',
  album_type: '',
  year: ['2026'],
  release_date: '',
  genre1: '',
  genre2: '',
  composer: '',
  composer_country: '',
  composer_era: '',
  composer_wiki_url: '',
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
  owns_cd: false,
  owns_lp: false,
  owns_cassette: false,
};

function albumFormDataFromArtist(
  artist: ArtistSummary,
  role: ArtistLibraryRole = 'artist',
): AlbumFormData {
  if (role === 'composer') {
    return {
      ...initialAlbumFormData,
      composer: artist.name,
      genre1: 'Classic',
      composer_country: artist.country ?? '',
      composer_era: artist.era ?? '',
      composer_wiki_url: findComposerWikiUrl(artist.albums) ?? '',
      wiki_url: findArtistWikiUrl(artist.albums) ?? '',
    };
  }
  return {
    ...initialAlbumFormData,
    artist: artist.name,
    artist_type: artist.artistType ?? '',
    country: artist.country ?? '',
    genre1: getPrimaryGenre1(artist) ?? '',
    wiki_url: findArtistWikiUrl(artist.albums) ?? '',
  };
}

export function ArtistsLibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artistQuery = searchParams.get('artist')?.trim() || null;
  const role: ArtistLibraryRole = searchParams.get('role') === 'composer' ? 'composer' : 'artist';
  const isAuthenticated = useAuthState();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [listenHistoryIndex, setListenHistoryIndex] = useState<Map<number, ListenHistoryEntry>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [artistRecord, setArtistRecord] = useState<ArtistRecord | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => (typeof window !== 'undefined' ? !window.matchMedia(LG_UP_MQ).matches : false),
  );
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);
  const [artistProfileUrls, setArtistProfileUrls] = useState<Record<string, string | null>>({});
  const [artistNameAltByName, setArtistNameAltByName] = useState<Record<string, string | null>>({});
  const [albumFormItem, setAlbumFormItem] = useState<SelectedAlbum | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [artistLotteryOpen, setArtistLotteryOpen] = useState(false);
  const lastRoleRef = useRef(role);
  const pushedOverlayRef = useRef(false);
  const overlayScrollRef = useRef<HTMLDivElement>(null);
  const prevOverlayArtistRef = useRef<string | null>(null);

  const buildLibraryPath = useCallback((nextRole: ArtistLibraryRole, name?: string | null) => {
    const params = new URLSearchParams();
    params.set('role', nextRole);
    if (name) params.set('artist', name);
    return `/artists?${params.toString()}`;
  }, []);

  const replaceLibraryUrl = useCallback(
    (nextRole: ArtistLibraryRole, name?: string | null) => {
      router.replace(buildLibraryPath(nextRole, name));
    },
    [buildLibraryPath, router],
  );

  const pushLibraryUrl = useCallback(
    (nextRole: ArtistLibraryRole, name: string) => {
      router.push(buildLibraryPath(nextRole, name));
    },
    [buildLibraryPath, router],
  );

  const mobileOverlayOpen = Boolean(artistQuery) && isMobileViewport;
  useLockBodyScroll(mobileOverlayOpen);

  const summaries = useMemo(
    () =>
      applyArtistNameAltMap(
        role === 'composer' ? buildComposerSummaries(albums) : buildArtistSummaries(albums),
        artistNameAltByName,
      ),
    [albums, artistNameAltByName, role],
  );
  const artistLotteryPool = useMemo(
    () =>
      summaries.map((artist) => {
        const stats = getArtistStats(artist, listenHistoryIndex);
        return {
          name: artist.name,
          profileImageUrl: artistProfileUrls[artist.name] ?? null,
          country: artist.country,
          artistType: artist.artistType,
          genre1: getPrimaryGenre1(artist),
          albumCount: stats.totalAlbums,
          totalListenCount: stats.totalListenCount,
        };
      }),
    [summaries, artistProfileUrls, listenHistoryIndex],
  );
  const {
    searchQuery,
    setSearchQuery,
    countryFilter,
    setCountryFilter,
    eraFilter,
    setEraFilter,
    eraOptions,
    typeFilter,
    setTypeFilter,
    genreFilter,
    setGenreFilter,
    genre2Filter,
    genre2Tags,
    handleGenre2TagSelect,
    resetFilters,
    sortOption,
    setSortOption,
    countryOptions,
    typeOptions,
    genreOptions,
    filteredArtists,
  } = useArtistFilters(summaries);

  const selectedName = useMemo(() => {
    if (artistQuery && summaries.some((artist) => artist.name === artistQuery)) {
      return artistQuery;
    }
    return filteredArtists[0]?.name ?? null;
  }, [artistQuery, summaries, filteredArtists]);

  const selectedArtist = useMemo(
    () => summaries.find((artist) => artist.name === selectedName) ?? null,
    [summaries, selectedName],
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
        client.from('artists').select('artist_name, profile_image_url, name_alt'),
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
        setArtistNameAltByName({});
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
        setArtistNameAltByName(buildArtistNameAltMap(artistsRes.data ?? []));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    const mq = window.matchMedia(LG_UP_MQ);
    const sync = () => setIsMobileViewport(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (lastRoleRef.current === role) return;
    lastRoleRef.current = role;
    resetFilters();
    setViewingAlbum(null);
    pushedOverlayRef.current = false;
  }, [role, resetFilters]);

  useEffect(() => {
    setViewingAlbum(null);
  }, [artistQuery]);

  useEffect(() => {
    if (!artistQuery) {
      pushedOverlayRef.current = false;
      prevOverlayArtistRef.current = null;
      return;
    }
    if (prevOverlayArtistRef.current && prevOverlayArtistRef.current !== artistQuery) {
      overlayScrollRef.current?.scrollTo(0, 0);
    }
    prevOverlayArtistRef.current = artistQuery;
  }, [artistQuery]);

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
      .in('category', ['헤드폰', '이어폰'])
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
    if (isLgUpViewport()) {
      replaceLibraryUrl(role, name);
      return;
    }
    if (artistQuery) {
      replaceLibraryUrl(role, name);
      return;
    }
    pushedOverlayRef.current = true;
    pushLibraryUrl(role, name);
  };

  const closeMobileOverlay = useCallback(() => {
    const wasPushed = pushedOverlayRef.current;
    pushedOverlayRef.current = false;
    if (wasPushed) {
      router.back();
      return;
    }
    replaceLibraryUrl(role, null);
  }, [replaceLibraryUrl, role, router]);

  const handleRoleChange = (next: ArtistLibraryRole) => {
    if (next === role) return;
    pushedOverlayRef.current = false;
    replaceLibraryUrl(next, null);
  };

  const handleRefreshBio = async () => {
    if (!selectedName || isAuthenticated !== true) return;
    setBioLoading(true);
    try {
      const res = await fetch('/api/artist-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName: selectedName, role }),
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
      toast.success(role === 'composer' ? '작곡가 소개를 갱신했습니다.' : '아티스트 소개를 갱신했습니다.');
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

  const handleSaveNames = async (patch: {
    name: string;
    nameAlt: string | null;
  }): Promise<boolean> => {
    if (!selectedName || !artistRecord?.id || isAuthenticated !== true) return false;
    const albumArtistName = selectedName;
    const recordArtistName = artistRecord.artist_name.trim();
    const newName = patch.name.trim();
    if (!newName) {
      toast.error('이름1을 입력해 주세요.');
      return false;
    }
    const normalizedAlt = normalizeArtistNameAlt(patch.nameAlt);
    setNameSaving(true);
    try {
      const result = await updateArtistNames(createClient(), artistRecord.id, {
        recordArtistName,
        albumArtistName,
        name: newName,
        nameAlt: normalizedAlt,
      });
      if (result.error) {
        toast.error(result.error || '이름 저장에 실패했습니다.');
        return false;
      }

      const nameChanged = !isSameArtistName(newName, albumArtistName);
      setAlbums((prev) =>
        prev.map((album) =>
          applyAlbumNameRetarget(album, albumArtistName, recordArtistName, newName),
        ),
      );

      if (nameChanged || result.mergedArtistId) {
        setArtistProfileUrls((prev) => {
          const next = { ...prev };
          const sourceKey = albumArtistName in next ? albumArtistName : recordArtistName;
          if (sourceKey in next) {
            next[newName] = next[sourceKey];
            if (sourceKey !== newName) delete next[sourceKey];
          }
          return next;
        });
        setArtistNameAltByName((prev) => {
          const next = { ...prev };
          for (const key of [albumArtistName, recordArtistName]) {
            if (key !== newName) delete next[key];
          }
          next[newName] = normalizedAlt;
          return next;
        });
        replaceLibraryUrl(role, newName);
      } else {
        setArtistNameAltByName((prev) => ({ ...prev, [albumArtistName]: normalizedAlt }));
      }

      if (result.mergedArtistId) {
        const { data } = await createClient()
          .from('artists')
          .select('*')
          .eq('id', result.mergedArtistId)
          .maybeSingle();
        if (data) {
          setArtistRecord(data as ArtistRecord);
        } else {
          setArtistRecord((prev) =>
            prev
              ? {
                  ...prev,
                  artist_name: newName,
                  name_alt: normalizedAlt,
                }
              : prev,
          );
        }
      } else {
        setArtistRecord((prev) =>
          prev
            ? {
                ...prev,
                artist_name: newName,
                name_alt: normalizedAlt,
              }
            : prev,
        );
      }
      toast.success('아티스트 이름을 저장했습니다.');
      return true;
    } catch {
      toast.error('이름 저장에 실패했습니다.');
      return false;
    } finally {
      setNameSaving(false);
    }
  };

  const handleAlbumAddClick = () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!selectedArtist) return;
    setAlbumFormItem({ isManual: true });
    setAlbumFormData(albumFormDataFromArtist(selectedArtist, role));
  };

  const navigateToMood = (moodName: string) => {
    setViewingAlbum(null);
    const sp = new URLSearchParams();
    sp.set('mood', moodName);
    router.push(`/albums?${sp.toString()}`);
  };

  const handleAlbumEditClick = () => {
    if (!viewingAlbum) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const item = viewingAlbum;
    setViewingAlbum(null);
    setAlbumFormItem(item);
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
    if (isAuthenticated !== true) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!albumFormItem) return;
    setIsSaving(true);
    try {
      const data = {
        ...albumFormData,
        matching1: albumFormData.matching1 === ' ' ? '' : albumFormData.matching1,
        matching2: albumFormData.matching2 === ' ' ? '' : albumFormData.matching2,
      };
      const updateId =
        'id' in albumFormItem && typeof albumFormItem.id === 'number' ? albumFormItem.id : null;
      if (updateId != null) {
        await updateAlbumInDB(updateId, data);
        const { data: updatedRow } = await createClient()
          .from('album')
          .select('*')
          .eq('id', updateId)
          .single();
        if (updatedRow) {
          const updated = updatedRow as Album;
          setAlbums((prev) => prev.map((a) => (a.id === updateId ? updated : a)));
          setViewingAlbum(updated);
          setAudioTags(updated.audio_tags ?? []);
        }
        toast.success('앨범 정보가 수정되었습니다.');
      } else {
        const saved = await saveAlbumToDB(data);
        const savedId =
          saved && typeof saved === 'object' && 'id' in saved ? (saved as { id: number }).id : null;
        if (savedId != null) {
          const { data: newRow } = await createClient()
            .from('album')
            .select('*')
            .eq('id', savedId)
            .single();
          if (newRow) {
            const created = newRow as Album;
            setAlbums((prev) => {
              const next = [...prev, created];
              next.sort(
                (a, b) =>
                  new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime(),
              );
              return next;
            });
          }
        }
        toast.success('앨범이 등록되었습니다.');
      }
      setAlbumFormItem(null);
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

  const handleDeleteFromModal = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!viewingAlbum) return;
    const deletedId = viewingAlbum.id;
    setIsDeleting(true);
    try {
      await deleteAlbumFromDB(deletedId);
      toast.success('앨범이 삭제되었습니다.');
      setViewingAlbum(null);
      setAlbumFormItem((prev) =>
        prev && 'id' in prev && prev.id === deletedId ? null : prev,
      );
      setAlbums((prev) => prev.filter((a) => a.id !== deletedId));
      setListenHistoryIndex((prev) => {
        const next = new Map(prev);
        next.delete(deletedId);
        return next;
      });
    } catch (e) {
      const message =
        e instanceof Error && e.message === 'Unauthorized'
          ? '로그인이 필요합니다.'
          : '삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
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

  const sidebarProps = {
    artists: filteredArtists,
    selectedName,
    onSelect: handleSelectArtist,
    emptyMessage: role === 'composer' ? '표시할 작곡가가 없습니다.' : undefined,
  };

  const topControlBar = (
    <ArtistTopControlBar
      role={role}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      countryFilter={countryFilter}
      setCountryFilter={setCountryFilter}
      eraFilter={eraFilter}
      setEraFilter={setEraFilter}
      eraOptions={eraOptions}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      genreFilter={genreFilter}
      setGenreFilter={setGenreFilter}
      sortOption={sortOption}
      setSortOption={setSortOption}
      countryOptions={countryOptions}
      typeOptions={typeOptions}
      genreOptions={genreOptions}
      genre2Tags={genre2Tags}
      genre2Filter={genre2Filter}
      onGenre2TagSelect={handleGenre2TagSelect}
      onResetFilters={resetFilters}
    />
  );

  const detailPanel = (
    <ArtistDetailPanel
      role={role}
      artist={selectedArtist}
      artistRecord={artistRecord}
      artistStats={selectedArtistStats}
      popularAlbumId={selectedPopularAlbumId}
      relatedArtists={selectedRelatedArtists}
      bioLoading={bioLoading}
      linksSaving={linksSaving}
      profileSaving={profileSaving}
      nameSaving={nameSaving}
      isAuthenticated={isAuthenticated}
      onAlbumClick={setViewingAlbum}
      onAddAlbum={handleAlbumAddClick}
      onSelectArtist={handleSelectArtist}
      onRefreshBio={() => void handleRefreshBio()}
      onSaveLinks={handleSaveLinks}
      onSaveProfileImage={handleSaveProfileImage}
      onSaveNames={handleSaveNames}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:pb-0" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title flex shrink-0 items-center gap-2">
          <Mic2 className="size-7 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
          Artists
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label="아티스트 역할"
          >
            {(['artist', 'composer'] as const).map((value) => {
              const active = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRoleChange(value)}
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
                    color: active ? 'var(--background)' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                  aria-pressed={active}
                >
                  {value === 'composer' ? '작곡가' : '아티스트'}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={summaries.length === 0}
            onClick={() => setArtistLotteryOpen(true)}
            className="btn-apple btn-apple-secondary flex h-[42px] items-center justify-center gap-1.5 px-3 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={role === 'composer' ? '추천 작곡가' : '추천 아티스트'}
          >
            <Sparkles className="size-4 shrink-0 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {role === 'composer' ? '추천 작곡가' : '추천 아티스트'}
            </span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[16rem] items-center justify-center text-sm opacity-70">로딩 중...</div>
      ) : summaries.length === 0 ? (
        <p className="text-sm opacity-70">
          {role === 'composer'
            ? '작곡가가 등록된 앨범이 없습니다.'
            : '등록된 앨범이 없어 아티스트를 표시할 수 없습니다.'}
        </p>
      ) : (
        <>
          {topControlBar}
          <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <div>
              <div className="sticky top-[var(--app-header-height)] h-[calc(100dvh-var(--app-header-height)-var(--player-inset))] min-h-0">
                <ArtistListSidebar {...sidebarProps} />
              </div>
            </div>
            <div className="min-w-0 pb-8">{detailPanel}</div>
          </div>

          <div className="lg:hidden">
            <div className="max-h-[calc(100dvh-16rem)] min-h-[20rem]">
              <ArtistListSidebar {...sidebarProps} />
            </div>
          </div>
        </>
      )}

      {mobileOverlayOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex flex-col"
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
              role="dialog"
              aria-modal="true"
              aria-label={selectedArtist?.name ?? '아티스트 상세'}
            >
              <div
                className="flex h-14 shrink-0 items-center gap-2 border-b px-2"
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
              >
                <button
                  type="button"
                  onClick={closeMobileOverlay}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                  aria-label="닫기"
                >
                  <ChevronLeft className="size-5" strokeWidth={2} />
                </button>
                <h2 className="min-w-0 flex-1 truncate pr-3 text-sm font-semibold">
                  {selectedArtist?.name ?? artistQuery}
                </h2>
              </div>
              <div ref={overlayScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <ArtistDetailPanel
                  role={role}
                  artist={selectedArtist}
                  artistRecord={artistRecord}
                  artistStats={selectedArtistStats}
                  popularAlbumId={selectedPopularAlbumId}
                  relatedArtists={selectedRelatedArtists}
                  bioLoading={bioLoading}
                  linksSaving={linksSaving}
                  profileSaving={profileSaving}
                  nameSaving={nameSaving}
                  isAuthenticated={isAuthenticated}
                  onAlbumClick={setViewingAlbum}
                  onAddAlbum={handleAlbumAddClick}
                  onSelectArtist={handleSelectArtist}
                  onRefreshBio={() => void handleRefreshBio()}
                  onSaveLinks={handleSaveLinks}
                  onSaveProfileImage={handleSaveProfileImage}
                  onSaveNames={handleSaveNames}
                />
              </div>
            </div>,
            document.body,
          )
        : null}

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
          onDelete={() => void handleDeleteFromModal()}
          isDeleting={isDeleting}
          isAuthenticated={isAuthenticated}
          onAlbumPatch={(updated) => {
            setViewingAlbum(updated);
            setAlbums((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          }}
          onNavigateToMood={navigateToMood}
        />
      ) : null}

      {albumFormItem ? (
        <AlbumForm
          selectedItem={albumFormItem}
          formData={albumFormData}
          setFormData={setAlbumFormData}
          headfiOwnedHeadphones={headfiOwnedHeadphones}
          onClose={() => setAlbumFormItem(null)}
          onSave={() => void handleAlbumSave()}
          onImageUpload={handleAlbumImageUpload}
          isSaving={isSaving}
        />
      ) : null}

      <ArtistLotteryModal
        open={artistLotteryOpen}
        onClose={() => setArtistLotteryOpen(false)}
        lotteryPool={artistLotteryPool}
        onArtistClick={handleSelectArtist}
        title={role === 'composer' ? '추천 작곡가' : '추천 아티스트'}
      />
    </div>
  );
}
