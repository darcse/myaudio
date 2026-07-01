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
import { stripHeadphoneIdSuffixes } from '@/lib/utils';

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

function extractJsonArrayFromGeminiText(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
  if (fenced?.[1]) return fenced[1];
  const bracket = text.match(/\[[\s\S]*\]/);
  return bracket ? bracket[0] : null;
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
예: ["풍성한 공간감", "강렬한 드럼 타격감", "여성 보컬 강조", "따뜻한 중역대", "높은 해상도의 분리도", "넓은 사운드스테이지"]
구성 규칙:
- 감성적 태그 3개 + 기술적 태그 3개로 정확히 6개를 작성해.
- 감성적 태그는 분위기/정서 중심, 기술적 태그는 대역/해상도/다이내믹/공간표현 중심으로 작성해.
- 태그를 한 단어로 요약하지 말고, 의미가 분명히 드러나는 구문 그대로 작성해. (예: "고해상도" 대신 "높은 해상도의 분리도")
album_intro는 3~4줄 분량으로 작성해.
album_intro 작성 시 반드시 지킬 것:
- 헤드폰·이어폰·DAC·앰프 등 오디오 기기명, 브랜드명, 모델명을 쓰지 마.
- 기기 추천, 매칭, "OO에 어울리는", 번호 매긴 목록(1. 2. 3.) 형식은 쓰지 마.
- 앨범 음악·프로덕션·분위기 설명만 작성해.
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

export async function generateArtistBio(artist: {
  artist_name: string;
  country: string;
  artist_type: string;
  genre: string;
}): Promise<{ bio: string } | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const prompt = `너는 음악 전문 에디터야. 아래 아티스트에 대해 실제 검색을 통해 정확한 소개를 작성해줘.

[아티스트] ${artist.artist_name} | 국적: ${artist.country || '-'} | 타입: ${artist.artist_type || '-'} | 주요 장르: ${artist.genre || '-'}

검색을 통해 다음을 포함한 3~4줄 소개를 작성해줘:
- 아티스트 활동 시작 시기와 배경
- 음악적 특징과 대표 사운드
- 대표작 또는 주요 활동
- 국내외 평가나 영향력

bio는 반드시 한국어로만 작성해. 영어·일본어 등 다른 언어 사용 금지.

JSON만 응답: {"bio": "소개 내용"}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { bio?: unknown };
    let bio = typeof parsed.bio === 'string' ? parsed.bio.trim() : '';
    bio = bio.replace(/\\n/g, '\n');
    if (!bio) return null;
    return { bio };
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

export async function pickAlbumMoodGroupName(
  album: {
    artist: string | null;
    album_name: string | null;
    genre1: string | null;
    genre2: string | null;
    audio_tags: string[] | null;
  },
  moodNames: string[],
): Promise<string | null> {
  if (moodNames.length === 0) return null;
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  const tags = Array.isArray(album.audio_tags) ? JSON.stringify(album.audio_tags) : '[]';
  const prompt = `무드 그룹 목록:
${moodNames.join('\n')}

앨범 정보:
아티스트: ${album.artist ?? ''}
앨범명: ${album.album_name ?? ''}
장르1: ${album.genre1 ?? ''}
장르2: ${album.genre2 ?? ''}
오디오 태그: ${tags}

위 무드 그룹 중 가장 적합한 하나의 mood_name만 반환해. 다른 텍스트 없이 목록에 있는 무드명 그대로만 출력해.`;
  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text().trim().replace(/```json|```/g, '').replace(/^["']|["']$/g, '');
    if (moodNames.includes(text)) return text;
    const hit = moodNames.find((name) => text.includes(name));
    return hit ?? null;
  } catch {
    return null;
  }
}

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

export async function recommendAlbumHeadphones(
  album: {
    artist: string | null;
    album_name: string | null;
    genre1: string | null;
    genre2: string | null;
    audio_tags: string[] | null;
    mood_name: string | null;
  },
  headphones: {
    id: number;
    brand: string;
    model: string;
    temp: string;
    impedance: string;
    sensitivity: string;
    recommended_genres: string;
    fr_summary: string;
  }[],
): Promise<{ headphone_ids: number[]; reason: string } | null> {
  if (headphones.length === 0) return null;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const tags = Array.isArray(album.audio_tags) ? album.audio_tags.join(', ') : '-';
  const mood = album.mood_name?.trim() || '-';
  const genre = `${album.genre1 || ''}${album.genre2 ? `/${album.genre2}` : ''}`.trim() || '-';

  const list = headphones
    .map(
      (h) =>
        `${h.id}|${h.brand}|${h.model}|${h.temp}|${h.impedance}|${h.sensitivity}|${h.recommended_genres}|${h.fr_summary}`,
    )
    .join('\n');

  const prompt = `너는 헤드파이 전문 리뷰어야. 실제 기기 특성과 리뷰를 참고해서 이 앨범에 가장 잘 어울리는 헤드폰을 추천해줘.

[앨범] ${album.artist || ''} - ${album.album_name || ''} | 장르: ${genre} | 오디오 태그: ${tags} | 무드: ${mood}

[보유 헤드폰 목록]
id|브랜드|모델명|음색|임피던스|감도|추천장르|FR요약
${list}

이 앨범의 음악적 특성(장르, 분위기, 사운드 텍스처)을 고려했을 때
가장 잘 어울리는 헤드폰 최대 2개를 선택하고, 음향적 근거를 포함한 추천 이유를 작성해줘.

후보 헤드폰이 2개 이상이면 headphone_ids 배열에 반드시 정확히 2개의 id를 넣어.
headphone_ids에는 위 목록에 있는 id 숫자만 사용하고, reason에 언급하는 헤드폰과 headphone_ids가 반드시 일치해야 해.
reason에는 브랜드·모델명만 쓰고 id나 괄호 안 숫자는 절대 넣지 마.

평가 기준:
- 장르와 헤드폰 음색의 매칭도
- 헤드폰의 강점(저역/중역/고역)이 이 앨범의 핵심 사운드와 부합하는지
- 실제 측정/리뷰 데이터 기반 신뢰성

JSON만 응답:
{"headphone_ids": [1, 2], "reason": "구체적 근거를 포함한 2~3줄 추천 이유"}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { headphone_ids?: unknown; reason?: unknown };
    const validIds = new Set(headphones.map((h) => h.id));
    let rawIds: unknown[] = [];
    if (Array.isArray(parsed.headphone_ids)) {
      rawIds = parsed.headphone_ids;
    } else if (typeof parsed.headphone_ids === 'number') {
      rawIds = [parsed.headphone_ids];
    }
    const seen = new Set<number>();
    const headphoneIds: number[] = [];
    for (const item of rawIds) {
      const id = typeof item === 'number' ? item : parseInt(String(item), 10);
      if (!Number.isFinite(id) || !validIds.has(id) || seen.has(id)) continue;
      seen.add(id);
      headphoneIds.push(id);
      if (headphoneIds.length >= 2) break;
    }
    const reasonRaw = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';
    const reason = stripHeadphoneIdSuffixes(reasonRaw);
    if (headphoneIds.length === 0 || !reason) return null;
    if (headphones.length >= 2 && headphoneIds.length < 2) return null;
    return { headphone_ids: headphoneIds, reason };
  } catch {
    return null;
  }
}

