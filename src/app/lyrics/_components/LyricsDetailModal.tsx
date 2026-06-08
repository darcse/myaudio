/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { DeletingLabel } from '@/components/AsyncMutationUi';
import { Music, Pencil, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getYoutubeId } from '@/app/albums/utils';
import type { Lyrics } from '../types';

const btnIconClass = 'size-4 shrink-0 mr-1.5';

type LyricsDetailModalProps = {
  viewingItem: Lyrics;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVibeAnalyze?: () => void;
  vibeAnalyzeLoading?: boolean;
  isAuthenticated: boolean | null;
  isDeleting?: boolean;
};

function formatCreated(createdAt: string | undefined) {
  if (!createdAt) return '-';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return createdAt;
  }
}

function lyricsMarkdownPreserveLineBreaks(text: string): string {
  return text.replace(/\r\n/g, '\n').split('\n').join('  \n');
}

export function LyricsDetailModal({
  viewingItem,
  onClose,
  onEdit,
  onDelete,
  onVibeAnalyze,
  vibeAnalyzeLoading = false,
  isAuthenticated,
  isDeleting = false,
}: LyricsDetailModalProps) {
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const ytId = viewingItem.youtube_url ? getYoutubeId(viewingItem.youtube_url) : null;
  const hasVibe = (viewingItem.vibe_colors?.length ?? 0) >= 2;
  const hasLyricsText = !!viewingItem.lyrics?.trim();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setLyricsExpanded(false);
  }, [viewingItem.id]);

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative scrollbar-hide">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-5 text-2xl font-semibold opacity-60 hover:opacity-100 transition-opacity"
        >
          &times;
        </button>
        <h2 className="section-title text-xl mb-4 pr-8 flex items-center gap-2">
          {viewingItem.vibe_emoji ? (
            <span className="text-2xl shrink-0" aria-hidden>
              {viewingItem.vibe_emoji}
            </span>
          ) : null}
          <span className="min-w-0 truncate">{viewingItem.title}</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          {viewingItem.cover_image_url ? (
            <img
              src={viewingItem.cover_image_url}
              alt=""
              className="w-32 h-32 object-cover rounded-xl mx-auto sm:mx-0 flex-shrink-0"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : null}
          <div
            className={`w-32 h-32 rounded-xl flex-shrink-0 flex items-center justify-center text-sm opacity-50 mx-auto sm:mx-0 ${viewingItem.cover_image_url ? 'hidden' : ''}`}
            style={{ background: 'var(--badge-bg)' }}
          >
            No Cover
          </div>
          <div className="space-y-2 text-sm opacity-90 flex-1">
            <p>
              <strong>앨범:</strong> {viewingItem.album || '-'}
            </p>
            <p>
              <strong>장르:</strong> {viewingItem.genre1 || '-'}
              {viewingItem.genre2 ? ` / ${viewingItem.genre2}` : ''}
            </p>
            <p>
              <strong>등록:</strong> {formatCreated(viewingItem.created_at)}
            </p>
          </div>
        </div>

        {viewingItem.audio_url ? (
          <div className="mb-6">
            <strong className="block mb-2 text-sm opacity-90">오디오</strong>
            <audio controls className="w-full max-w-full" src={viewingItem.audio_url}>
              브라우저가 오디오를 지원하지 않습니다.
            </audio>
          </div>
        ) : null}

        {isAuthenticated && onVibeAnalyze ? (
          <div className="mb-6">
            {hasVibe && viewingItem.vibe_colors ? (
              <div
                className="mb-3 h-2 rounded-full overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${viewingItem.vibe_colors[0]}, ${viewingItem.vibe_colors[1]})`,
                }}
                aria-hidden
              />
            ) : null}
            {vibeAnalyzeLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm opacity-80">
                <div
                  className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
                  style={{
                    borderColor: 'var(--border)',
                    borderTopColor: 'var(--foreground)',
                  }}
                  aria-hidden
                />
                바이브를 분석하는 중…
              </div>
            ) : null}
            {!hasLyricsText ? (
              <p className="text-sm opacity-70 mb-2">
                가사 내용이 없어 바이브 분석을 할 수 없습니다.
              </p>
            ) : null}
            <button
              type="button"
              onClick={onVibeAnalyze}
              disabled={vibeAnalyzeLoading || !hasLyricsText}
              className="btn-apple btn-apple-secondary w-full py-2.5 text-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              바이브 분석
            </button>
          </div>
        ) : null}

        {viewingItem.lyrics?.trim() ? (
          <div className="mb-6">
            <strong className="block mb-2 text-sm opacity-90">가사</strong>
            <div className="relative">
              <div
                className={`p-4 rounded-xl text-sm leading-relaxed max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 ${lyricsExpanded ? '' : 'max-h-[240px] overflow-hidden'}`}
                style={
                  hasVibe && viewingItem.vibe_colors
                    ? {
                        background: `linear-gradient(135deg, ${viewingItem.vibe_colors[0]}, ${viewingItem.vibe_colors[1]})`,
                        border: '1px solid var(--border)',
                        color: '#ffffff',
                      }
                    : { background: 'var(--badge-bg)', border: '1px solid var(--border)' }
                }
              >
                <ReactMarkdown>{lyricsMarkdownPreserveLineBreaks(viewingItem.lyrics)}</ReactMarkdown>
              </div>
              {!lyricsExpanded ? (
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-xl"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, var(--card-bg))',
                  }}
                />
              ) : null}
            </div>
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setLyricsExpanded((v) => !v)}
                className="link-apple text-sm"
              >
                {lyricsExpanded ? '접기 ↑' : '가사 더 보기 ↓'}
              </button>
            </div>
          </div>
        ) : null}

        {ytId ? (
          <div className="mb-6">
            <strong className="block mb-2 flex items-center text-sm opacity-90">
              <Music className="size-4 opacity-80 shrink-0 mr-1.5" /> YouTube
            </strong>
            <div className="aspect-video w-full rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {isAuthenticated ? (
          <div className="flex gap-4 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
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
  );
}
