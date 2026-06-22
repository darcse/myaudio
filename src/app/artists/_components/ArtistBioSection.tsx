'use client';

import { RefreshCw } from 'lucide-react';

type ArtistBioSectionProps = {
  bio: string | null;
  bioLoading: boolean;
  isAuthenticated: boolean | null;
  onRefreshBio: () => void;
};

export function ArtistBioSection({
  bio,
  bioLoading,
  isAuthenticated,
  onRefreshBio,
}: ArtistBioSectionProps) {
  const trimmed = bio?.trim() ?? '';

  return (
    <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <strong className="text-sm">소개</strong>
        {isAuthenticated === true ? (
          <button
            type="button"
            onClick={onRefreshBio}
            disabled={bioLoading}
            className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            style={{ color: 'var(--foreground)' }}
            title="소개 새로고침"
            aria-label="소개 새로고침"
          >
            <RefreshCw className={`size-4 ${bioLoading ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {bioLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <div
            className="size-6 animate-spin rounded-full border-2"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--foreground)',
            }}
            aria-hidden
          />
          <p className="text-sm opacity-80">Gemini가 아티스트 소개를 작성 중이에요...</p>
        </div>
      ) : trimmed ? (
        <p className="whitespace-pre-line text-sm leading-relaxed opacity-85">{trimmed}</p>
      ) : (
        <p className="text-sm opacity-60">소개가 없습니다.</p>
      )}
    </div>
  );
}