export async function recommendHeadfiAlbums(
  headfi: {
    brand: string;
    model: string;
    temp: string;
    recommended_genres: string;
    fr_summary: string;
    ai_sound_analysis?: string | null;
  },
  albums: {
    id: number;
    artist: string | null;
    album_name?: string | null;
    genre1: string | null;
    genre2: string | null;
    audio_tags: string[] | null;
  }[],
): Promise<{ album_ids: number[]; reason: string } | null> {
  if (albums.length === 0) return null;

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const list = albums
    .map((a) => {
      const tags = Array.isArray(a.audio_tags) ? a.audio_tags.join(', ') : '';
      return `${a.id}|${a.artist || ''}|${a.album_name || ''}|${a.genre1 || ''}|${a.genre2 || ''}|${tags}`;
    })
    .join('\n');

  const soundAnalysis = headfi.ai_sound_analysis?.trim() || '';
  const analysisBlock = soundAnalysis ? `\n[음색 성향 분석] ${soundAnalysis}\n` : '';
  const recommendInstruction = soundAnalysis
    ? `위 기기의 음색 성향 분석을 핵심 근거로 삼아, 이 기기로 들었을 때 가장 잘 어울리는 
앨범 3개를 선택하고 음향적 근거를 포함한 소개를 작성해줘.`
    : `이 기기로 들었을 때 가장 잘 어울리는 앨범 3개를 선택하고 음향적 근거를 포함한 소개를 작성해줘.`;

  const prompt = `너는 헤드파이 전문가이자 음악 큐레이터야.
[기기] ${headfi.brand} ${headfi.model} | 음색:${headfi.temp} | 추천장르:${headfi.recommended_genres} | FR요약:${headfi.fr_summary}${analysisBlock}
[보유 앨범 목록] id|artist|album_name|genre1|genre2|audio_tags
${list}

${recommendInstruction}
album_ids에는 위 목록에 있는 id 숫자만 사용해.

추천 이유(reason) 작성 시 절대 규칙:
- album_id 숫자를 텍스트에 언급하지 마
- 반드시 실제 앨범명으로 지칭해 (예: "339번은" → "Clover는")
- 앨범 목록에 제공된 artist, album_name을 활용해 이름으로 서술

JSON만 응답: {"album_ids":[1,2,3],"reason":"근거 포함 2~3줄 소개"}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { album_ids?: unknown; reason?: unknown };
    const validIds = new Set(albums.map((a) => a.id));
    let rawIds: unknown[] = [];
    if (Array.isArray(parsed.album_ids)) {
      rawIds = parsed.album_ids;
    } else if (typeof parsed.album_ids === 'number') {
      rawIds = [parsed.album_ids];
    }
    const seen = new Set<number>();
    const albumIds: number[] = [];
    for (const item of rawIds) {
      const id = typeof item === 'number' ? item : parseInt(String(item), 10);
      if (!Number.isFinite(id) || !validIds.has(id) || seen.has(id)) continue;
      seen.add(id);
      albumIds.push(id);
      if (albumIds.length >= 3) break;
    }
    const reasonRaw = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';
    const reason = stripHeadphoneIdSuffixes(reasonRaw);
    if (albumIds.length === 0 || !reason) return null;
    if (albums.length >= 3 && albumIds.length < 3) return null;
    return { album_ids: albumIds, reason };
  } catch {
    return null;
  }
}

export type HeadfiSoundScores = {
  brand: string;
  model: string;
  category: string;
  bass_quantity: number | null | undefined;
  bass_depth: number | null | undefined;
  bass_speed: number | null | undefined;
  dynamics_slam: number | null | undefined;
  midrange_body: number | null | undefined;
  tone_warmth: number | null | undefined;
  vocal_position: number | null | undefined;
  midrange_clarity: number | null | undefined;
  treble_brightness: number | null | undefined;
  treble_smoothness: number | null | undefined;
  treble_airiness: number | null | undefined;
  resolution: number | null | undefined;
  separation: number | null | undefined;
  soundstage: number | null | undefined;
  imaging: number | null | undefined;
  timbre: number | null | undefined;
};

function formatSoundScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return String(value);
}

export function headfiHasSoundScores(scores: HeadfiSoundScores): boolean {
  const values = [
    scores.bass_quantity,
    scores.bass_depth,
    scores.bass_speed,
    scores.dynamics_slam,
    scores.midrange_body,
    scores.tone_warmth,
    scores.vocal_position,
    scores.midrange_clarity,
    scores.treble_brightness,
    scores.treble_smoothness,
    scores.treble_airiness,
    scores.resolution,
    scores.separation,
    scores.soundstage,
    scores.imaging,
    scores.timbre,
  ];
  return values.some((v) => v != null && Number(v) > 0);
}

export async function analyzeHeadfiSound(
  headfi: HeadfiSoundScores,
): Promise<{ analysis: string } | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const prompt = `너는 헤드파이 전문 리뷰어야. 아래 기기의 청음 평가 점수와 실제 리뷰/측정 데이터를 종합해 
이 기기의 음색 성향을 상세하게 분석해줘.

[기기] ${headfi.brand} ${headfi.model} | 카테고리: ${headfi.category}

[청음 평가 점수 (10점 만점)]
저역 - 양감:${formatSoundScore(headfi.bass_quantity)} 깊이:${formatSoundScore(headfi.bass_depth)} 속도:${formatSoundScore(headfi.bass_speed)}
중역 - 다이내믹스:${formatSoundScore(headfi.dynamics_slam)} 두께감:${formatSoundScore(headfi.midrange_body)} 온기:${formatSoundScore(headfi.tone_warmth)} 보컬위치:${formatSoundScore(headfi.vocal_position)} 명료도:${formatSoundScore(headfi.midrange_clarity)}
고역 - 밝기:${formatSoundScore(headfi.treble_brightness)} 부드러움:${formatSoundScore(headfi.treble_smoothness)} 공기감:${formatSoundScore(headfi.treble_airiness)}
기술 - 해상력:${formatSoundScore(headfi.resolution)} 분리도:${formatSoundScore(headfi.separation)} 음장:${formatSoundScore(headfi.soundstage)} 이미징:${formatSoundScore(headfi.imaging)} 음색:${formatSoundScore(headfi.timbre)}

실제 이 모델에 대한 전문 리뷰나 측정 데이터를 검색해서 참고하고, 
위 점수 패턴과 비교해 다음을 포함한 분석을 작성해줘:
- 전반적인 음색 성향 (예: 따뜻하고 부드러운, 분석적이고 정교한 등)
- 저역/중역/고역 밸런스 특징과 그 근거
- 이 기기가 가장 빛을 발하는 음악적 상황 (장르, 보컬/악기 중심 등)
- 실측 데이터와 청음 평가 점수가 일치하는지, 다르다면 어떻게 다른지

4~6줄 분량으로 구체적이고 전문적으로 작성. 평이한 설명 금지, 근거 기반 서술.

JSON만 응답:
{"analysis":"분석 텍스트"}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { analysis?: unknown };
    const analysis = typeof parsed.analysis === 'string' ? parsed.analysis.trim() : '';
    if (!analysis) return null;
    return { analysis };
  } catch {
    return null;
  }
}

