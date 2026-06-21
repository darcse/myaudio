'use client';

import { useState } from 'react';
import { ChevronDown, Headphones, RefreshCw, Sparkles } from 'lucide-react';
type HeadphoneRow = { id: number; brand: string; model: string };

type AlbumRecommendedGearSectionProps = {
  variant?: 'accordion' | 'tab';
  recommendedHeadphones: HeadphoneRow[];
  aiRecommendedHeadphones: HeadphoneRow[];
  aiRecommendReason: string | null;
  albumIntroLoading: boolean;
  aiRecommendLoading: boolean;
  isAuthenticated: boolean | null;
  onClose: () => void;
  onHeadfiClick?: (headfiId: number) => void;
  onRefreshAiRecommend?: () => void;
};

function HeadphoneGrid({
  headphones,
  onClose,
  onHeadfiClick,
  showRank,
}: {
  headphones: HeadphoneRow[];
  onClose: () => void;
  onHeadfiClick?: (headfiId: number) => void;
  showRank?: boolean;
}) {
  if (headphones.length === 0) return null;
  return (
    <div className={`grid gap-2 ${showRank ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3'}`}>
      {headphones.map((h, idx) => {
        const cardClass =
          'flex w-full flex-col items-center justify-center gap-1 rounded-xl p-3 text-center text-[11px] font-semibold leading-tight transition-opacity hover:opacity-90';
        const cardStyle = {
          background: 'var(--badge-bg)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        };
        const inner = (
          <>
            {showRank ? (
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                {idx + 1}순위
              </span>
            ) : null}
            <span className="line-clamp-2 w-full">{h.brand}</span>
            <span className="line-clamp-3 w-full text-[10px] font-medium opacity-75">{h.model}</span>
          </>
        );
        if (onHeadfiClick) {
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => onHeadfiClick(h.id)}
              className={cardClass}
              style={cardStyle}
            >
              {inner}
            </button>
          );
        }
        return (
          <a
            key={h.id}
            href={`/headfi?view=${h.id}`}
            className={cardClass}
            style={cardStyle}
            onClick={onClose}
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export function AlbumRecommendedGearSection({
  variant = 'accordion',
  recommendedHeadphones,
  aiRecommendedHeadphones,
  aiRecommendReason,
  albumIntroLoading,
  aiRecommendLoading,
  isAuthenticated,
  onClose,
  onHeadfiClick,
  onRefreshAiRecommend,
}: AlbumRecommendedGearSectionProps) {
  const [headphonesOpen, setHeadphonesOpen] = useState(true);
  const manualHeadphones = recommendedHeadphones.slice(0, 2);

  if (variant === 'accordion') {
    if (albumIntroLoading || manualHeadphones.length === 0) return null;
    return (
      <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setHeadphonesOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left transition-opacity hover:opacity-90"
          style={{ color: 'var(--foreground)' }}
          aria-expanded={headphonesOpen}
        >
          <strong className="flex items-center gap-1.5 text-sm">
            <Headphones className="size-4 shrink-0 opacity-80" />
            추천 헤드폰
          </strong>
          <ChevronDown
            className={`size-5 shrink-0 opacity-60 transition-transform ${headphonesOpen ? 'rotate-180' : ''}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
        {headphonesOpen ? (
          <div className="mt-3">
            <HeadphoneGrid headphones={manualHeadphones} onClose={onClose} onHeadfiClick={onHeadfiClick} />
          </div>
        ) : null}
      </div>
    );
  }

  const aiReason = aiRecommendReason?.trim() ?? '';
  const aiBusy = aiRecommendLoading || albumIntroLoading;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold opacity-90">
          <Headphones className="size-4 shrink-0 opacity-80" aria-hidden />
          내 매칭
        </h3>
        <p className="mb-3 text-[11px] opacity-60">
          수동 추천을 변경하려면 하단의 「정보 수정하기」에서 편집해 주세요.
        </p>
        {manualHeadphones.length > 0 ? (
          <HeadphoneGrid
            headphones={manualHeadphones}
            onClose={onClose}
            onHeadfiClick={onHeadfiClick}
            showRank
          />
        ) : (
          <p className="text-xs opacity-60">등록된 수동 추천 헤드폰이 없습니다.</p>
        )}
      </section>

      <section className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold opacity-90">
            <Sparkles className="size-4 shrink-0 opacity-80" aria-hidden />
            AI 추천
          </h3>
          {isAuthenticated === true && onRefreshAiRecommend ? (
            <button
              type="button"
              onClick={onRefreshAiRecommend}
              disabled={aiBusy}
              className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              style={{ color: 'var(--foreground)' }}
              title="AI 추천 다시 생성"
              aria-label="AI 추천 다시 생성"
            >
              <RefreshCw className={`size-4 ${aiRecommendLoading ? 'animate-spin' : ''}`} />
            </button>
          ) : null}
        </div>
        {aiRecommendLoading ? (
          <div className="mb-4 flex flex-col items-center justify-center gap-3 py-6">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{
                borderColor: 'var(--border)',
                borderTopColor: 'var(--foreground)',
              }}
              aria-hidden
            />
            <p className="text-xs opacity-70">Gemini가 헤드폰 추천을 분석 중이에요...</p>
          </div>
        ) : albumIntroLoading ? (
          <p className="mb-4 text-xs opacity-60">앨범 소개 생성 중입니다.</p>
        ) : aiReason ? (
          <p
            className="mb-4 whitespace-pre-line rounded-xl p-3 text-xs leading-relaxed opacity-80"
            style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
          >
            {aiReason}
          </p>
        ) : (
          <p className="mb-4 text-xs opacity-60">AI 추천 이유가 아직 없습니다.</p>
        )}
        {!aiRecommendLoading && aiRecommendedHeadphones.length > 0 ? (
          <HeadphoneGrid
            headphones={aiRecommendedHeadphones.slice(0, 2)}
            onClose={onClose}
            onHeadfiClick={onHeadfiClick}
            showRank
          />
        ) : !aiRecommendLoading ? (
          <p className="text-xs opacity-60">AI 추천 헤드폰이 없습니다.</p>
        ) : null}
      </section>
    </div>
  );
}
