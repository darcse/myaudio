'use client';

import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { uploadAlbumCoverImage } from './actions';
import type { AlbumFormData } from './types';

export function createAlbumCoverUploadHandler(setFormData: Dispatch<SetStateAction<AlbumFormData>>) {
  return async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('커버 이미지를 올리는 중…');
    try {
      const url = await uploadAlbumCoverImage(file);
      setFormData((prev) => ({ ...prev, cover_image_url: url }));
      toast.success('커버 이미지를 올렸습니다.', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '커버 이미지를 올리지 못했습니다.', { id: toastId });
    }
  };
}
