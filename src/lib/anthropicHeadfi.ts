import Anthropic from '@anthropic-ai/sdk';
import type { HeadfiFrInterpretation } from '@/app/headfi/types';
import { extractJsonObjectFromText, withRetry } from '@/lib/aiRetry';
import { stripHeadphoneIdSuffixes } from '@/lib/utils';

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';

type AnthropicImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

type HeadfiSoundScoresInput = {
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

function requireAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
  }
  return key;
}

function resolveAnthropicModel(): string {
  return process.env.ANTHROPIC_HEADFI_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

function normalizeImageMediaType(mimeType: string): AnthropicImageMediaType {
  const normalized = mimeType.trim().toLowerCase();
  if (
    normalized === 'image/jpeg' ||
    normalized === 'image/png' ||
    normalized === 'image/gif' ||
    normalized === 'image/webp'
  ) {
    return normalized;
  }
  return 'image/png';
}

function formatSoundScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return String(value);
}

type AnthropicTextCompletionOptions = {
  maxTokens?: number;
  logLabel?: string;
};

async function createAnthropicTextCompletion(
  prompt: string,
  options: AnthropicTextCompletionOptions = {},
): Promise<string> {
  const maxTokens = options.maxTokens ?? 1024;
  const start = Date.now();
  const client = new Anthropic({ apiKey: requireAnthropicApiKey() });
  const message = await withRetry(() =>
    client.messages.create({
      model: resolveAnthropicModel(),
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    }),
  );
  if (options.logLabel) {
    console.info(`[anthropicHeadfi] ${options.logLabel}`, {
      elapsedMs: Date.now() - start,
      usage: message.usage,
    });
  }
  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text.trim() : '';
}

export async function interpretHeadfiFrGraphFromImageBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<HeadfiFrInterpretation | null> {
  const base64 = buffer.toString('base64');
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
    const client = new Anthropic({ apiKey: requireAnthropicApiKey() });
    const message = await withRetry(() =>
      client.messages.create({
        model: resolveAnthropicModel(),
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: normalizeImageMediaType(mimeType),
                  data: base64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    );
    const textBlock = message.content.find((block) => block.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text : '';
    const jsonRaw = extractJsonObjectFromText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as Record<string, unknown>;
    const bass = typeof parsed.bass === 'string' ? parsed.bass.trim() : '';
    const mid = typeof parsed.mid === 'string' ? parsed.mid.trim() : '';
    const treble = typeof parsed.treble === 'string' ? parsed.treble.trim() : '';
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!bass && !mid && !treble && !summary) return null;
    return { bass, mid, treble, summary };
  } catch (error) {
    console.error('Anthropic FR 그래프 해석 실패:', error);
    return null;
  }
}

export async function analyzeHeadfiSound(
  headfi: HeadfiSoundScoresInput,
): Promise<{ analysis: string } | null> {
  const prompt = `너는 헤드파이 전문 리뷰어야. 아래 기기의 청음 평가 점수와 알려진 리뷰·측정 지식을 종합해 
이 기기의 음색 성향을 상세하게 분석해줘.

[기기] ${headfi.brand} ${headfi.model} | 카테고리: ${headfi.category}

[청음 평가 점수 (10점 만점)]
저역 - 양감:${formatSoundScore(headfi.bass_quantity)} 깊이:${formatSoundScore(headfi.bass_depth)} 속도:${formatSoundScore(headfi.bass_speed)}
중역 - 다이내믹스:${formatSoundScore(headfi.dynamics_slam)} 두께감:${formatSoundScore(headfi.midrange_body)} 온기:${formatSoundScore(headfi.tone_warmth)} 보컬위치:${formatSoundScore(headfi.vocal_position)} 명료도:${formatSoundScore(headfi.midrange_clarity)}
고역 - 밝기:${formatSoundScore(headfi.treble_brightness)} 부드러움:${formatSoundScore(headfi.treble_smoothness)} 공기감:${formatSoundScore(headfi.treble_airiness)}
기술 - 해상력:${formatSoundScore(headfi.resolution)} 분리도:${formatSoundScore(headfi.separation)} 음장:${formatSoundScore(headfi.soundstage)} 이미징:${formatSoundScore(headfi.imaging)} 음색:${formatSoundScore(headfi.timbre)}

위 점수 패턴과 이 모델에 대한 일반적인 전문 리뷰·측정 특성을 바탕으로 다음을 포함한 분석을 작성해줘:
- 전반적인 음색 성향 (예: 따뜻하고 부드러운, 분석적이고 정교한 등)
- 저역/중역/고역 밸런스 특징과 그 근거
- 이 기기가 가장 빛을 발하는 음악적 상황 (장르, 보컬/악기 중심 등)
- 알려진 리뷰·측정 특성과 청음 평가 점수가 일치하는지, 다르다면 어떻게 다른지

4~6줄 분량으로 구체적이고 전문적으로 작성. 평이한 설명 금지, 근거 기반 서술.

JSON만 응답:
{"analysis":"분석 텍스트"}`;

  try {
    const text = await createAnthropicTextCompletion(prompt, {
      maxTokens: 1024,
      logLabel: 'analyzeHeadfiSound',
    });
    const jsonRaw = extractJsonObjectFromText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { analysis?: unknown };
    const analysis = typeof parsed.analysis === 'string' ? parsed.analysis.trim() : '';
    if (!analysis) return null;
    return { analysis };
  } catch (error) {
    console.error('Anthropic 청음평가 음색 분석 실패:', error);
    return null;
  }
}

export async function recommendHeadfiAlbums(
  headfi: {
    brand: string;
    model: string;
    temp: string;
    recommended_genres: string;
    sound_scores_block?: string | null;
    ai_sound_analysis?: string | null;
    fr_interpretation_block?: string | null;
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

  const list = albums
    .map((a) => {
      const tags = Array.isArray(a.audio_tags) ? a.audio_tags.join(', ') : '';
      return `${a.id}|${a.artist || ''}|${a.album_name || ''}|${a.genre1 || ''}|${a.genre2 || ''}|${tags}`;
    })
    .join('\n');

  const soundScoresBlock = headfi.sound_scores_block?.trim()
    ? `\n${headfi.sound_scores_block.trim()}\n`
    : '';
  const soundAnalysis = headfi.ai_sound_analysis?.trim() || '';
  const analysisBlock = soundAnalysis ? `\n[청음 평가 AI 분석] ${soundAnalysis}\n` : '';
  const frBlock = headfi.fr_interpretation_block?.trim()
    ? `\n[FR 그래프 분석] ${headfi.fr_interpretation_block.trim()}\n`
    : '';
  const hasListeningContext = Boolean(soundScoresBlock || analysisBlock || frBlock);
  const recommendInstruction = hasListeningContext
    ? `위 청음 평가 점수·AI 분석·FR 그래프 분석(있는 항목)을 근거로 삼아, 이 기기로 들었을 때 가장 잘 어울리는 
앨범 3개를 선택하고 음향적 근거를 포함한 소개를 작성해줘.`
    : `이 기기로 들었을 때 가장 잘 어울리는 앨범 3개를 선택하고 음향적 근거를 포함한 소개를 작성해줘.`;

  const prompt = `너는 헤드파이 전문가이자 음악 큐레이터야.
[기기] ${headfi.brand} ${headfi.model} | 음색:${headfi.temp} | 추천장르:${headfi.recommended_genres}${soundScoresBlock}${analysisBlock}${frBlock}
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
    const text = await createAnthropicTextCompletion(prompt, {
      maxTokens: 768,
      logLabel: 'recommendHeadfiAlbums',
    });
    const jsonRaw = extractJsonObjectFromText(text);
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
  } catch (error) {
    console.error('Anthropic 추천 앨범 생성 실패:', error);
    return null;
  }
}
