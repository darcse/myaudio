'use client';

import type { CSSProperties } from 'react';
import { Disc3, RefreshCw } from 'lucide-react';
import { getMoodGradientPair, hexToRgba } from '../moodGradient';
import type { Album } from '../types';

function audioTagSurfaceFromMood(moodName: string | null | undefined): CSSProperties {
  const pair = getMoodGradientPair(typeof moodName === 'string' ? moodName : '');
  return {
    background: `linear-gradient(135deg, ${hexToRgba(pair.a, 0.22)}, ${hexToRgba(pair.b, 0.22)})`,
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

type AlbumIntroSectionProps = {
  viewingItem: Album;
  albumIntro: string;
  audioTags: string[];
  albumIntroLoading: boolean;
  onRefreshAlbumIntro: () => void;
  isAuthenticated: boolean | null;
  variant?: 'default' | 'tab';
};

export function AlbumIntroSection({
  viewingItem,
  albumIntro,
  audioTags,
  albumIntroLoading,
  onRefreshAlbumIntro,
  isAuthenticated,
  variant = 'default',
}: AlbumIntroSectionProps) {
  const showSection =
    variant === 'tab' ||
    isAuthenticated !== false ||
    albumIntroLoading ||
    audioTags.length > 0 ||
    albumIntro.trim().length > 0;

  if (!showSection) return null;

  return (
    <div className={variant === 'tab' ? '' : 'pt-4 border-t'} style={variant === 'tab' ? undefined : { borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <strong className="text-sm flex items-center gap-1.5">
          <Disc3 className="size-4 opacity-80" />
          앨범 소개
        </strong>
        {isAuthenticated !== false ? (
          <button
            type="button"
            onClick={onRefreshAlbumIntro}
            disabled={albumIntroLoading}
            className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
            style={{ color: 'var(--foreground)' }}
            title="앨범 소개·태그 다시 생성"
            aria-label="앨범 소개·태그 다시 생성"
          >
            <RefreshCw className={`size-4 ${albumIntroLoading ? 'animate-spin' : ''}`} />
          </button>
        ) : null}
      </div>

      {albumIntroLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--foreground)',
            }}
            aria-hidden
          />
          <p className="text-sm opacity-80">Gemini가 앨범 소개를 작성 중이에요...</p>
        </div>
      ) : (
        <>
          {audioTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {audioTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={audioTagSurfaceFromMood(viewingItem.mood_name)}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {albumIntro.trim() ? (
            <p
              className="text-xs leading-relaxed opacity-70 p-3 rounded-xl whitespace-pre-line"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
            >
              {albumIntro}
            </p>
          ) : (
            <p className="text-xs opacity-60">아직 생성된 앨범 소개가 없습니다. 새로고침 버튼을 눌러 생성해 보세요.</p>
          )}
        </>
      )}
    </div>
  );
}
