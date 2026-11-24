'use client';

import { createClient } from '@/lib/supabase/client';
import { fetchAllRows, selectCountOptions } from '@/lib/supabase/fetchAllRows';
import type { Album } from '@/app/albums/types';

export type CatalogArtistMetaRow = {
  artist_name: string;
  name_alt?: string | null;
  profile_image_url?: string | null;
};

export type CatalogListenHistoryRow = {
  album_id: number;
  listened_at: string;
};

export type CatalogLibraryData = {
  albums: Album[];
  artistsMeta: CatalogArtistMetaRow[];
  listenHistory: CatalogListenHistoryRow[];
  userId: string | null;
};

type CacheState = {
  data: CatalogLibraryData | null;
  stale: boolean;
  inflight: Promise<CatalogLibraryData> | null;
  generation: number;
};

let cache: CacheState = {
  data: null,
  stale: false,
  inflight: null,
  generation: 0,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeCatalogLibraryCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCatalogLibraryCache(): CatalogLibraryData | null {
  return cache.data;
}

export function isCatalogLibraryStale(): boolean {
  return cache.stale;
}

export function getFreshCatalogLibraryCache(userId: string | null): CatalogLibraryData | null {
  const data = cache.data;
  if (!data || data.userId !== userId || cache.stale) return null;
  return data;
}

export function clearCatalogLibraryCache() {
  cache = {
    data: null,
    stale: false,
    inflight: null,
    generation: cache.generation + 1,
  };
  notify();
}

export function invalidateCatalogLibraryCache() {
  cache.stale = true;
  cache.inflight = null;
  cache.generation += 1;
  notify();
}

export function writeCatalogLibraryCache(data: CatalogLibraryData) {
  cache = {
    data,
    stale: false,
    inflight: null,
    generation: cache.generation + 1,
  };
  notify();
}

async function fetchCatalogLibraryData(userId: string | null): Promise<CatalogLibraryData> {
  const client = createClient();
  const [albumRes, historyRes, artistsRes] = await Promise.all([
    fetchAllRows<Album>(({ countExact }) =>
      client
        .from('album')
        .select('*', selectCountOptions(countExact))
        .order('created_at', { ascending: false }),
    ),
    fetchAllRows<CatalogListenHistoryRow>(({ countExact }) =>
      client
        .from('album_listen_history')
        .select('album_id, listened_at', selectCountOptions(countExact)),
    ),
    fetchAllRows<CatalogArtistMetaRow>(({ countExact }) =>
      client
        .from('artists')
        .select('artist_name, name_alt, profile_image_url', selectCountOptions(countExact)),
    ),
  ]);

  if (albumRes.error) {
    throw new Error(albumRes.error.message || '앨범 목록을 불러오지 못했습니다.');
  }

  return {
    albums: albumRes.data,
    artistsMeta: artistsRes.error ? [] : artistsRes.data,
    listenHistory: historyRes.error ? [] : historyRes.data,
    userId,
  };
}

export async function ensureCatalogLibrary(options?: {
  userId?: string | null;
  force?: boolean;
}): Promise<CatalogLibraryData> {
  const userId = options?.userId ?? cache.data?.userId ?? null;
  if (cache.data && cache.data.userId !== userId) {
    clearCatalogLibraryCache();
  }

  const force = options?.force === true;
  const hasFresh = cache.data != null && !cache.stale && !force;
  if (hasFresh && cache.data) {
    return cache.data;
  }

  if (cache.data && !force) {
    void revalidateCatalogLibrary(userId);
    return cache.data;
  }

  if (cache.inflight) {
    return cache.inflight;
  }

  const generation = cache.generation;
  const request = fetchCatalogLibraryData(userId)
    .then((data) => {
      if (cache.generation === generation || cache.data == null || cache.stale) {
        cache = {
          data,
          stale: false,
          inflight: null,
          generation: cache.generation + 1,
        };
        notify();
      } else {
        cache.inflight = null;
      }
      return data;
    })
    .catch((error) => {
      cache.inflight = null;
      throw error;
    });

  cache.inflight = request;
  return request;
}

export function revalidateCatalogLibrary(userId?: string | null): Promise<CatalogLibraryData> {
  const uid = userId ?? cache.data?.userId ?? null;
  if (cache.inflight) return cache.inflight;

  const generation = cache.generation;
  const request = fetchCatalogLibraryData(uid)
    .then((data) => {
      if (cache.generation !== generation && !cache.stale) {
        cache.inflight = null;
        return data;
      }
      cache = {
        data,
        stale: false,
        inflight: null,
        generation: cache.generation + 1,
      };
      notify();
      return data;
    })
    .catch((error) => {
      cache.inflight = null;
      throw error;
    });

  cache.inflight = request;
  return request;
}

export async function resolveCatalogCacheUserId(): Promise<string | null> {
  const client = createClient();
  const { data } = await client.auth.getSession();
  return data.session?.user?.id ?? null;
}
