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
        <div className="sticky top-0 z-50 flex justify-end h-0 overflow-visible">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-3xl font-semibold opacity-60 hover:opacity-100 transition-opacity leading-none bg-transparent rounded-bl-lg"
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

        {isAuthenticated ? (
          <div className="flex gap-4 pt-8 mb-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onEdit}
              className="btn-apple btn-apple-secondary flex-1 py-3 flex items-center justify-center disabled:opacity-60"
              disabled={isDeleting}
            >
              <Pencil className="size-4 shrink-0 mr-1.5" /> 정보 수정하기
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="btn-apple btn-apple-danger flex-1 py-3 flex items-center justify-center disabled:opacity-60 disabled:pointer-events-none"
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? (
                <DeletingLabel />
              ) : (
                <>
                  <Trash2 className="size-4 shrink-0 mr-1.5" /> 삭제하기
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
