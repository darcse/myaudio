import type { SupabaseClient } from '@supabase/supabase-js';
import type { Album, AlbumComposerFormEntry, AlbumComposerStored } from '@/app/albums/types';
import {
  composersFromAlbum,
  normalizeComposerNameKey,
  sanitizeComposersForSave,
} from '@/app/albums/utils';
import { isSameArtistName, normalizeArtistNameAlt } from '../utils';

export type ArtistNamesPatch = {
  recordArtistName: string;
  albumArtistName: string;
  name: string;
  nameAlt: string | null;
};

export type UpdateArtistNamesResult = {
  error?: string;
  mergedArtistId?: string;
};

type AlbumComposerRow = Pick<
  Album,
  'id' | 'composer' | 'composer_country' | 'composer_era' | 'composer_wiki_url' | 'composers'
>;

const MERGEABLE_FIELDS = [
  'bio',
  'profile_image_url',
  'apple_music_url',
  'spotify_url',
  'youtube_url',
  'twitter_url',
  'instagram_url',
] as const;

function duplicateArtistNameMessage(): string {
  return '이미 같은 이름1을 가진 아티스트가 있습니다. 검색용 표기는 이름2에 입력해 주세요.';
}

function mapArtistNameError(message: string): string {
  if (message.includes('artists_artist_name_key') || message.includes('duplicate key')) {
    return duplicateArtistNameMessage();
  }
  return message;
}

function collectOldAlbumArtistNames(patch: ArtistNamesPatch, newName: string): string[] {
  const names = new Set<string>();
  for (const candidate of [patch.albumArtistName.trim(), patch.recordArtistName.trim()]) {
    if (!candidate || isSameArtistName(candidate, newName)) continue;
    names.add(candidate);
  }
  return [...names];
}

function renameComposerEntries(
  entries: AlbumComposerFormEntry[],
  oldName: string,
  newName: string,
): AlbumComposerFormEntry[] {
  const oldKey = normalizeComposerNameKey(oldName);
  const nextName = newName.trim();
  const rewritten: AlbumComposerFormEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    let name = entry.name.trim();
    if (!name) continue;
    if (normalizeComposerNameKey(name) === oldKey) name = nextName;
    if (!name) continue;
    const key = normalizeComposerNameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    rewritten.push({ ...entry, name });
  }
  return rewritten;
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

async function updateComposerNamesInAlbums(
  supabase: SupabaseClient,
  oldName: string,
  newName: string,
): Promise<{ error?: string }> {
  const oldKey = normalizeComposerNameKey(oldName);
  if (!oldKey) return {};

  const selectCols =
    'id, composer, composer_country, composer_era, composer_wiki_url, composers';
  const [{ data: primaryHits, error: primaryError }, { data: arrayHits, error: arrayError }] =
    await Promise.all([
      supabase.from('album').select(selectCols).eq('composer', oldName),
      supabase.from('album').select(selectCols).not('composers', 'is', null),
    ]);
  if (primaryError) {
    return {
      error: `연주자 이름은 반영됐지만 작곡가 이름 조회에 실패했습니다. ${primaryError.message}`,
    };
  }
  if (arrayError) {
    return {
      error: `연주자 이름은 반영됐지만 작곡가 이름 조회에 실패했습니다. ${arrayError.message}`,
    };
  }

  const byId = new Map<number, AlbumComposerRow>();
  for (const row of [...(primaryHits ?? []), ...(arrayHits ?? [])] as AlbumComposerRow[]) {
    byId.set(row.id, row);
  }

  for (const row of byId.values()) {
    const hadArray = Array.isArray(row.composers) && row.composers.length > 0;
    const entries = composersFromAlbum(row).filter((entry) => entry.name.trim());
    const hasOld = entries.some(
      (entry) => normalizeComposerNameKey(entry.name) === oldKey,
    );
    if (!hasOld) continue;

    if (!hadArray) {
      const { error } = await supabase
        .from('album')
        .update({ composer: newName.trim() || null })
        .eq('id', row.id);
      if (error) {
        return {
          error: `연주자 이름은 반영됐지만 작곡가 이름(album.composer) 갱신에 실패했습니다. ${error.message}`,
        };
      }
      continue;
    }

    const rewritten = renameComposerEntries(entries, oldName, newName);
    const stored = sanitizeComposersForSave(rewritten);
    const { error } = await supabase
      .from('album')
      .update({
        composers: stored.length > 0 ? stored : null,
        ...primaryFieldsFromStored(stored),
      })
      .eq('id', row.id);
    if (error) {
      return {
        error: `연주자 이름은 반영됐지만 작곡가 이름(album.composers) 갱신에 실패했습니다. ${error.message}`,
      };
    }
  }

  return {};
}

