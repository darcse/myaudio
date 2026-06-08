import { GoogleGenerativeAI } from '@google/generative-ai';
import type { HeadfiFrInterpretation } from '@/app/headfi/types';
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

export async function analyzeMusicTaste(albums: {
  genre1: string | null;
  genre2: string | null;
  country: string | null;
  release_date: string | null;
}[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const albumSummary = albums
    .map(
      (a) =>
        `장르: ${a.genre1 || ''}${a.genre2 ? '/' + a.genre2 : ''}, 국가: ${a.country || ''}, 연도: ${a.release_date?.substring(0, 4) || ''}`,
    )
    .join('\n');

  const prompt = `
다음은 한 사람이 등록한 명반 목록의 요약이야.
이 데이터를 분석해서 반드시 아래 JSON 형식으로만 답변해줘.
다른 텍스트는 절대 포함하지 마.

앨범 목록:
${albumSummary}

응답 형식:
{
  "dominant_genres": ["장르1", "장르2", "장르3"],
  "preferred_era": "선호 시대 (예: 1990~2000년대)",
  "preferred_countries": ["국가1", "국가2"],
  "taste_summary": "취향을 한 문장으로 표현",
  "unregistered_recommendations": [
    { "artist": "아티스트명", "album": "앨범명", "reason": "추천 이유 한 줄" }
  ]
}
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    return JSON.parse(jsonRaw) as unknown;
  } catch {
    return null;
  }
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

export async function recommendByMood(
  mood: string,
  moodText: string,
  weather: { temperature: number; condition: string; description: string } | null,
  albums: {
    id: number;
    artist: string | null;
    album_name: string | null;
    genre1: string | null;
    genre2: string | null;
  }[],
  headphones: {
    id: number;
    brand: string;
    model: string;
    tone_warmth?: number | null;
    treble_brightness?: number | null;
    soundstage?: number | null;
  }[],
  timeSlot = '',
): Promise<{ album_id: number | null; headphone_id: number | null; reason: string } | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const albumList = albums
    .map(
      (a) =>
        `ID:${a.id} | ${a.artist || ''} - ${a.album_name || ''} | ${a.genre1 || ''}${a.genre2 ? '/' + a.genre2 : ''}`,
    )
    .join('\n');

  const headphoneList = headphones
    .map(
      (h) =>
        `ID:${h.id} | ${h.brand} ${h.model} | 온도:${h.tone_warmth ?? '?'} 밝기:${h.treble_brightness ?? '?'} 무대감:${h.soundstage ?? '?'}`,
    )
    .join('\n');

  const weatherDesc = weather
    ? `${weather.description}, 기온 ${weather.temperature}°C`
    : '날씨 정보 없음';

  const prompt = `
기분, 날씨, 시간대를 모두 종합해서 지금 이 순간에 가장 어울리는 정교한 추천을 해줘.

지금 사용자의 상태:
- 기분: ${mood} ${moodText ? `(추가 메모: ${moodText})` : ''}
- 현재 날씨: ${weatherDesc}
- 현재 시간대: ${timeSlot || '알 수 없음'}

아래는 사용자가 등록한 앨범 목록이야:
${albumList}

아래는 사용자가 보유한 헤드폰 목록이야:
${headphoneList}

1. 지금 이 순간 듣기 가장 좋은 앨범 1개
2. 그 앨범과 기분/날씨에 가장 어울리는 헤드폰 1개
3. 왜 이 조합이 어울리는지 한 문장

reason 작성 시 헤드폰은 "브랜드 모델명" 형식으로만 언급하고 ID 번호는 쓰지 마.
반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.
{
  "album_id": 앨범ID,
  "headphone_id": 헤드폰ID,
  "reason": "추천 이유 한 문장"
}
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as {
      album_id?: unknown;
      headphone_id?: unknown;
      reason?: unknown;
    };
    const validAlbumIds = albums.map((a) => a.id);
    const validHeadphoneIds = headphones.map((h) => h.id);
    const albumId = typeof parsed.album_id === 'number' ? parsed.album_id : null;
    const headphoneId = typeof parsed.headphone_id === 'number' ? parsed.headphone_id : null;
    return {
      album_id: albumId != null && validAlbumIds.includes(albumId) ? albumId : null,
      headphone_id: headphoneId != null && validHeadphoneIds.includes(headphoneId) ? headphoneId : null,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    };
  } catch {
    return null;
  }
}

export async function interpretHeadfiFrGraphFromImageBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<HeadfiFrInterpretation | null> {
  const base64 = buffer.toString('base64');

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
  const prompt = `
이 이미지는 헤드폰/이어폰 주파수 응답(FR) 측정 그래프일 수 있다.
그래프가 아니거나 판단할 수 없으면 아래 JSON에서 네 필드 모두 "이 이미지에서는 주파수 응답 그래프를 확인하기 어렵습니다." 정도로 짧게 적어.

반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.
모든 문장은 한국어로만.

{
  "bass": "저음 대역 특성 (1~2문장)",
  "mid": "중음 대역 특성 (1~2문장)",
  "treble": "고음 대역 특성 (1~2문장)",
  "summary": "전체 성향 요약 (2~3문장)"
}
  `;

  try {
    const result = await withRetry(() =>
      model.generateContent([
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ]),
    );
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as Record<string, unknown>;
    const bass = typeof parsed.bass === 'string' ? parsed.bass.trim() : '';
    const mid = typeof parsed.mid === 'string' ? parsed.mid.trim() : '';
    const treble = typeof parsed.treble === 'string' ? parsed.treble.trim() : '';
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!bass && !mid && !treble && !summary) return null;
    return { bass, mid, treble, summary };
  } catch (error) {
    console.error('Gemini FR 그래프 해석 실패:', error);
    return null;
  }
}

export async function recommendHeadfiListeningGenres(headphone: {
  brand: string;
  model: string;
}): Promise<string[] | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const prompt = `
Google Search로 "${headphone.brand} ${headphone.model}" 헤드폰 또는 이어폰의 리뷰, 커뮤니티 평가, 음향 논의를 검색해 참고해.
이 기기와 잘 어울리는 음악 장르·재생 스타일을 한국어 서술형으로 최대 4개까지 제안해.
예: "신나는 EDM", "날카로운 스래시 메탈", "잔잔한 어쿠스틱 보컬"처럼 짧고 구체적으로.

반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.
{
  "recommended_genres": ["항목1", "항목2", "항목3", "항목4"]
}

recommended_genres는 1개 이상, 최대 4개 배열. 항목은 모두 한국어로만 작성해.
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { recommended_genres?: unknown };
    const arr = Array.isArray(parsed.recommended_genres)
      ? parsed.recommended_genres.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const trimmed = arr.map((s) => s.trim()).slice(0, 4);
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function analyzeLyricsVibe(lyrics: string): Promise<{
  colors: string[];
  emoji: string;
} | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

  const prompt = `
다음 가사의 감성과 분위기를 분석해서 반드시 아래 JSON 형식으로만 답변해줘.
다른 텍스트는 절대 포함하지 마.

가사 (앞부분 500자):
"${lyrics.substring(0, 500)}"

응답 형식:
{
  "colors": ["그라디언트 시작 HEX", "그라디언트 끝 HEX"],
  "emoji": "분위기를 나타내는 이모지 1개"
}

색상 선택 기준:
- 우울/슬픔: 짙은 남색/보라 계열 (예: #1a1a2e, #16213e)
- 밝음/행복: 따뜻한 노랑/주황 계열 (예: #f7971e, #ffd200)
- 서정/감성: 차분한 청록/민트 계열 (예: #134e5e, #71b280)
- 강렬/열정: 진한 빨강/보라 계열 (예: #8e0e00, #1f1c18)
- 몽환/신비: 깊은 보라/인디고 계열 (예: #2c1654, #1a1a2e)
- 평온/잔잔: 부드러운 파랑/회색 계열 (예: #2c3e50, #3498db)
- 청량/상쾌: 밝은 하늘/청록 계열 (예: #00b4db, #0083b0)

두 색상이 자연스럽게 그라디언트를 이룰 수 있어야 해.
텍스트가 잘 보이도록 어두운 계열로 선택해줘.
`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { colors?: unknown; emoji?: unknown };
    if (!Array.isArray(parsed.colors) || parsed.colors.length < 2) return null;
    const colors = parsed.colors
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .slice(0, 2);
    if (colors.length < 2) return null;
    return {
      colors,
      emoji: typeof parsed.emoji === 'string' && parsed.emoji.trim() ? parsed.emoji.trim() : '🎵',
    };
  } catch (error) {
    console.error('Gemini 가사 분석 실패:', error);
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
