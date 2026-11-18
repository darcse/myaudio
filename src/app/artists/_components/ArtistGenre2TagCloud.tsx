'use client';

import { TagCloud } from '@/components/TagCloud';
import type { Genre2Tag } from '../_hooks/useArtistFilters';

type ArtistGenre2TagCloudProps = {
  tags: Genre2Tag[];
  selected: string;
  onSelect: (genre: string) => void;
};

export function ArtistGenre2TagCloud({ tags, selected, onSelect }: ArtistGenre2TagCloudProps) {
  return <TagCloud items={tags} selected={selected} onSelect={onSelect} />;
}
