import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildAlbumIdCatalog,
  isUuidLike,
  narrowCatalogToExplicitUuids,
  parseGeminiAlbumMoodJson,
  type AlbumMoodGroupRow,
  type AlbumMoodUuidOptions,
} from '@/lib/albumMoodRefs';

export type { AlbumMoodGroupRow, AlbumMoodUuidOptions } from '@/lib/albumMoodRefs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const message = err?.message ?? '';
      const is429 =
        err?.status === 429 || message.includes('429') || message.includes('Too Many Requests');
      const is503 =
        err?.status === 503 || message.includes('503') || message.includes('Service Unavailable');
      if (is429 && i < retries - 1) {
        const retryDelayMatch = message.match(/retry in (\d+)s/i);
        const waitMs = retryDelayMatch ? parseInt(retryDelayMatch[1], 10) * 1000 + 1000 : 60000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      if (is503 && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

function extractJsonObjectFromGeminiText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (fenced?.[1]) return fenced[1];
  const brace = text.match(/\{[\s\S]*\}/);
  return brace ? brace[0] : null;
}

export async function generateAlbumIntroAndTags(album: {
  artist: string | null;
  album_name: string | null;
  genre1: string | null;
  genre2: string | null;
  release_date: string | null;
  country: string | null;
}): Promise<{ audio_tags: string[]; album_intro: string } | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const prompt = `
Google Search로 "${album.artist} - ${album.album_name}" 앨범을 검색해.
앨범의 음악적 특성, 마스터링, 장르적 분위기를 파악한 뒤,
반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.
audio_tags와 album_intro는 반드시 한국어로만 작성해.

등록된 메타데이터 (참고):
- 장르: ${album.genre1 || ''}${album.genre2 ? '/' + album.genre2 : ''}
- 국가: ${album.country || ''}
- 발매: ${album.release_date || ''}

{
  "audio_tags": ["태그1", "태그2", "태그3", "태그4", "태그5", "태그6"],
  "album_intro": "이 앨범의 소개와 사운드 성향을 3~4줄로 설명. 줄바꿈은 \\n으로 표현."
}

audio_tags는 이 앨범의 음향적 특성을 나타내는 한국어 태그 최대 6개.
구성 규칙:
- 감성적 태그 3개 + 기술적 태그 3개로 정확히 6개를 작성해.
album_intro는 3~4줄 분량으로 작성해.
album_intro 작성 시 헤드폰·이어폰·DAC·앰프 등 오디오 기기명은 쓰지 마.
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { audio_tags?: unknown; album_intro?: unknown };
    const tags = Array.isArray(parsed.audio_tags)
      ? parsed.audio_tags.filter((t): t is string => typeof t === 'string').slice(0, 6)
      : [];
    let intro = typeof parsed.album_intro === 'string' ? parsed.album_intro.trim() : '';
    intro = intro.replace(/\\n/g, '\n');
    return { audio_tags: tags, album_intro: intro };
  } catch {
    return null;
  }
}

export const MOOD_GROUP_MUST_BE_NINE_MSG = '무드 그룹은 정확히 9개여야 합니다.';

export async function generateAlbumMoodGroups(
  albums: { id: number | string; genre1: string | null; genre2: string | null; audio_tags: string[] | null }[],
  options?: AlbumMoodUuidOptions,
): Promise<AlbumMoodGroupRow[] | null> {
  if (albums.length === 0) return [];
  const catalogBase = buildAlbumIdCatalog(albums);
  let catalog = catalogBase;
  if (options?.promptAllowedUuids && options.promptAllowedUuids.length > 0) {
    const narrowed = narrowCatalogToExplicitUuids(catalogBase, options.promptAllowedUuids);
    if (!narrowed) return null;
    catalog = narrowed;
  }
  if (catalog.allKeys.length === 0) return null;
  const idRule =
    catalog.kind === 'uuid'
      ? 'album_ids에는 아래에 제시한 "허용 album_uuid 목록"에 있는 문자열만 그대로 사용해. 목록에 없는 값(숫자만 있는 문자열 포함)은 절대 넣지 마.'
      : 'album_ids에는 목록에 적힌 id와 동일한 정수만 사용해.';
  const system = `너는 음악 큐레이터야. 응답은 오직 JSON 배열 하나뿐이며, 배열 원소(무드 그룹 객체) 개수는 반드시 정확히 9개여야 한다. 8개 이하나 10개 이상이면 잘못된 응답이다. 빈 배열이나 다른 키로 감싼 객체 전체를 내지 마. 각 원소 형식: {"mood_name":"무드명","album_ids":[…]}. 모든 앨범 id가 정확히 한 번씩만 전체 그룹에 걸쳐 포함되어야 한다. ${idRule}`;
  const allowedUuidHeader =
    catalog.kind === 'uuid'
      ? `[허용 album_uuid 목록 — album_ids에는 여기 나온 문자열만 사용. 목록에 없으면 무조건 제거.]\n${catalog.allKeys.join('\n')}\n\n`
      : '';
  const metaLines = albums
    .filter((a) => {
      if (catalog.kind !== 'uuid') return true;
      const id = a.id;
      const key =
        typeof id === 'string' && isUuidLike(id) ? id.trim().toLowerCase() : null;
      return key != null && catalog.byKey.has(key);
    })
    .map((a) => {
      const tags = Array.isArray(a.audio_tags) ? JSON.stringify(a.audio_tags) : '[]';
      if (catalog.kind === 'uuid') {
        const u =
          typeof a.id === 'string' && isUuidLike(a.id) ? a.id.trim().toLowerCase() : '';
        return `album_uuid:${u} | genre1:${a.genre1 ?? ''} | genre2:${a.genre2 ?? ''} | audio_tags:${tags}`;
      }
      return `id:${a.id} genre1:${a.genre1 ?? ''} genre2:${a.genre2 ?? ''} audio_tags:${tags}`;
    });
  const user = `${allowedUuidHeader}다음 앨범 메타를 참고해 9개 무드로 분류해줘:\n${metaLines.join('\n')}`;
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    systemInstruction: system,
  });
  try {
    const result = await withRetry(() => model.generateContent(user));
    const text = result.response.text();
    const fenced = text.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
    const jsonMatch = fenced?.[1] ? [fenced[1]] : text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 9) {
      throw new Error(MOOD_GROUP_MUST_BE_NINE_MSG);
    }
    return parseGeminiAlbumMoodJson(parsed, catalog);
  } catch (e) {
    if (e instanceof Error && e.message === MOOD_GROUP_MUST_BE_NINE_MSG) throw e;
    return null;
  }
}
