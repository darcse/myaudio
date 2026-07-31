import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  extractJsonArrayFromText,
  extractJsonObjectFromText,
  withRetry,
} from '@/lib/aiRetry';
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
export type { HeadfiSoundScores } from '@/lib/headfiSoundScores';
export { buildHeadfiSoundScoresPromptBlock, headfiHasSoundScores } from '@/lib/headfiSoundScores';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeMusicTaste(albums: {
  genre1: string | null;
  genre2: string | null;
  country: string | null;
  release_date: string | null;
}[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

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
    const jsonRaw = extractJsonObjectFromText(text);
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
    model: 'gemini-3.5-flash-lite',
    systemInstruction:
      '당신은 한국어 음악 매거진 에디터입니다. 앨범 소개는 존대어(~습니다체)로 풍부하고 구체적으로 작성합니다. 한 줄 요약이나 짧은 나열은 피합니다.',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.6,
    },
  });

  const prompt = `
Google Search로 "${album.artist} - ${album.album_name}" 앨범을 검색해.
앨범의 음악적 특성, 프로덕션, 마스터링, 장르적 분위기, 평가를 파악한 뒤,
반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.
audio_tags와 album_intro는 반드시 한국어로만 작성해.

등록된 메타데이터 (참고):
- 장르: ${album.genre1 || ''}${album.genre2 ? '/' + album.genre2 : ''}
- 국가: ${album.country || ''}
- 발매: ${album.release_date || ''}

{
  "audio_tags": ["태그1", "태그2", "태그3", "태그4", "태그5", "태그6"],
  "album_intro": "앨범 소개 본문"
}

audio_tags는 이 앨범의 음향적 특성을 나타내는 한국어 태그 최대 6개.
예: ["풍성한 공간감", "강렬한 드럼 타격감", "여성 보컬 강조", "따뜻한 중역대", "높은 해상도의 분리도", "넓은 사운드스테이지"]
구성 규칙:
- 감성적 태그 3개 + 기술적 태그 3개로 정확히 6개를 작성해.
- 감성적 태그는 분위기/정서 중심, 기술적 태그는 대역/해상도/다이내믹/공간표현 중심으로 작성해.
- 태그를 한 단어로 요약하지 말고, 의미가 분명히 드러나는 구문 그대로 작성해. (예: "고해상도" 대신 "높은 해상도의 분리도")

album_intro 작성 규칙:
- 최소 4문장, 200자 이상으로 작성해. 1~2문장짜리 짧은 소개는 금지.
- 존대어(~습니다, ~였습니다)로 자연스럽게 서술해.
- 아래 내용을 골고루 담아: (1) 발매 배경·시기·아티스트 맥락 (2) 음악적 특징·장르·분위기 (3) 사운드·프로덕션·마스터링 성향 (4) 대표곡·평가·음악사적 의미 (검색으로 확인된 경우)
- 각 문장은 구체적인 사실이나 음향 묘사를 포함하고, 추상적인 한 줄 요약으로 끝내지 마.
- 줄바꿈은 \\n으로 표현해 (2~3문단 권장).

album_intro 작성 시 반드시 지킬 것:
- 헤드폰·이어폰·DAC·앰프 등 오디오 기기명, 브랜드명, 모델명을 쓰지 마.
- 기기 추천, 매칭, "OO에 어울리는", 번호 매긴 목록(1. 2. 3.) 형식은 쓰지 마.
- 앨범 음악·프로덕션·분위기 설명만 작성해.

[작성 예시 — 문체·분량·톤 참고]
{"audio_tags": ["몽환적인 공간감", "서정적인 보컬", "넓은 사운드스테이지", "따뜻한 중역대", "높은 해상도의 분리도", "섬세한 다이내믹 표현"], "album_intro": "1997년 발매된 Radiohead의 'OK Computer'는 1990년대 얼터너티브 롹의 정점을 보여주는 작품으로, 디지털 시대의 소외와 불안을 서정적인 멜로디와 실험적인 사운드스케이프로 풀어냈습니다.\\n밀도 높은 기타 레이어링과 공간감 있는 프로덕션이 특징이며, 저역은 단단하면서도 중·고역의 디테일이 선명하게 분리됩니다. 'Paranoid Android'와 'Karma Police' 등 수록곡들은 넓은 다이내믹 레인지와 몽환적인 분위기를 동시에 담아내, 몰입감 있는 청취 경험을 제공합니다.\\n비평가들로부터 '세기의 명반'으로 평가받으며 이후 인디·얼터너티브 음악 전반에 지속적인 영향을 미쳤습니다."}
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromText(text);
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
    model: 'gemini-3.5-flash-lite',
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
    const jsonRaw = extractJsonObjectFromText(text);
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


export async function recommendHeadfiListeningGenres(headphone: {
  brand: string;
  model: string;
}): Promise<string[] | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
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
    const jsonRaw = extractJsonObjectFromText(text);
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
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

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
    const jsonRaw = extractJsonObjectFromText(text);
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
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
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
    model: 'gemini-3.5-flash-lite',
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
    model: 'gemini-3.5-flash-lite',
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
    const jsonRaw = extractJsonObjectFromText(text);
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
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

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
    const jsonRaw = extractJsonArrayFromText(text);
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

export type HeadfiPositionResult = {
  x: number;
  y: number;
  label: string;
};

type HeadfiWiredPositionInput = {
  profile: 'wired';
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
};

type HeadfiDacAmpPositionInput = {
  profile: 'dac_amp';
  brand: string;
  model: string;
  category: string;
  driveGrade: string;
  chipset: string;
  rk: string;
  vrms32: string;
  vrms300: string;
  memo: string;
};

export type HeadfiPositionInput = HeadfiWiredPositionInput | HeadfiDacAmpPositionInput;

export async function analyzeHeadfiPosition(input: HeadfiPositionInput): Promise<HeadfiPositionResult | null> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    tools: [{ googleSearch: {} }] as unknown as Parameters<typeof genAI.getGenerativeModel>[0]['tools'],
  });

  const prompt =
    input.profile === 'dac_amp'
      ? `너는 헤드파이 전문 분석가야. 아래 DAC/AMP/DAP의 출력 스펙과 실제 리뷰·측정 데이터를 분석해서 포지션맵 좌표를 생성해줘.

