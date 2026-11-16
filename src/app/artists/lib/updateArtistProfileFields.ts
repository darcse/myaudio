import type { SupabaseClient } from '@supabase/supabase-js';
import type { Album, AlbumComposerFormEntry, AlbumComposerStored } from '@/app/albums/types';
import {
  composersFromAlbum,
  normalizeComposerNameKey,
  sanitizeComposersForSave,
} from '@/app/albums/utils';
import { albumBelongsToScope, type CatalogScope } from '@/lib/catalogScope';
import type { ArtistLibraryRole } from '../types';

export type ArtistProfileFieldsPatch = {
  country?: string | null;
  wikiUrl?: string | null;
  artistType?: string | null;
  era?: string | null;
};

export type UpdateArtistProfileFieldsParams = {
  role: ArtistLibraryRole;
  name: string;
  patch: ArtistProfileFieldsPatch;
  catalogScope?: CatalogScope;
};

export type UpdateArtistProfileFieldsResult = {
  error?: string;
};

type AlbumProfileRow = Pick<
  Album,
  | 'id'
  | 'artist'
  | 'artist_type'
  | 'country'
  | 'wiki_url'
  | 'genre1'
  | 'composer'
  | 'composer_country'
  | 'composer_era'
  | 'composer_wiki_url'
  | 'composers'
>;

const SELECT_COLS =
  'id, artist, artist_type, country, wiki_url, genre1, composer, composer_country, composer_era, composer_wiki_url, composers';

const PARTIAL_FAIL_HINT = '일부 앨범만 반영됐을 수 있습니다. 다시 저장하면 맞춰집니다.';