export async function recommendHeadfiAlbumMatch(
  dacAmp: {
    name: string;
    amp_type: string;
    temp: string;
    output_impedance: string;
  },
  headphone: {
    name: string;
    temp: string;
    fr_summary: string;
    recommended_genres: string;
  },
  albums: {
    id: number;
    artist: string | null;
    genre1: string | null;
    genre2: string | null;
    audio_tags: string[] | null;
  }[],
): Promise<{ album_id: number; reason: string }[] | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

  const albumList = albums
    .map((a) => {
      const tags = Array.isArray(a.audio_tags) ? a.audio_tags.join(', ') : '';
      return `${a.id}, ${a.artist || ''}, ${a.genre1 || ''}, ${a.genre2 || ''}, ${tags}`;
    })
    .join('\n');

  const prompt = `너는 하이파이 오디오 전문가이자 음악 큐레이터야.

[DAC/AMP] ${dacAmp.name} | 앰프타입: ${dacAmp.amp_type} | 음색: ${dacAmp.temp} | 출력임피던스: ${dacAmp.output_impedance}
[헤드폰] ${headphone.name} | 음색: ${headphone.temp} | FR요약: ${headphone.fr_summary} | 추천장르: ${headphone.recommended_genres}

위 조합의 음색 시너지를 분석하고 아래 앨범 중 이 조합으로 들었을 때
가장 돋보일 앨범 5개를 추천해줘.

추천 기준:
- 기기 조합의 강점이 부각되는 장르/음색
- FR 특성과 앨범 오디오 태그 매칭
- 단순 장르 매칭이 아닌 음향적 시너지 기준

앨범 목록 형식: id, artist, genre1, genre2, audio_tags

JSON만 응답: [{"album_id": 123, "reason": "추천 이유 2~3줄"}]

앨범 목록:
${albumList}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonArrayFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const validIds = new Set(albums.map((a) => a.id));
    const out: { album_id: number; reason: string }[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const row = item as { album_id?: unknown; reason?: unknown };
      const albumId = typeof row.album_id === 'number' ? row.album_id : null;
      const reason = typeof row.reason === 'string' ? row.reason.trim() : '';
      if (albumId == null || !validIds.has(albumId) || !reason) continue;
      if (out.some((o) => o.album_id === albumId)) continue;
      out.push({ album_id: albumId, reason });
      if (out.length >= 5) break;
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

export type HeadfiMatchScoreResult = {
  gear_id: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

export async function analyzeHeadfiMatchScore(
  base: {
    name: string;
    temp: string;
    genres: string;
    fr_summary: string;
  },
  candidateLines: string[],
  validGearIds: number[],
): Promise<HeadfiMatchScoreResult[] | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });
  const list = candidateLines.join('\n');
  const prompt = `너는 헤드파이 전문 리뷰어이자 오디오 엔지니어야.