async function updateAlbumArtistNames(
  supabase: SupabaseClient,
  oldNames: string[],
  newName: string,
): Promise<{ error?: string }> {
  for (const oldName of oldNames) {
    const { error: artistError } = await supabase
      .from('album')
      .update({ artist: newName })
      .eq('artist', oldName);
    if (artistError) {
      return { error: `연주자 이름(album.artist) 갱신에 실패했습니다. ${artistError.message}` };
    }

    const composerResult = await updateComposerNamesInAlbums(supabase, oldName, newName);
    if (composerResult.error) return composerResult;
  }
  return {};
}

async function mergeArtistRename(
  supabase: SupabaseClient,
  sourceArtistId: string,
  targetArtistId: string,
  patch: ArtistNamesPatch,
  nameAlt: string | null,
): Promise<{ error?: string }> {
  const newName = patch.name.trim();

  const [{ data: source }, { data: target }] = await Promise.all([
    supabase.from('artists').select('*').eq('id', sourceArtistId).maybeSingle(),
    supabase.from('artists').select('*').eq('id', targetArtistId).maybeSingle(),
  ]);

  if (!target) {
    return { error: '병합 대상 아티스트를 찾을 수 없습니다.' };
  }

  const targetPatch: Record<string, string | null> = { name_alt: nameAlt };
  if (source) {
    for (const field of MERGEABLE_FIELDS) {
      const targetValue = target[field];
      const sourceValue = source[field];
      const targetEmpty =
        targetValue == null || (typeof targetValue === 'string' && !targetValue.trim());
      const sourceFilled =
        sourceValue != null && (typeof sourceValue !== 'string' || sourceValue.trim());
      if (targetEmpty && sourceFilled) {
        targetPatch[field] = sourceValue as string;
      }
    }
  }

  const { error: targetError } = await supabase
    .from('artists')
    .update(targetPatch)
    .eq('id', targetArtistId);
  if (targetError) {
    return { error: targetError.message };
  }

  const albumResult = await updateAlbumArtistNames(
    supabase,
    collectOldAlbumArtistNames(patch, newName),
    newName,
  );
  if (albumResult.error) {
    return albumResult;
  }

  if (String(sourceArtistId) !== String(targetArtistId)) {
    const { error: deleteError } = await supabase.from('artists').delete().eq('id', sourceArtistId);
    if (deleteError) {
      return { error: deleteError.message };
    }
  }

  return {};
}

async function findArtistNameConflict(
  supabase: SupabaseClient,
  artistId: string,
  newName: string,
): Promise<{ id: string } | null> {
  const { data: rows, error } = await supabase.from('artists').select('id').eq('artist_name', newName);
  if (error) {
    throw new Error(error.message);
  }
  return (rows ?? []).find((row) => String(row.id) !== String(artistId)) ?? null;
}