function hasOwnPatchKey(patch: ArtistProfileFieldsPatch, key: keyof ArtistProfileFieldsPatch): boolean {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function patchIsEmpty(patch: ArtistProfileFieldsPatch): boolean {
  return (
    !hasOwnPatchKey(patch, 'country') &&
    !hasOwnPatchKey(patch, 'wikiUrl') &&
    !hasOwnPatchKey(patch, 'artistType') &&
    !hasOwnPatchKey(patch, 'era')
  );
}

function artistNameMatches(albumArtist: string | null | undefined, name: string): boolean {
  return (albumArtist ?? '') === name;
}

function composerNameMatches(entryName: string, nameKey: string): boolean {
  return normalizeComposerNameKey(entryName) === nameKey;
}

function primaryFieldsFromStored(composers: AlbumComposerStored[]): {
  composer: string | null;
  composer_country: string | null;
  composer_era: string | null;
  composer_wiki_url: string | null;
} {
  const primary = composers[0];
  return {
    composer: primary?.name ?? null,
    composer_country: primary?.country ?? null,
    composer_era: primary?.era ?? null,
    composer_wiki_url: primary?.wiki_url ?? null,
  };
}

function applyComposerEntryPatch(
  entry: AlbumComposerFormEntry,
  patch: ArtistProfileFieldsPatch,
  options: { applyCountryWiki: boolean; applyEra: boolean },
): AlbumComposerFormEntry {
  let next = entry;
  if (options.applyCountryWiki && hasOwnPatchKey(patch, 'country')) {
    next = { ...next, country: patch.country ?? '' };
  }
  if (options.applyEra && hasOwnPatchKey(patch, 'era')) {
    next = { ...next, era: patch.era ?? '' };
  }
  if (options.applyCountryWiki && hasOwnPatchKey(patch, 'wikiUrl')) {
    next = { ...next, wiki_url: patch.wikiUrl ?? '' };
  }
  return next;
}

function buildAlbumUpdate(
  row: AlbumProfileRow,
  role: ArtistLibraryRole,
  name: string,
  nameKey: string,
  patch: ArtistProfileFieldsPatch,
  catalogScope?: CatalogScope,
): Record<string, unknown> | null {
  const update: Record<string, unknown> = {};
  const isArtistRow = artistNameMatches(row.artist, name);
  const hadArray = Array.isArray(row.composers) && row.composers.length > 0;
  const entries = composersFromAlbum(row);
  const composerMatchIndexes = entries
    .map((entry, index) => (composerNameMatches(entry.name, nameKey) ? index : -1))
    .filter((index) => index >= 0);
  const hasComposerMatch = composerMatchIndexes.length > 0;

  const applyArtistCountryWiki =
    isArtistRow &&
    (role === 'artist' ||
      (role === 'composer' &&
        (hasOwnPatchKey(patch, 'country') || hasOwnPatchKey(patch, 'wikiUrl'))));
  const applyArtistType =
    isArtistRow &&
    role === 'artist' &&
    hasOwnPatchKey(patch, 'artistType') &&
    catalogScope != null &&
    albumBelongsToScope(row, catalogScope);
  const applyComposerFields =
    hasComposerMatch &&
    (role === 'composer' ||
      (role === 'artist' &&
        (hasOwnPatchKey(patch, 'country') || hasOwnPatchKey(patch, 'wikiUrl'))));

  if (applyArtistType) {
    update.artist_type = patch.artistType ?? null;
  }
  if (applyArtistCountryWiki && hasOwnPatchKey(patch, 'country')) {
    update.country = patch.country ?? null;
  }
  if (applyArtistCountryWiki && hasOwnPatchKey(patch, 'wikiUrl')) {
    update.wiki_url = patch.wikiUrl ?? null;
  }

  if (applyComposerFields) {
    const applyCountryWiki =
      hasOwnPatchKey(patch, 'country') || hasOwnPatchKey(patch, 'wikiUrl');
    const applyEra = role === 'composer' && hasOwnPatchKey(patch, 'era');

    if (!hadArray) {
      if (applyCountryWiki && hasOwnPatchKey(patch, 'country')) {
        update.composer_country = patch.country ?? null;
      }
      if (applyEra) {
        update.composer_era = patch.era ?? null;
      }
      if (applyCountryWiki && hasOwnPatchKey(patch, 'wikiUrl')) {
        update.composer_wiki_url = patch.wikiUrl ?? null;
      }
    } else {
      const rewritten = entries.map((entry, index) =>
        composerMatchIndexes.includes(index)
          ? applyComposerEntryPatch(entry, patch, {
              applyCountryWiki,
              applyEra,
            })
          : entry,
      );
      const stored = sanitizeComposersForSave(rewritten);
      update.composers = stored.length > 0 ? stored : null;
      Object.assign(update, primaryFieldsFromStored(stored));
    }
  }

  return Object.keys(update).length > 0 ? update : null;
}

async function fetchTargetAlbums(
  supabase: SupabaseClient,
  name: string,
  needArtistRows: boolean,
  needComposerRows: boolean,
): Promise<{ rows: AlbumProfileRow[]; error?: string }> {
  const byId = new Map<number, AlbumProfileRow>();

  if (needArtistRows) {
    const { data, error } = await supabase.from('album').select(SELECT_COLS).eq('artist', name);
    if (error) {
      return { rows: [], error: `앨범 조회에 실패했습니다. ${error.message}` };
    }
    for (const row of (data ?? []) as AlbumProfileRow[]) {
      byId.set(row.id, row);
    }
  }

  if (needComposerRows) {
    const nameKey = normalizeComposerNameKey(name);
    if (nameKey) {
      const [{ data: primaryHits, error: primaryError }, { data: arrayHits, error: arrayError }] =
        await Promise.all([
          supabase.from('album').select(SELECT_COLS).eq('composer', name),
          supabase.from('album').select(SELECT_COLS).not('composers', 'is', null),
        ]);
      if (primaryError) {
        return { rows: [], error: `앨범 조회에 실패했습니다. ${primaryError.message}` };
      }
      if (arrayError) {
        return { rows: [], error: `앨범 조회에 실패했습니다. ${arrayError.message}` };
      }
      for (const row of [...(primaryHits ?? []), ...(arrayHits ?? [])] as AlbumProfileRow[]) {
        const hasMatch =
          artistNameMatches(row.composer, name) ||
          composersFromAlbum(row).some((entry) => composerNameMatches(entry.name, nameKey));
        if (!hasMatch) continue;
        byId.set(row.id, row);
      }
    }
  }

  return { rows: [...byId.values()] };
}

export async function updateArtistProfileFields(
  supabase: SupabaseClient,
  params: UpdateArtistProfileFieldsParams,
): Promise<UpdateArtistProfileFieldsResult> {
  const name = params.name.trim();
  if (!name) {
    return { error: '아티스트 이름을 확인할 수 없습니다.' };
  }
  if (patchIsEmpty(params.patch)) {
    return {};
  }

  const needArtistRows =
    params.role === 'artist' ||
    hasOwnPatchKey(params.patch, 'country') ||
    hasOwnPatchKey(params.patch, 'wikiUrl');
  const needComposerRows =
    params.role === 'composer' ||
    ((hasOwnPatchKey(params.patch, 'country') || hasOwnPatchKey(params.patch, 'wikiUrl')) &&
      params.role === 'artist');

  const { rows, error: fetchError } = await fetchTargetAlbums(
    supabase,
    name,
    needArtistRows,
    needComposerRows,
  );
  if (fetchError) return { error: fetchError };

  const nameKey = normalizeComposerNameKey(name);
  for (const row of rows) {
    const update = buildAlbumUpdate(
      row,
      params.role,
      name,
      nameKey,
      params.patch,
      params.catalogScope,
    );
    if (!update) continue;
    const { error } = await supabase.from('album').update(update).eq('id', row.id);
    if (error) {
      return {
        error: `앨범 부가 정보 저장에 실패했습니다. ${PARTIAL_FAIL_HINT} ${error.message}`,
      };
    }
  }

  return {};
}

export function applyAlbumProfileFieldsRetarget<T extends AlbumProfileRow>(
  album: T,
  role: ArtistLibraryRole,
  name: string,
  patch: ArtistProfileFieldsPatch,
  catalogScope?: CatalogScope,
): T {
  if (patchIsEmpty(patch)) return album;
  const update = buildAlbumUpdate(
    album,
    role,
    name.trim(),
    normalizeComposerNameKey(name),
    patch,
    catalogScope,
  );
  if (!update) return album;
  return { ...album, ...update };
}

export function buildProfileFieldsPatchDiff(args: {
  role: ArtistLibraryRole;
  current: {
    country: string | null;
    wikiUrl: string | null;
    artistType?: string | null;
    era?: string | null;
  };
  next: {
    country: string | null;
    wikiUrl: string | null;
    artistType?: string | null;
    era?: string | null;
  };
}): ArtistProfileFieldsPatch {
  const patch: ArtistProfileFieldsPatch = {};
  if ((args.next.country ?? null) !== (args.current.country ?? null)) {
    patch.country = args.next.country ?? null;
  }
  if ((args.next.wikiUrl ?? null) !== (args.current.wikiUrl ?? null)) {
    patch.wikiUrl = args.next.wikiUrl ?? null;
  }
  if (args.role === 'artist') {
    if ((args.next.artistType ?? null) !== (args.current.artistType ?? null)) {
      patch.artistType = args.next.artistType ?? null;
    }
  }
  if (args.role === 'composer') {
    if ((args.next.era ?? null) !== (args.current.era ?? null)) {
      patch.era = args.next.era ?? null;
    }
  }
  return patch;
}
