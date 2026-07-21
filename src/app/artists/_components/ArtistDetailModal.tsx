'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Album } from '@/app/albums/types';
import { ensureArtistRecord } from '../lib/ensureArtistRecord';
import { updateArtistNames } from '../lib/updateArtistNames';
import type { ArtistLinksPatch } from './ArtistExternalLinksSection';
import { ArtistDetailPanel } from './ArtistDetailPanel';
import {
  buildArtistSummaries,
  buildArtistNameAltMap,
  applyArtistNameAltMap,
  getArtistStats,
  getPopularAlbumId,
  getRelatedArtists,
  isSameArtistName,
  normalizeArtistNameAlt,
} from '../utils';
import type { ArtistRecord, ListenHistoryEntry } from '../types';

type ArtistDetailModalProps = {
  artistName: string;
  albums: Album[];
  listenHistoryIndex: Map<number, ListenHistoryEntry>;
  isAuthenticated: boolean | null;
  onClose: () => void;
  onAlbumClick: (album: Album) => void;
  onSelectArtist: (name: string) => void;
  onArtistNamesUpdated?: (context: {
    albumArtistName: string;
    recordArtistName: string;
    newName: string;
    nameAlt: string | null;
  }) => void;
};

export function ArtistDetailModal({
  artistName,
  albums,
  listenHistoryIndex,
  isAuthenticated,
  onClose,
  onAlbumClick,
  onSelectArtist,
  onArtistNamesUpdated,
}: ArtistDetailModalProps) {
  const [artistRecord, setArtistRecord] = useState<ArtistRecord | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [artistProfileUrls, setArtistProfileUrls] = useState<Record<string, string | null>>({});
  const [artistNameAltByName, setArtistNameAltByName] = useState<Record<string, string | null>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureArtistRecord(artistName).then((record) => {
      if (!cancelled) setArtistRecord(record);
    });
    return () => {
      cancelled = true;
    };
  }, [artistName]);

  useEffect(() => {
    void createClient()
      .from('artists')
      .select('artist_name, profile_image_url, name_alt')
      .then(({ data }) => {
        const profiles: Record<string, string | null> = {};
        for (const row of data ?? []) {
          const name = typeof row.artist_name === 'string' ? row.artist_name.trim() : '';
          if (!name) continue;
          profiles[name] =
            typeof row.profile_image_url === 'string' && row.profile_image_url.trim()
              ? row.profile_image_url.trim()
              : null;
        }
        setArtistProfileUrls(profiles);
        setArtistNameAltByName(buildArtistNameAltMap(data ?? []));
      });
  }, []);

  const summaries = useMemo(
    () => applyArtistNameAltMap(buildArtistSummaries(albums), artistNameAltByName),
    [albums, artistNameAltByName],
  );
  const artist = useMemo(
    () => summaries.find((item) => item.name === artistName) ?? null,
    [summaries, artistName],
  );
  const artistStats = useMemo(
    () => (artist ? getArtistStats(artist, listenHistoryIndex) : null),
    [artist, listenHistoryIndex],
  );
  const popularAlbumId = useMemo(
    () => (artist ? getPopularAlbumId(artist, listenHistoryIndex) : null),
    [artist, listenHistoryIndex],
  );
  const relatedArtists = useMemo(
    () => (artist ? getRelatedArtists(artist, summaries, artistProfileUrls) : []),
    [artist, summaries, artistProfileUrls],
  );

  const handleRefreshBio = async () => {
    if (isAuthenticated !== true) return;
    setBioLoading(true);
    try {
      const res = await fetch('/api/artist-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string; bio?: string };
      if (!res.ok) {
        toast.error(payload.error ?? '소개 생성에 실패했습니다.');
        return;
      }
      const { data } = await createClient()
        .from('artists')
        .select('*')
        .eq('artist_name', artistName)
        .maybeSingle();
      if (data) setArtistRecord(data as ArtistRecord);
      toast.success('아티스트 소개를 갱신했습니다.');
    } catch {
      toast.error('소개 생성에 실패했습니다.');
    } finally {
      setBioLoading(false);
    }
  };

  const handleSaveLinks = async (patch: ArtistLinksPatch): Promise<boolean> => {
    if (!artistRecord?.id || isAuthenticated !== true) return false;
    setLinksSaving(true);
    try {
      const { error } = await createClient().from('artists').update(patch).eq('id', artistRecord.id);
      if (error) {
        toast.error('외부 링크 저장에 실패했습니다.');
        return false;
      }
      setArtistRecord((prev) => (prev ? { ...prev, ...patch } : prev));
      toast.success('외부 링크를 저장했습니다.');
      return true;
    } catch {
      toast.error('외부 링크 저장에 실패했습니다.');
      return false;
    } finally {
      setLinksSaving(false);
    }
  };

  const handleSaveProfileImage = async (profileImageUrl: string | null): Promise<boolean> => {
    if (!artistRecord?.id || isAuthenticated !== true) return false;
    setProfileSaving(true);
    try {
      const { error } = await createClient()
        .from('artists')
        .update({ profile_image_url: profileImageUrl })
        .eq('id', artistRecord.id);
      if (error) {
        toast.error('프로필 이미지 저장에 실패했습니다.');
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
    if (!artistRecord?.id || isAuthenticated !== true) return false;
    const albumArtistName = artist?.name ?? artistName;
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
      setArtistNameAltByName((prev) => {
        const next = { ...prev };
        if (nameChanged || result.mergedArtistId) {
          for (const key of [albumArtistName, recordArtistName]) {
            if (key !== newName) delete next[key];
          }
          next[newName] = normalizedAlt;
        } else {
          next[albumArtistName] = normalizedAlt;
        }
        return next;
      });
      onArtistNamesUpdated?.({
        albumArtistName,
        recordArtistName,
        newName,
        nameAlt: normalizedAlt,
      });
      if (nameChanged || result.mergedArtistId) {
        onSelectArtist(newName);
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

  const modalTree = (
    <div
      className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="modal-panel-apple relative flex max-h-[min(48rem,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 z-20 flex size-8 items-center justify-center rounded-full text-lg font-semibold text-white transition-all hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          aria-label="닫기"
        >
          &times;
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ArtistDetailPanel
            artist={artist}
            artistRecord={artistRecord}
            artistStats={artistStats}
            popularAlbumId={popularAlbumId}
            relatedArtists={relatedArtists}
            bioLoading={bioLoading}
            linksSaving={linksSaving}
            profileSaving={profileSaving}
            nameSaving={nameSaving}
            isAuthenticated={isAuthenticated}
            onAlbumClick={onAlbumClick}
            onSelectArtist={onSelectArtist}
            onRefreshBio={() => void handleRefreshBio()}
            onSaveLinks={handleSaveLinks}
            onSaveProfileImage={handleSaveProfileImage}
            onSaveNames={handleSaveNames}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalTree, document.body);
}