실제 측정 데이터, 전문 리뷰, 유저 평가를 참고해서 아래 기기 조합의 궁합을 분석해줘.

[기준 기기] ${base.name} | 음색:${base.temp} | 추천장르:${base.genres} | FR요약:${base.fr_summary}

[후보 기기 목록]
id|기기명|음색|임피던스|감도|저역|중역|고역
${list}

각 후보 기기와의 조합을 아래 기준으로 100점 만점 평가:
- drive: 해당 DAC/AMP가 헤드폰을 충분히 구동할 수 있는지 (임피던스, 감도, 출력 매칭)
- synergy: 두 기기의 음색 성향이 서로 보완하거나 시너지를 내는지
- genre: 조합이 특정 장르에서 강점을 보이는지

평가 시 주의사항:
- 임피던스/감도 수치를 반드시 고려해서 drive 점수 산정
- 음색이 겹치면 synergy 낮게, 상호 보완이면 높게
- 실제 측정/리뷰 데이터 검색 후 반영

각 기기에 대해 구체적 근거와 함께 2~3줄 총평 작성.

JSON만 응답:
[{"gear_id":1,"drive":85,"synergy":90,"genre":80,"comment":"구체적 근거 포함 2~3줄 총평"}]`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonArrayFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const validIds = new Set(validGearIds);
    const out: HeadfiMatchScoreResult[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const row = item as {
        gear_id?: unknown;
        drive?: unknown;
        synergy?: unknown;
        genre?: unknown;
        comment?: unknown;
      };
      const gearId = typeof row.gear_id === 'number' ? row.gear_id : null;
      const drive = typeof row.drive === 'number' ? row.drive : null;
      const synergy = typeof row.synergy === 'number' ? row.synergy : null;
      const genre = typeof row.genre === 'number' ? row.genre : null;
      const comment = typeof row.comment === 'string' ? row.comment.trim() : '';
      if (gearId == null || !validIds.has(gearId) || drive == null || synergy == null || genre == null) {
        continue;
      }
      if (out.some((o) => o.gear_id === gearId)) continue;
      out.push({
        gear_id: gearId,
        drive: Math.min(100, Math.max(0, Math.round(drive))),
        synergy: Math.min(100, Math.max(0, Math.round(synergy))),
        genre: Math.min(100, Math.max(0, Math.round(genre))),
        comment: comment || '-',
      });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

export type HeadfiPositionResult = {
  x: number;
  y: number;
  label: string;
};

export async function analyzeHeadfiPosition(input: {
  brand: string;
  model: string;
  category: string;
  bass: string;
  mid: string;
  treble: string;
  resolution: string;
  separation: string;
  soundstage: string;
  frSummary: string;
  aiSoundAnalysis: string;
}): Promise<HeadfiPositionResult | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const prompt = `너는 헤드파이 전문 분석가야. 아래 기기의 음향 특성을 분석해서 포지션맵 좌표를 생성해줘.

