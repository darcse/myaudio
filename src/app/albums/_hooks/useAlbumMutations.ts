'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { deleteAlbumFromDB, saveAlbumToDB, updateAlbumInDB } from '@/app/albums/actions';
import type { Album, AlbumFormData, SelectedAlbum } from '@/app/albums/types';

function mutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message === 'Unauthorized'
    ? '로그인이 필요합니다.'
    : fallback;
}

function normalizeAlbumFormData(formData: AlbumFormData): AlbumFormData {
  return {
    ...formData,
    matching1: formData.matching1 === ' ' ? '' : formData.matching1,
    matching2: formData.matching2 === ' ' ? '' : formData.matching2,
  };
}

function getAlbumUpdateId(item: SelectedAlbum): number | null {
  return 'id' in item && typeof item.id === 'number' ? item.id : null;
}

export type SaveAlbumResult =
  | { status: 'updated'; album: Album | null }
  | { status: 'created'; saved: unknown }
  | { status: 'skipped' }
  | { status: 'error' };

type UseAlbumMutationsOptions = {
  isAuthenticated: boolean | null;
};

export function enqueueNewAlbumIntroGeneration(albumId: number, onComplete?: () => void) {
  void fetch('/api/album-intro', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumId }),
  })
    .then((res) => {
      if (!res.ok) {
        toast.error('앨범 소개 자동 생성에 실패했습니다. 나중에 새로고침으로 다시 시도할 수 있어요.');
        return;
      }
      toast.success('앨범 소개와 태그가 생성되었습니다.');
    })
    .catch(() => {
      toast.error('앨범 소개 자동 생성에 실패했습니다. 나중에 새로고침으로 다시 시도할 수 있어요.');
    });
  void fetch('/api/album-mood-assign', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumId }),
  }).finally(() => {
    onComplete?.();
  });
}

export function useAlbumMutations({ isAuthenticated }: UseAlbumMutationsOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [albumIntroLoading, setAlbumIntroLoading] = useState(false);

  const saveAlbum = useCallback(
    async (params: {
      formItem: SelectedAlbum;
      formData: AlbumFormData;
      updateSuccessMessage?: string;
      createSuccessMessage?: string;
    }): Promise<SaveAlbumResult> => {
      if (isAuthenticated !== true) {
        toast.error('로그인이 필요합니다.');
        return { status: 'skipped' };
      }
      setIsSaving(true);
      const data = normalizeAlbumFormData(params.formData);
      const updateId = getAlbumUpdateId(params.formItem);
      try {
        if (updateId != null) {
          await updateAlbumInDB(updateId, data);
          const { data: updatedRow } = await createClient()
            .from('album')
            .select('*')
            .eq('id', updateId)
            .single();
          toast.success(params.updateSuccessMessage ?? '앨범 정보가 수정되었습니다.');
          return { status: 'updated', album: updatedRow ? (updatedRow as Album) : null };
        }
        const saved = await saveAlbumToDB(data);
        toast.success(params.createSuccessMessage ?? '앨범이 등록되었습니다.');
        return { status: 'created', saved };
      } catch (error) {
        toast.error(mutationErrorMessage(error, '저장 중 오류가 발생했습니다.'));
        return { status: 'error' };
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated],
  );

  const deleteAlbum = useCallback(
    async (params: {
      albumId: number;
      confirmMessage?: string;
    }): Promise<boolean> => {
      if (isAuthenticated === false) {
        toast.error('로그인이 필요합니다.');
        return false;
      }
      if (!confirm(params.confirmMessage ?? '정말 이 앨범을 삭제하시겠습니까?')) {
        return false;
      }
      setIsDeleting(true);
      try {
        await deleteAlbumFromDB(params.albumId);
        toast.success('앨범이 삭제되었습니다.');
        return true;
      } catch (error) {
        toast.error(mutationErrorMessage(error, '삭제 중 오류가 발생했습니다.'));
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [isAuthenticated],
  );

  const refreshAlbumIntro = useCallback(
    async (params: {
      album: Album;
      assignMood?: boolean;
      onUpdated: (album: Album, audioTags: string[]) => void | Promise<void>;
      onMoodAssigned?: (albumId: number, moodName: string) => void | Promise<void>;
    }) => {
      if (isAuthenticated === false) return;
      setAlbumIntroLoading(true);
      try {
        const res = await fetch('/api/album-intro', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ albumId: params.album.id }),
        });
        let payload: { error?: string; audio_tags?: string[]; album_intro?: string } = {};
        try {
          payload = await res.json();
        } catch {
          throw new Error('응답을 읽을 수 없습니다.');
        }
        if (!res.ok) throw new Error(payload.error ?? 'Generation failed');
        const updated: Album = {
          ...params.album,
          audio_tags: payload.audio_tags ?? [],
          album_intro: payload.album_intro ?? '',
          ai_recommended_headphone_ids: null,
          ai_recommended_headphone_reason: null,
        };
        const audioTags = payload.audio_tags ?? [];
        await params.onUpdated(updated, audioTags);
        toast.success('앨범 소개와 태그를 갱신했습니다.');

        if (!params.assignMood) return;
        const albumId = params.album.id;
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
            await params.onMoodAssigned?.(albumId, moodName);
          })
          .catch(() => {});
      } catch {
        toast.error('앨범 소개 갱신에 실패했습니다.');
      } finally {
        setAlbumIntroLoading(false);
      }
    },
    [isAuthenticated],
  );

  return {
    isSaving,
    isDeleting,
    albumIntroLoading,
    saveAlbum,
    deleteAlbum,
    refreshAlbumIntro,
  };
}
