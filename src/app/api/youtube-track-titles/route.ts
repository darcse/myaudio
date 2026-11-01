import { NextRequest, NextResponse } from 'next/server';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;
const MAX_IDS = 200;
const CONCURRENCY = 4;
const MUSIC_CATALOG_TIMEOUT_MS = 2000;
const KO_ACCEPT_LANGUAGE = 'ko-KR,ko;q=0.9';
const HAS_ORIGINAL_SCRIPT = /[\u3040-\u30FF\u31F0-\u31FF\u3400-\u9FFF\uAC00-\uD7A3]/;
const KOREAN_ALBUM_COUNTRY = '한국';

function readTitle(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  };
  const pool = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

function catalogFallbackReason(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name: unknown }).name);
    if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  }
  return 'error';
}

async function fetchOembedTitle(videoId: string): Promise<string | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object') return null;
    return readTitle((data as { title?: unknown }).title);
  } catch {
    return null;
  }
}

async function fetchMusicCatalogTitle(
  videoId: string,
): Promise<{ ok: true; title: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(MUSIC_CATALOG_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'Accept-Language': KO_ACCEPT_LANGUAGE,
        'Content-Type': 'application/json',
        Origin: 'https://music.youtube.com',
        Referer: 'https://music.youtube.com/',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20251103.01.00',
            hl: 'ko',
            gl: 'KR',
          },
        },
        videoId,
      }),
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, reason: 'invalid_response' };
    }
    if (!data || typeof data !== 'object') return { ok: false, reason: 'invalid_response' };
    const record = data as {
      videoDetails?: { title?: unknown };
      microformat?: { microformatDataRenderer?: { title?: unknown } };
    };
    const title = readTitle(record.videoDetails?.title)
      ?? readTitle(record.microformat?.microformatDataRenderer?.title);
    if (!title) return { ok: false, reason: 'empty' };
    return { ok: true, title };
  } catch (error) {
    return { ok: false, reason: catalogFallbackReason(error) };
  }
}

async function fetchTrackTitle(videoId: string, useKoreanCatalog: boolean): Promise<string | null> {
  const oembed = await fetchOembedTitle(videoId);
  if (!useKoreanCatalog) return oembed;
  if (oembed && HAS_ORIGINAL_SCRIPT.test(oembed)) return oembed;
  const catalog = await fetchMusicCatalogTitle(videoId);
  if (catalog.ok) return catalog.title;
  console.warn(`[youtube-track-titles] music_fallback ${catalog.reason}`);
  return oembed;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { videoIds?: unknown; country?: unknown };
    if (!Array.isArray(body.videoIds)) {
      return NextResponse.json({ error: 'videoIds required' }, { status: 400 });
    }
    if (body.videoIds.length > MAX_IDS) {
      return NextResponse.json({ error: 'too many videoIds' }, { status: 400 });
    }
    const videoIds: string[] = [];
    for (const raw of body.videoIds) {
      if (typeof raw !== 'string') {
        return NextResponse.json({ error: 'invalid videoId' }, { status: 400 });
      }
      const id = raw.trim();
      if (!VIDEO_ID_RE.test(id)) {
        return NextResponse.json({ error: 'invalid videoId' }, { status: 400 });
      }
      videoIds.push(id);
    }
    const useKoreanCatalog = typeof body.country === 'string' && body.country.trim() === KOREAN_ALBUM_COUNTRY;
    const titles = videoIds.length === 0
      ? []
      : await mapPool(videoIds, CONCURRENCY, (videoId) => fetchTrackTitle(videoId, useKoreanCatalog));
    return NextResponse.json({ titles });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
