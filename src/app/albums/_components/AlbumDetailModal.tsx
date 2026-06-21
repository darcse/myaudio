'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DeletingLabel } from '@/components/AsyncMutationUi';
import type { Album } from '../types';
import { AlbumInfoHeroSection, AlbumInfoSection } from './AlbumInfoSection';
import { AlbumIntroSection } from './AlbumIntroSection';
import { AlbumRecommendedGearSection } from './AlbumRecommendedGearSection';
import { AlbumListenHistorySection } from './AlbumListenHistorySection';

type DetailTab = 'info' | 'gear' | 'listen';

interface AlbumDetailModalProps {
  viewingItem: Album;
  recommendedHeadphones: { id: number; brand: string; model: string; image_url?: string | null }[];
  aiRecommendedHeadphones?: { id: number; brand: string; model: string; image_url?: string | null }[];
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
  onAlbumPatch?: (album: Album) => void;
  onHeadfiClick?: (headfiId: number) => void;
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

const modalActionIconClass =
  'flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40';

const TAB_ITEMS: { id: DetailTab; label: string }[] = [
  { id: 'info', label: '앨범 정보' },
  { id: 'gear', label: '추천 헤드폰' },
  { id: 'listen', label: '청취 이력' },
];

function tabButtonClass(active: boolean): string {
  return `border-b-2 px-1 pb-3 text-sm transition-colors ${
    active
      ? 'border-[var(--foreground)] font-semibold opacity-100'
      : 'border-transparent opacity-60 hover:opacity-90'
  }`;
}

export function AlbumDetailModal({
  viewingItem,
  recommendedHeadphones,
  aiRecommendedHeadphones = [],
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
  onAlbumPatch,
  onHeadfiClick,
}: AlbumDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [localAiHeadphones, setLocalAiHeadphones] = useState(aiRecommendedHeadphones);
  const [localAiReason, setLocalAiReason] = useState<string | null>(
    viewingItem.ai_recommended_headphone_reason?.trim() || null,
  );
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setActiveTab('info');
  }, [viewingItem.id]);

  useEffect(() => {
    setLocalAiHeadphones(aiRecommendedHeadphones);
  }, [aiRecommendedHeadphones, viewingItem.id]);

  useEffect(() => {
    setLocalAiReason(viewingItem.ai_recommended_headphone_reason?.trim() || null);
  }, [viewingItem.id, viewingItem.ai_recommended_headphone_reason]);

  useEffect(() => {
    const ids = viewingItem.ai_recommended_headphone_ids ?? [];
    if (ids.length === 0) {
      setLocalAiHeadphones([]);
      return;
    }
    if (aiRecommendedHeadphones.length > 0) return;
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
        setLocalAiHeadphones(ordered);
      });
  }, [viewingItem.id, viewingItem.ai_recommended_headphone_ids, aiRecommendedHeadphones.length]);

  const handleRefreshAiRecommend = useCallback(async () => {
    if (isAuthenticated !== true || !onAlbumPatch) return;
    setAiRecommendLoading(true);
    try {
      const res = await fetch('/api/album-headphone-recommend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumId: viewingItem.id }),
      });
      let payload: { error?: string; headphone_ids?: number[]; reason?: string } = {};
      try {
        payload = await res.json();
      } catch {
        throw new Error('parse');
      }
      if (!res.ok) throw new Error(payload.error ?? 'Recommendation failed');
      const ids = payload.headphone_ids ?? [];
      const reason = (payload.reason ?? '').trim();
      const updated: Album = {
        ...viewingItem,
        ai_recommended_headphone_ids: ids.length > 0 ? ids : null,
        ai_recommended_headphone_reason: reason || null,
      };
      onAlbumPatch(updated);
      setLocalAiReason(reason || null);
      if (ids.length > 0) {
        const { data } = await createClient()
          .from('headfi')
          .select('id, brand, model, image_url')
          .in('id', ids);
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
        setLocalAiHeadphones(ordered);
      } else {
        setLocalAiHeadphones([]);
      }
      toast.success('AI 추천을 갱신했습니다.');
    } catch {
      toast.error('AI 추천 갱신에 실패했습니다.');
    } finally {
      setAiRecommendLoading(false);
    }
  }, [isAuthenticated, onAlbumPatch, viewingItem]);

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

          <div className="mt-4 shrink-0 border-b px-6" style={{ borderColor: 'var(--border)' }}>
            <div className="-mb-px flex items-center justify-between gap-2">
              <div className="flex min-w-0 gap-4">
                {TAB_ITEMS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={tabButtonClass(activeTab === tab.id)}
                    aria-pressed={activeTab === tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {isAuthenticated ? (
                <div className="flex shrink-0 items-center gap-0.5 pb-3">
                  <button
                    type="button"
                    onClick={onEdit}
                    className={modalActionIconClass}
                    style={{ color: 'var(--foreground)' }}
                    disabled={isDeleting}
                    aria-label="정보 수정하기"
                    title="정보 수정하기"
                  >
                    <Pencil className="size-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className={modalActionIconClass}
                    style={{ color: 'var(--foreground)' }}
                    disabled={isDeleting}
                    aria-busy={isDeleting}
                    aria-label="삭제하기"
                    title="삭제하기"
                  >
                    {isDeleting ? <DeletingLabel /> : <Trash2 className="size-4" strokeWidth={2} />}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="scrollbar-hide min-h-0 flex-1 overscroll-y-contain" style={modalBodyScrollStyle}>
              <div className="min-w-0 p-6 space-y-5">
                <div className={activeTab === 'info' ? 'space-y-5' : 'hidden'} aria-hidden={activeTab !== 'info'}>
                  <AlbumInfoSection viewingItem={viewingItem} onNavigateToMood={onNavigateToMood} />
                  <AlbumIntroSection
                    viewingItem={viewingItem}
                    albumIntro={albumIntro}
                    audioTags={audioTags}
                    albumIntroLoading={albumIntroLoading}
                    onRefreshAlbumIntro={onRefreshAlbumIntro}
                    isAuthenticated={isAuthenticated}
                    variant="tab"
                  />
                </div>

                <div className={activeTab === 'gear' ? '' : 'hidden'} aria-hidden={activeTab !== 'gear'}>
                  <AlbumRecommendedGearSection
                    variant="tab"
                    recommendedHeadphones={recommendedHeadphones}
                    aiRecommendedHeadphones={localAiHeadphones}
                    aiRecommendReason={localAiReason}
                    albumIntroLoading={albumIntroLoading}
                    aiRecommendLoading={aiRecommendLoading}
                    isAuthenticated={isAuthenticated}
                    onClose={onClose}
                    onHeadfiClick={onHeadfiClick}
                    onRefreshAiRecommend={
                      isAuthenticated === true && onAlbumPatch
                        ? () => void handleRefreshAiRecommend()
                        : undefined
                    }
                  />
                </div>

                <div className={activeTab === 'listen' ? '' : 'hidden'} aria-hidden={activeTab !== 'listen'}>
                  <AlbumListenHistorySection
                    albumId={viewingItem.id}
                    isAuthenticated={isAuthenticated}
                    variant="tab"
                    onHeadfiClick={onHeadfiClick}
                  />
                </div>
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
