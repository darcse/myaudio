'use client';

import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { DeletingLabel } from '@/components/AsyncMutationUi';
import type { Album } from '../types';
import { AlbumInfoHeroSection, AlbumInfoSection } from './AlbumInfoSection';
import { AlbumIntroSection } from './AlbumIntroSection';
import { AlbumRecommendedGearSection } from './AlbumRecommendedGearSection';
import { AlbumListenHistorySection } from './AlbumListenHistorySection';

interface AlbumDetailModalProps {
  viewingItem: Album;
  recommendedHeadphones: { id: number; brand: string; model: string }[];
  albumIntro: string;
  audioTags: string[];
  albumIntroLoading: boolean;
  onRefreshAlbumIntro: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAuthenticated: boolean | null;
  isDeleting?: boolean;
  onNavigateToMood?: (moodName: string) => void;
}

const modalPanelStyle: CSSProperties = {
  padding: 0,
  maxHeight: 'min(56rem, calc(100dvh - 2rem))',
  height: 'min(56rem, calc(100dvh - 2rem))',
};

const modalBodyScrollStyle: CSSProperties = {
  flex: '1 1 0%',
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const btnIconClass = 'size-4 shrink-0 mr-1.5';

export function AlbumDetailModal({
  viewingItem,
  recommendedHeadphones,
  albumIntro,
  audioTags,
  albumIntroLoading,
  onRefreshAlbumIntro,
  onClose,
  onEdit,
  onDelete,
  isAuthenticated,
  isDeleting = false,
  onNavigateToMood,
}: AlbumDetailModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const showIntroBlock =
    isAuthenticated !== false ||
    albumIntroLoading ||
    audioTags.length > 0 ||
    albumIntro.trim().length > 0 ||
    recommendedHeadphones.length > 0;

  const modalTree = (
    <div className="modal-overlay-apple fixed inset-0 z-50 box-border flex flex-col overflow-hidden p-4">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="modal-panel-apple relative flex min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)]"
          style={modalPanelStyle}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full text-lg font-semibold text-white transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          >
            &times;
          </button>

          <AlbumInfoHeroSection viewingItem={viewingItem} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="scrollbar-hide min-h-0 flex-1 overscroll-y-contain" style={modalBodyScrollStyle}>
              <div className="min-w-0 p-6 space-y-5">
                <AlbumInfoSection viewingItem={viewingItem} onNavigateToMood={onNavigateToMood} />

                {showIntroBlock ? (
                  <>
                    <AlbumIntroSection
                      viewingItem={viewingItem}
                      albumIntro={albumIntro}
                      audioTags={audioTags}
                      albumIntroLoading={albumIntroLoading}
                      onRefreshAlbumIntro={onRefreshAlbumIntro}
                      isAuthenticated={isAuthenticated}
                    />
                    <AlbumRecommendedGearSection
                      albumId={viewingItem.id}
                      recommendedHeadphones={recommendedHeadphones}
                      albumIntroLoading={albumIntroLoading}
                      onClose={onClose}
                    />
                  </>
                ) : null}

                <AlbumListenHistorySection albumId={viewingItem.id} isAuthenticated={isAuthenticated} />

                {isAuthenticated ? (
                  <div className="flex gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={onEdit}
                      className="btn-apple btn-apple-secondary flex-1 py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isDeleting}
                    >
                      <Pencil className={btnIconClass} /> 정보 수정하기
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="btn-apple btn-apple-danger flex-1 py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
                      disabled={isDeleting}
                      aria-busy={isDeleting}
                    >
                      {isDeleting ? (
                        <DeletingLabel />
                      ) : (
                        <>
                          <Trash2 className={btnIconClass} /> 삭제하기
                        </>
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalTree, document.body);
}