[기기] ${input.brand} ${input.model} | 카테고리: ${input.category}
[출력 스펙] 구동방식/등급:${input.driveGrade} | Chipset:${input.chipset} | 정합 임피던스(Rk):${input.rk} | Vrms@32Ω:${input.vrms32} | Vrms@300Ω:${input.vrms300}
[특징] ${input.memo}

실제 리뷰와 측정 데이터를 검색해서 참고하고, 정합 임피던스(Rk)와 Vrms 출력 특성을 반영해 아래 기준으로 -1.0~1.0 사이 좌표를 생성해줘 (스펙 값이 '-'이면 해당 항목 없이 판단):
- x축: -1.0(매우 따뜻함/warm) ~ 1.0(매우 차가움/cool)
- y축: -1.0(매우 음악적/감성적) ~ 1.0(매우 분석적/모니터링)
- position_label: 이 기기의 음색·출력 성향 한 줄 요약

JSON만 응답: {"x": 0.3, "y": -0.2, "label": "따뜻하고 음악적인 성향"}`
      : `너는 헤드파이 전문 분석가야. 아래 기기의 음향 특성을 분석해서 포지션맵 좌표를 생성해줘.

[기기] ${input.brand} ${input.model} | 카테고리: ${input.category}
[청음 평가] 저역:${input.bass} 중역:${input.mid} 고역:${input.treble} 해상력:${input.resolution} 분리도:${input.separation} 음장:${input.soundstage}
[FR 해석] ${input.frSummary}
[AI 분석] ${input.aiSoundAnalysis}

실제 리뷰와 측정 데이터를 검색해서 참고하고 아래 기준으로 -1.0~1.0 사이 좌표를 생성해줘:
- x축: -1.0(매우 따뜻함/warm) ~ 1.0(매우 차가움/cool)
- y축: -1.0(매우 음악적/감성적) ~ 1.0(매우 분석적/모니터링)
- position_label: 이 기기의 음색 성향 한 줄 요약 (예: "따뜻하고 분석적인 올라운더")

JSON만 응답: {"x": 0.3, "y": -0.2, "label": "따뜻하고 음악적인 성향"}`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const jsonRaw = extractJsonObjectFromText(text);
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
    model: 'gemini-3.5-flash-lite',
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