[기기] ${input.brand} ${input.model} | 카테고리: ${input.category}
[청음 평가] 저역:${input.bass} 중역:${input.mid} 고역:${input.treble} 해상력:${input.resolution} 분리도:${input.separation} 음장:${input.soundstage}
[FR 해석] ${input.frSummary}
[AI 분석] ${input.aiSoundAnalysis}

실제 리뷰와 측정 데이터를 검색해서 참고하고 아래 기준으로 -1.0~1.0 사이 좌표를 생성해줘:
- x축: -1.0(매우 따뜻함) ~ 1.0(매우 밝음)
- y축: -1.0(매우 음악적/감성적) ~ 1.0(매우 분석적/모니터링)
- position_label: 이 기기의 음색 성향 한 줄 요약 (예: "따뜻하고 분석적인 올라운더")

JSON만 응답: {"x": 0.3, "y": -0.2, "label": "따뜻하고 음악적인 성향"}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromGeminiText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { x?: unknown; y?: unknown; label?: unknown };
    const x = typeof parsed.x === 'number' ? parsed.x : null;
    const y = typeof parsed.y === 'number' ? parsed.y : null;
    const label = typeof parsed.label === 'string' ? parsed.label.trim() : '';
    if (x == null || y == null || !label) return null;
    return {
      x: Math.min(1, Math.max(-1, Math.round(x * 100) / 100)),
      y: Math.min(1, Math.max(-1, Math.round(y * 100) / 100)),
      label,
    };
  } catch {
    return null;
  }
}

export async function generateMonthlyReviewComment(
  year: number,
  month: number,
  activityText: string,
  systemInstruction: string,
): Promise<string | null> {
  const trimmed = activityText.trim();
  if (!trimmed) return null;
  const user = `${year}년 ${month}월 활동:\n${trimmed}`;
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite-preview',
    systemInstruction,
  });
  try {
    const result = await withRetry(() => model.generateContent(user));
    const text = result.response.text().trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
