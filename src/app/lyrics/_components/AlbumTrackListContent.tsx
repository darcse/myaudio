/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { AlbumDetailModal } from '@/app/albums/_components/AlbumDetailModal';
import { AlbumForm } from '@/app/albums/_components/AlbumForm';
import { useAlbumMutations } from '@/app/albums/_hooks/useAlbumMutations';
import { countryOptions } from '@/app/albums/constants';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';
import { albumToFormData } from '@/app/albums/utils';
import { replaceAlbumTracks } from '../actions';
import type { TrackWithTranslation } from '../types';

type AlbumMeta = {
  id: number;
  album_name: string;
  artist: string | null;
  country: string | null;
  cover_image_url: string | null;
  release_date: string | null;
  genre1: string | null;
};

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
};

function formatAlbumMetaLine(album: AlbumMeta): string {
  return [
    `${album.country ? `${countryOptions.find((c) => c.name === album.country)?.flag || ''} ` : ''}${album.artist || '-'}`.trim(),
    album.release_date ? album.release_date.substring(0, 4) : null,
    album.genre1 ? album.genre1.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function albumToMeta(album: Album): AlbumMeta {
  return {
    id: album.id,
    album_name: album.album_name,
    artist: album.artist,
    country: album.country,
    cover_image_url: album.cover_image_url,
    release_date: album.release_date,
    genre1: album.genre1,
  };
}

export function AlbumTrackListContent({ albumId }: { albumId: number }) {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [album, setAlbum] = useState<AlbumMeta | null>(null);
  const [tracks, setTracks] = useState<TrackWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [manualText, setManualText] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [detailOpening, setDetailOpening] = useState(false);
  const [albumFormItem, setAlbumFormItem] = useState<SelectedAlbum | null>(null);
  const [albumFormData, setAlbumFormData] = useState<AlbumFormData>(initialAlbumFormData);
  const [recommendedHeadphones, setRecommendedHeadphones] = useState<
    { id: number; brand: string; model: string; image_url?: string | null }[]
  >([]);
  const [audioTags, setAudioTags] = useState<string[]>([]);
  const [headfiOwnedHeadphones, setHeadfiOwnedHeadphones] = useState<
    { id: number; brand: string; model: string }[]
  >([]);
  const { isSaving, isDeleting, albumIntroLoading, saveAlbum, deleteAlbum, refreshAlbumIntro } =
    useAlbumMutations({ isAuthenticated });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = createClient();
      const [{ data: albumRow, error: albumError }, { data: trackRows, error: trackError }] =
        await Promise.all([
          client
            .from('album')
            .select('id, album_name, artist, cover_image_url, country, release_date, genre1')
            .eq('id', albumId)
            .maybeSingle(),
          client
            .from('lyrics_translation_tracks')
            .select('*')
            .eq('album_id', albumId)
            .order('track_number'),
        ]);
      if (albumError) throw albumError;
      if (trackError) throw trackError;
      if (!albumRow) {
        toast.error('앨범을 찾을 수 없습니다.');
        router.push('/lyrics');
        return;
      }
      setAlbum(albumRow as AlbumMeta);

      const list = (trackRows ?? []) as TrackWithTranslation[];
      const ids = list.map((t) => t.id);
      const translationByTrack = new Map<string, TrackWithTranslation['translation']>();
      if (ids.length > 0) {
        const { data: translations, error: trError } = await client
          .from('lyrics_translations')
          .select('*')
          .in('track_id', ids);
        if (trError) throw trError;
        for (const tr of translations ?? []) {
          translationByTrack.set(tr.track_id, tr as NonNullable<TrackWithTranslation['translation']>);
        }
      }
      setTracks(
        list.map((t) => ({
          ...t,
          translation: translationByTrack.get(t.id) ?? null,
        })),
      );
    } catch (e) {
      toast.error(getClientErrorMessage(e));
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [albumId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setHeadfiOwnedHeadphones([]);
      return;
    }
    void createClient()
      .from('headfi')
      .select('id, brand, model')
      .in('category', ['헤드폰', '이어폰'])
      .eq('status2', '보유중')
      .order('brand')
      .order('model')
      .then(({ data }) => {
        setHeadfiOwnedHeadphones(
          (data ?? []).map((r) => ({ id: r.id, brand: r.brand || '', model: r.model || '' })),
        );
      });
  }, [isAuthenticated]);

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

  const openAlbumDetail = async () => {
    setDetailOpening(true);
    try {
      const { data, error } = await createClient()
        .from('album')
        .select('*')
        .eq('id', albumId)
        .maybeSingle();
      if (error || !data) {
        toast.error('앨범 정보를 불러오지 못했습니다.');
        return;
      }
      setViewingAlbum(data as Album);
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setDetailOpening(false);
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
    if (!albumFormItem) return;
    const result = await saveAlbum({ formItem: albumFormItem, formData: albumFormData });
    if (result.status === 'updated') {
      if (result.album) {
        setAlbum(albumToMeta(result.album));
        setViewingAlbum(result.album);
        setAudioTags(result.album.audio_tags ?? []);
      }
      setAlbumFormItem(null);
      return;
    }
    if (result.status === 'created') {
      await load();
      setAlbumFormItem(null);
    }
  };

  const handleDeleteFromModal = async () => {
    if (!viewingAlbum) return;
    const deletedId = viewingAlbum.id;
    const deleted = await deleteAlbum({ albumId: deletedId });
    if (!deleted) return;
    setViewingAlbum(null);
    router.push('/lyrics');
  };

  const handleRefreshAlbumIntro = async () => {
    if (!viewingAlbum) return;
    await refreshAlbumIntro({
      album: viewingAlbum,
      onUpdated: (updated, tags) => {
        setViewingAlbum(updated);
        setAlbum(albumToMeta(updated));
        setAudioTags(tags);
      },
    });
  };

  const parseManualTracks = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const tracksOut: { track_number: number; track_title: string }[] = [];
    lines.forEach((line, i) => {
      const m = line.match(/^(\d+)[.\):\-\s]+(.+)$/);
      if (m) {
        tracksOut.push({ track_number: parseInt(m[1], 10), track_title: m[2].trim() });
      } else {
        tracksOut.push({ track_number: i + 1, track_title: line });
      }
    });
    return tracksOut.filter((t) => t.track_title);
  };

  const handleAiFetch = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/lyrics-tracklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId }),
      });
      const json = (await res.json()) as { tracks?: { track_number: number; track_title: string }[]; error?: string };
      if (!res.ok || !json.tracks) {
        throw new Error(json.error || '트랙리스트를 불러오지 못했습니다.');
      }
      await replaceAlbumTracks(albumId, json.tracks);
      toast.success(`${json.tracks.length}곡 트랙리스트를 저장했습니다.`);
      await load();
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    const parsed = parseManualTracks(manualText);
    if (parsed.length === 0) {
      toast.error('트랙을 한 줄에 하나씩 입력해 주세요.');
      return;
    }
    setSavingManual(true);
    try {
      await replaceAlbumTracks(albumId, parsed);
      toast.success(`${parsed.length}곡을 저장했습니다.`);
      setManualText('');
      await load();
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setSavingManual(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="size-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6 flex items-start gap-3">
        <Link
          href="/lyrics"
          className="mt-0.5 flex size-[38px] shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          aria-label="목록으로"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="size-16 shrink-0 overflow-hidden rounded-xl"
            style={{ background: 'var(--badge-bg)', boxShadow: 'var(--shadow)' }}
          >
            {album?.cover_image_url ? (
              <img src={album.cover_image_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{album?.album_name}</h1>
            {album ? (
              <p className="line-clamp-2 break-words text-sm leading-snug opacity-65">
                {formatAlbumMetaLine(album)}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          disabled={detailOpening || !album}
          onClick={() => void openAlbumDetail()}
          className="btn-apple btn-apple-secondary mt-1 shrink-0 self-start px-3 py-2 text-xs font-semibold disabled:opacity-40 sm:text-sm"
        >
          {detailOpening ? '불러오는 중...' : '앨범 상세보기'}
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <p className="mb-3 text-sm font-semibold">트랙리스트가 없습니다</p>
            <p className="mb-4 text-xs opacity-65">
              AI로 곡 제목·순번만 조회합니다. 가사 원문은 가져오지 않습니다.
            </p>
            <button
              type="button"
              disabled={aiLoading || isAuthenticated === false}
              onClick={() => void handleAiFetch()}
              className="btn-apple inline-flex h-[42px] items-center gap-2 px-4 text-sm font-semibold disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              AI로 트랙리스트 불러오기
            </button>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            <p className="mb-2 text-sm font-semibold">직접 입력</p>
            <p className="mb-3 text-xs opacity-65">한 줄에 한 곡. 예: 1. Opening / Opening</p>
            <textarea
              className="input-apple min-h-[180px] w-full resize-y p-3 text-sm"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={'1. Track One\n2. Track Two'}
            />
            <button
              type="button"
              disabled={savingManual || isAuthenticated === false}
              onClick={() => void handleManualSave()}
              className="btn-apple btn-apple-secondary mt-3 h-[40px] px-4 text-sm font-semibold disabled:opacity-40"
            >
              {savingManual ? '저장 중...' : '트랙리스트 저장'}
            </button>
          </div>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl" style={{ border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
          {tracks.map((track) => {
            const registered = Boolean(track.translation);
            return (
              <li
                key={track.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
              >
                <span className="w-8 shrink-0 text-center text-xs font-semibold tabular-nums opacity-55">
                  {track.track_number}
                </span>
                {registered ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => router.push(`/lyrics/${albumId}/${track.id}`)}
                  >
                    <p className="truncate text-sm font-semibold">{track.track_title}</p>
                    <span className="mt-0.5 inline-block text-[11px] font-semibold" style={{ color: '#0a84ff' }}>
                      등록됨
                    </span>
                  </button>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{track.track_title}</p>
                  </div>
                )}
                {registered ? (
                  <Link
                    href={`/lyrics/${albumId}/${track.id}`}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    열람
                  </Link>
                ) : (
                  <Link
                    href={`/lyrics/${albumId}/${track.id}/edit`}
                    className="btn-apple shrink-0 px-3 py-1.5 text-xs font-semibold"
                  >
                    +가사 추가
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {viewingAlbum ? (
        <AlbumDetailModal
          viewingItem={viewingAlbum}
          recommendedHeadphones={recommendedHeadphones}
          albumIntro={viewingAlbum.album_intro ?? viewingAlbum.ai_recommended_headphone_reason ?? ''}
          audioTags={audioTags}
          albumIntroLoading={albumIntroLoading}
          onRefreshAlbumIntro={() => void handleRefreshAlbumIntro()}
          onClose={() => setViewingAlbum(null)}
          onEdit={handleAlbumEditClick}
          onDelete={() => void handleDeleteFromModal()}
          isAuthenticated={isAuthenticated}
          isDeleting={isDeleting}
          onAlbumPatch={(updated) => {
            setViewingAlbum(updated);
            setAlbum(albumToMeta(updated));
          }}
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
    </div>
  );
}
