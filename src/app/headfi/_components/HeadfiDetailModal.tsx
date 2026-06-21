'use client';

import { useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { DeletingLabel } from '@/components/AsyncMutationUi';
import type { Headfi } from '../types';
import { HeadfiInfoSection } from './HeadfiInfoSection';
import { HeadfiFrSection } from './HeadfiFrSection';
import { HeadfiRadarSection } from './HeadfiRadarSection';
import { HeadfiMatchedAlbumsSection } from './HeadfiMatchedAlbumsSection';

type HeadfiDetailModalProps = {
  viewingItem: Headfi;
  matchedAlbums: { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[];
  matchedMatchingDevice: { id: number; brand: string; model: string } | null;
  matchedHeadphones: { id: number; brand: string; model: string; category: string }[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
  isAuthenticated: boolean | null;
  isDeleting?: boolean;
};

export function HeadfiDetailModal({
  viewingItem,
  matchedAlbums,
  matchedMatchingDevice,
  matchedHeadphones,
  onClose,
  onEdit,
  onDelete,
  onHeadfiPatch,
  isAuthenticated,
  isDeleting = false,
}: HeadfiDetailModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative scrollbar-hide">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="flex size-8 items-center justify-center rounded-lg opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                disabled={isDeleting}
                aria-label="정보 수정하기"
                title="정보 수정하기"
              >
                <Pencil className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex size-8 items-center justify-center rounded-lg opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                disabled={isDeleting}
                aria-busy={isDeleting}
                aria-label="삭제하기"
                title="삭제하기"
              >
                {isDeleting ? <DeletingLabel /> : <Trash2 className="size-4" strokeWidth={2} />}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg text-3xl font-semibold leading-none opacity-60 transition-opacity hover:opacity-100"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <HeadfiInfoSection
          viewingItem={viewingItem}
          matchedMatchingDevice={matchedMatchingDevice}
          matchedHeadphones={matchedHeadphones}
        />

        <HeadfiFrSection
          viewingItem={viewingItem}
          isAuthenticated={isAuthenticated}
          onHeadfiPatch={onHeadfiPatch}
        />

        <HeadfiRadarSection
          viewingItem={viewingItem}
          isAuthenticated={isAuthenticated}
          onHeadfiPatch={onHeadfiPatch}
        />

        <HeadfiMatchedAlbumsSection
          headfiId={viewingItem.id}
          matchedAlbums={matchedAlbums}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
