/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import type { RelatedArtist } from '../types';

type ArtistRelatedSectionProps = {
  relatedArtists: RelatedArtist[];
  onSelectArtist: (name: string) => void;
};

function SimilarArtistItem({
  item,
  onSelect,
}: {
  item: RelatedArtist;
  onSelect: (name: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(item.profileImageUrl && !imageError);

  return (
    <button
      type="button"
      onClick={() => onSelect(item.name)}
      className="flex w-[5.5rem] shrink-0 flex-col items-center gap-2 text-center transition-opacity hover:opacity-90"
    >
      <div
        className="flex size-20 items-center justify-center overflow-hidden rounded-full"
        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
      >
        {showImage ? (
          <img
            src={item.profileImageUrl!}
            alt={`${item.name} 프로필`}
            className="size-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <UserCircle className="size-12 opacity-35" strokeWidth={1.25} aria-hidden />
        )}
      </div>
      <p className="w-full truncate text-xs font-medium leading-tight">{item.name}</p>
    </button>
  );
}

export function ArtistRelatedSection({
  relatedArtists,
  onSelectArtist,
}: ArtistRelatedSectionProps) {
  if (relatedArtists.length === 0) return null;

  return (
    <div className="mt-10 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
      <h3 className="mb-3 text-sm font-semibold opacity-90">유사한 아티스트</h3>
      <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
        {relatedArtists.map((item) => (
          <SimilarArtistItem key={item.name} item={item} onSelect={onSelectArtist} />
        ))}
      </div>
    </div>
  );
}
