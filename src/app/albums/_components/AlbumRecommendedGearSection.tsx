'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Headphones } from 'lucide-react';

type AlbumRecommendedGearSectionProps = {
  albumId: number;
  recommendedHeadphones: { id: number; brand: string; model: string }[];
  albumIntroLoading: boolean;
  onClose: () => void;
};

export function AlbumRecommendedGearSection({
  albumId,
  recommendedHeadphones,
  albumIntroLoading,
  onClose,
}: AlbumRecommendedGearSectionProps) {
  const [headphonesOpen, setHeadphonesOpen] = useState(true);

  useEffect(() => {
    setHeadphonesOpen(true);
  }, [albumId]);

  if (albumIntroLoading || recommendedHeadphones.length === 0) return null;

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
        <div className="mt-3 grid grid-cols-3 gap-2">
          {recommendedHeadphones.map((h) => (
            <Link
              key={h.id}
              href={`/headfi?view=${h.id}`}
              className="flex aspect-[5/2] flex-col items-center justify-center gap-1 rounded-xl p-2 text-center text-[11px] font-semibold leading-tight transition-opacity hover:opacity-90"
              style={{
                background: 'var(--badge-bg)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              onClick={onClose}
            >
              <span className="line-clamp-2 w-full">{h.brand}</span>
              <span className="line-clamp-3 w-full text-[10px] font-medium opacity-75">{h.model}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
