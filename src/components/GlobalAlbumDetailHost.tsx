'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAlbumMutations } from '@/app/albums/_hooks/useAlbumMutations';
import type { Album, AlbumFormData } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { useAlbumPlayer } from '@/contexts/AlbumPlayerContext';
import { useAuthState } from '@/hooks/useAuthState';
import { createClient } from '@/lib/supabase/client';

const AlbumDetailModal = dynamic(() =>
  import('@/app/albums/_components/AlbumDetailModal').then((m) => ({ default: m.AlbumDetailModal })),
);
const AlbumForm = dynamic(() =>
  import('@/app/albums/_components/AlbumForm').then((m) => ({ default: m.AlbumForm })),
);

const emptyFormData: AlbumFormData = {
  artist: '',
  artist_type: '',
  country: '',
  album_name: '',
  album_type: '',
  year: [],
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

export function GlobalAlbumDetailHost() {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const { detailAlbumId, closeAlbumDetail, patchCurrentMeta } = useAlbumPlayer();
  const { isSaving, isDeleting, albumIntroLoading, saveAlbum, deleteAlbum, refreshAlbumIntro } =
    useAlbumMutations({ isAuthenticated });
  const [album, setAlbum] = useState<Album | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<AlbumFormData>(emptyFormData);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);

  useEffect(() => {
    if (detailAlbumId == null) {
      setAlbum(null);
      setEditing(false);
      setRecommendedHeadphones([]);
      setAudioTags([]);
      return;
    }
    let cancelled = false;
    setEditing(false);
    setAlbum((prev) => (prev?.id === detailAlbumId ? prev : null));
    void createClient()
      .from('album')
      .select('*')
      .eq('id', detailAlbumId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          toast.error('앨범 정보를 불러오지 못했습니다.');
          closeAlbumDetail();
          return;
        }
        const next = data as Album;
        setAlbum(next);
        setAudioTags(next.audio_tags ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [detailAlbumId, closeAlbumDetail]);

  useEffect(() => {
    if (!album) {
      setRecommendedHeadphones([]);
      return;
    }
    const ids = (album.manual_recommended_headphone_ids ?? []).slice(0, 2);
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
  }, [album]);

  useEffect(() => {
    if (!editing || isAuthenticated !== true) return;
    void createClient()
      .from('headfi')
      .select('id,brand,model')
      .in('category', ['헤드폰', '이어폰'])
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
  }, [editing, isAuthenticated]);

  const handleRefreshAlbumIntro = useCallback(async () => {
    if (!album) return;
    await refreshAlbumIntro({
      album,
      assignMood: true,
      onUpdated: (updated, tags) => {
        setAlbum(updated);
        setAudioTags(tags);
      },
      onMoodAssigned: (albumId, moodName) => {
        setAlbum((prev) => (prev?.id === albumId ? { ...prev, mood_name: moodName } : prev));
      },
    });
  }, [album, refreshAlbumIntro]);

  const handleEdit = () => {
    if (!album) return;
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setFormData(albumToFormData(album, { album_intro: album.album_intro ?? '' }));
    setEditing(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () =>
      setFormData((prev) => ({ ...prev, cover_image_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!album) return;
    const result = await saveAlbum({
      formItem: album,
      formData,
    });
    if (result.status === 'skipped' || result.status === 'error') return;
    if (result.status === 'updated' && result.album) {
      const next = result.album;
      setAlbum(next);
      setAudioTags(next.audio_tags ?? []);
      patchCurrentMeta(next.id, {
        albumName: next.album_name,
        artist: next.artist ?? '',
        coverImageUrl: next.cover_image_url,
        playlistId: next.youtube_playlist_id ?? '',
        country: next.country,
      });
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!album) return;
    const deleted = await deleteAlbum({ albumId: album.id });
    if (!deleted) return;
    closeAlbumDetail();
  };

  if (detailAlbumId == null || !album) return null;

  if (editing) {
    return (
      <AlbumForm
        selectedItem={album}
        formData={formData}
        setFormData={setFormData}
        headfiOwnedHeadphones={headfiOwnedHeadphones}
        onClose={() => setEditing(false)}
        onSave={() => void handleSave()}
        onDelete={() => void handleDelete()}
        onImageUpload={handleImageUpload}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />
    );
  }

  return (
    <AlbumDetailModal
      viewingItem={album}
      recommendedHeadphones={recommendedHeadphones}
      albumIntro={(album.album_intro ?? '').trim()}
      audioTags={audioTags}
      albumIntroLoading={albumIntroLoading}
      onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
      onClose={closeAlbumDetail}
      onEdit={handleEdit}
      onDelete={() => void handleDelete()}
      isAuthenticated={isAuthenticated}
      isDeleting={isDeleting}
      onNavigateToMood={(moodName) => {
        closeAlbumDetail();
        router.push(`/albums?mood=${encodeURIComponent(moodName)}`);
      }}
      onAlbumPatch={(updated) => {
        setAlbum(updated);
        patchCurrentMeta(updated.id, {
          albumName: updated.album_name,
          artist: updated.artist ?? '',
          coverImageUrl: updated.cover_image_url,
          playlistId: updated.youtube_playlist_id ?? '',
          country: updated.country,
        });
      }}
      onHeadfiClick={(id) => {
        closeAlbumDetail();
        router.push(`/headfi?view=${id}`);
      }}
    />
  );
}