export async function updateArtistNames(
  supabase: SupabaseClient,
  artistId: string,
  patch: ArtistNamesPatch,
): Promise<UpdateArtistNamesResult> {
  if (!artistId) {
    return { error: '아티스트 정보를 찾을 수 없습니다.' };
  }

  const recordArtistName = patch.recordArtistName.trim();
  const albumArtistName = patch.albumArtistName.trim();
  const newName = patch.name.trim();
  if (!newName) {
    return { error: '이름1을 입력해 주세요.' };
  }

  const nameAlt = normalizeArtistNameAlt(patch.nameAlt);
  const recordNameChanged = !isSameArtistName(newName, recordArtistName);
  const albumArtistChanged = !isSameArtistName(newName, albumArtistName);

  if (recordNameChanged) {
    try {
      const conflict = await findArtistNameConflict(supabase, artistId, newName);
      if (conflict) {
        const mergeResult = await mergeArtistRename(
          supabase,
          artistId,
          String(conflict.id),
          patch,
          nameAlt,
        );
        if (mergeResult.error) {
          return mergeResult;
        }
        return { mergedArtistId: String(conflict.id) };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : '이름 저장에 실패했습니다.' };
    }
  }

  const artistUpdate: { artist_name?: string; name_alt: string | null } = { name_alt: nameAlt };
  if (recordNameChanged) {
    artistUpdate.artist_name = newName;
  }

  const { error: artistError } = await supabase
    .from('artists')
    .update(artistUpdate)
    .eq('id', artistId);
  if (artistError) {
    const mapped = mapArtistNameError(artistError.message);
    if (mapped !== artistError.message && recordNameChanged) {
      try {
        const conflict = await findArtistNameConflict(supabase, artistId, newName);
        if (conflict) {
          const mergeResult = await mergeArtistRename(
            supabase,
            artistId,
            String(conflict.id),
            patch,
            nameAlt,
          );
          if (mergeResult.error) {
            return mergeResult;
          }
          return { mergedArtistId: String(conflict.id) };
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : mapped };
      }
    }
    return { error: mapped };
  }

  if (albumArtistChanged) {
    const albumResult = await updateAlbumArtistNames(
      supabase,
      collectOldAlbumArtistNames(patch, newName),
      newName,
    );
    if (albumResult.error) {
      return albumResult;
    }
  }

  return {};
}

export function shouldRetargetAlbumArtist(
  albumArtist: string | null | undefined,
  albumArtistName: string,
  recordArtistName: string,
): boolean {
  const artist = albumArtist?.trim() ?? '';
  if (!artist) return false;
  return (
    artist === albumArtistName ||
    artist === recordArtistName ||
    isSameArtistName(artist, albumArtistName) ||
    isSameArtistName(artist, recordArtistName)
  );
}

export function applyAlbumNameRetarget<
  T extends {
    artist?: string | null;
    composer?: string | null;
    composer_country?: string | null;
    composer_era?: string | null;
    composer_wiki_url?: string | null;
    composers?: AlbumComposerStored[] | null;
  },
>(album: T, albumArtistName: string, recordArtistName: string, newName: string): T {
  const nextArtist = shouldRetargetAlbumArtist(album.artist, albumArtistName, recordArtistName)
    ? newName
    : album.artist;

  const hadArray = Array.isArray(album.composers) && album.composers.length > 0;
  const entries = composersFromAlbum(album).filter((entry) => entry.name.trim());
  const shouldRenameComposer = entries.some((entry) =>
    shouldRetargetAlbumArtist(entry.name, albumArtistName, recordArtistName),
  );

  if (!shouldRenameComposer) {
    if (nextArtist === album.artist) return album;
    return { ...album, artist: nextArtist };
  }

  const oldNames = [albumArtistName, recordArtistName]
    .map((name) => name.trim())
    .filter(Boolean);
  let rewritten = entries;
  for (const oldName of oldNames) {
    if (isSameArtistName(oldName, newName)) continue;
    rewritten = renameComposerEntries(rewritten, oldName, newName);
  }
  const stored = sanitizeComposersForSave(rewritten);
  const primary = primaryFieldsFromStored(stored);

  if (!hadArray) {
    return {
      ...album,
      artist: nextArtist,
      composer: primary.composer,
    };
  }

  return {
    ...album,
    artist: nextArtist,
    composers: stored.length > 0 ? stored : null,
    composer: primary.composer,
    composer_country: primary.composer_country,
    composer_era: primary.composer_era,
    composer_wiki_url: primary.composer_wiki_url,
  };
}
