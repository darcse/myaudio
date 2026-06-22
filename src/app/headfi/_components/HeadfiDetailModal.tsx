'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DeletingLabel } from '@/components/AsyncMutationUi';
import type { Headfi } from '../types';
import { HeadfiInfoSection, HeadfiInfoHeroSection } from './HeadfiInfoSection';
import { HeadfiFrSection } from './HeadfiFrSection';
import { HeadfiRadarSection } from './HeadfiRadarSection';
import { HeadfiMatchedAlbumsSection } from './HeadfiMatchedAlbumsSection';

type DetailTab = 'info' | 'listen' | 'fr' | 'albums';

const HIDE_ALBUMS_TAB_CATEGORIES = new Set(['스피커', 'DAC/AMP', 'DAP', 'Source', '기타']);

type HeadfiDetailModalProps = {
  viewingItem: Headfi;
  registeredAlbums: { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[];
  matchedMatchingDevice: { id: number; brand: string; model: string } | null;
  matchedHeadphones: { id: number; brand: string; model: string; category: string; image_url?: string | null }[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
  onAlbumClick: (albumId: number) => void;
  isAuthenticated: boolean | null;
  isDeleting?: boolean;
};

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

function tabButtonClass(active: boolean): string {
  return `border-b-2 px-1 pb-3 text-sm transition-colors ${
    active
      ? 'border-[var(--foreground)] font-semibold opacity-100'
      : 'border-transparent opacity-60 hover:opacity-90'
  }`;
}

export function HeadfiDetailModal({
  viewingItem,
  registeredAlbums,
  matchedMatchingDevice,
  matchedHeadphones,
  onClose,
  onEdit,
  onDelete,
  onHeadfiPatch,
  onAlbumClick,
  isAuthenticated,
  isDeleting = false,
}: HeadfiDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [localAiAlbums, setLocalAiAlbums] = useState<
    { id: number; album_name: string; artist: string; cover_image_url: string | null }[]
  >([]);
  const [localAiReason, setLocalAiReason] = useState<string | null>(
    viewingItem.ai_recommended_album_reason?.trim() || null,
  );
  const [aiAlbumRecommendLoading, setAiAlbumRecommendLoading] = useState(false);

  const showListenTab =
    viewingItem.category === '헤드폰' || viewingItem.category === '이어폰';
  const showFrTab = viewingItem.category === '헤드폰' || viewingItem.category === '이어폰';
  const showAlbumsTab = !HIDE_ALBUMS_TAB_CATEGORIES.has(viewingItem.category);

  const tabItems = useMemo(() => {
    const items: { id: DetailTab; label: string }[] = [{ id: 'info', label: '기본 정보' }];
    if (showListenTab) items.push({ id: 'listen', label: '청음 평가' });
    if (showFrTab) items.push({ id: 'fr', label: 'FR 그래프' });
    if (showAlbumsTab) items.push({ id: 'albums', label: '추천 앨범' });
    return items;
  }, [showListenTab, showFrTab, showAlbumsTab]);

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
    setLocalAiReason(viewingItem.ai_recommended_album_reason?.trim() || null);
  }, [viewingItem.id, viewingItem.ai_recommended_album_reason]);

  useEffect(() => {
    const ids = viewingItem.ai_recommended_album_ids ?? [];
    if (ids.length === 0) {
      setLocalAiAlbums([]);
      return;
    }
    void createClient()
      .from('album')
      .select('id, album_name, artist, cover_image_url')
      .in('id', ids)
      .then(({ data }) => {
        const ordered = ids
          .map((id) => (data || []).find((a) => a.id === id))
          .filter(
            (a): a is { id: number; album_name: string; artist: string | null; cover_image_url: string | null } =>
              !!a,
          )
          .map((a) => ({
            id: a.id,
            album_name: a.album_name || '',
            artist: a.artist || '',
            cover_image_url: a.cover_image_url ?? null,
          }));
        setLocalAiAlbums(ordered);
      });
  }, [viewingItem.id, viewingItem.ai_recommended_album_ids]);

  const handleRefreshAiAlbumRecommend = useCallback(async () => {
    if (isAuthenticated !== true || !onHeadfiPatch) return;
    setAiAlbumRecommendLoading(true);
    try {
      const res = await fetch('/api/headfi-album-recommend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headfiId: viewingItem.id }),
      });
      const payload = (await res.json()) as {
        error?: string;
        album_ids?: number[];
        reason?: string;
        ai_recommended_at?: string;
      };
      if (!res.ok) {
        toast.error(typeof payload.error === 'string' ? payload.error : 'AI 추천 갱신에 실패했습니다.');
        return;
      }
      const ids = Array.isArray(payload.album_ids) ? payload.album_ids : [];
      const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
      onHeadfiPatch({
        id: viewingItem.id,
        ai_recommended_album_ids: ids.length > 0 ? ids : null,
        ai_recommended_album_reason: reason || null,
        ai_recommended_at: payload.ai_recommended_at ?? null,
      });
      setLocalAiReason(reason || null);
      if (ids.length > 0) {
        const { data } = await createClient()
          .from('album')
          .select('id, album_name, artist, cover_image_url')
          .in('id', ids);
        const ordered = ids
          .map((id) => (data || []).find((a) => a.id === id))
          .filter(
            (a): a is { id: number; album_name: string; artist: string | null; cover_image_url: string | null } =>
              !!a,
          )
          .map((a) => ({
            id: a.id,
            album_name: a.album_name || '',
            artist: a.artist || '',
            cover_image_url: a.cover_image_url ?? null,
          }));
        setLocalAiAlbums(ordered);
      } else {
        setLocalAiAlbums([]);
      }
      toast.success('AI 추천을 갱신했습니다.');
    } catch {
      toast.error('AI 추천 갱신에 실패했습니다.');
    } finally {
      setAiAlbumRecommendLoading(false);
    }
  }, [isAuthenticated, onHeadfiPatch, viewingItem.id]);

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
            className="absolute top-3 right-4 z-20 flex size-8 items-center justify-center rounded-full text-lg font-semibold text-white transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            aria-label="닫기"
          >
            &times;
          </button>

          <div className="shrink-0 px-6 pt-6">
            <h2 className="section-title pr-10 text-xl">{viewingItem.model}</h2>
          </div>

          <HeadfiInfoHeroSection viewingItem={viewingItem} />

          <div className="mt-4 shrink-0 border-b px-6" style={{ borderColor: 'var(--border)' }}>
            <div className="-mb-px flex items-center justify-between gap-2">
              <div className="flex min-w-0 gap-4">
                {tabItems.map((tab) => (
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
              <div className="min-w-0 space-y-5 p-6">
                <div className={activeTab === 'info' ? 'space-y-5' : 'hidden'} aria-hidden={activeTab !== 'info'}>
                  <HeadfiInfoSection
                    viewingItem={viewingItem}
                    matchedMatchingDevice={matchedMatchingDevice}
                    matchedHeadphones={matchedHeadphones}
                    variant="tab"
                  />
                  <HeadfiRadarSection
                    viewingItem={viewingItem}
                    isAuthenticated={isAuthenticated}
                    onHeadfiPatch={onHeadfiPatch}
                    variant="tab"
                    mode="genres"
                  />
                </div>

                {showListenTab ? (
                  <div className={activeTab === 'listen' ? '' : 'hidden'} aria-hidden={activeTab !== 'listen'}>
                    <HeadfiRadarSection
                      viewingItem={viewingItem}
                      isAuthenticated={isAuthenticated}
                      onHeadfiPatch={onHeadfiPatch}
                      variant="tab"
                      mode="radar"
                    />
                  </div>
                ) : null}

                {showFrTab ? (
                  <div className={activeTab === 'fr' ? '' : 'hidden'} aria-hidden={activeTab !== 'fr'}>
                    <HeadfiFrSection
                      viewingItem={viewingItem}
                      isAuthenticated={isAuthenticated}
                      onHeadfiPatch={onHeadfiPatch}
                      variant="tab"
                    />
                  </div>
                ) : null}

                {showAlbumsTab ? (
                  <div className={activeTab === 'albums' ? '' : 'hidden'} aria-hidden={activeTab !== 'albums'}>
                    <HeadfiMatchedAlbumsSection
                      headfiId={viewingItem.id}
                      registeredAlbums={registeredAlbums}
                      aiRecommendedAlbums={localAiAlbums}
                      aiRecommendReason={localAiReason}
                      aiRecommendLoading={aiAlbumRecommendLoading}
                      isAuthenticated={isAuthenticated}
                      onRefreshAiRecommend={
                        isAuthenticated === true && onHeadfiPatch
                          ? () => void handleRefreshAiAlbumRecommend()
                          : undefined
                      }
                      onAlbumClick={onAlbumClick}
                    />
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
