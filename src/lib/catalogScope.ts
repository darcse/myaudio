import { isClassicGenre } from '@/app/albums/utils';

export type CatalogScope = 'popular' | 'classic';

export const CATALOG_SCOPE_LABELS: Record<CatalogScope, string> = {
  popular: 'Pop & Rock',
  classic: 'Classic',
};

export function albumBelongsToScope(
  album: { genre1?: string | null },
  scope: CatalogScope,
): boolean {
  if (scope === 'popular') return !isClassicGenre(album.genre1);
  return isClassicGenre(album.genre1);
}

export function filterAlbumsByScope<T extends { genre1?: string | null }>(
  albums: T[],
  scope: CatalogScope,
): T[] {
  return albums.filter((album) => albumBelongsToScope(album, scope));
}

export function catalogAlbumsPath(scope: CatalogScope): string {
  return scope === 'classic' ? '/classic/albums' : '/albums';
}

export function catalogArtistsPath(scope: CatalogScope): string {
  return scope === 'classic' ? '/classic/artists' : '/artists';
}
