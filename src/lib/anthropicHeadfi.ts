import Anthropic from '@anthropic-ai/sdk';
import type { HeadfiFrInterpretation } from '@/app/headfi/types';
import { resolveAnthropicHeadfiModel, resolveAnthropicThinkingOff } from '@/lib/aiModels';
import { extractJsonObjectFromText, withRetry } from '@/lib/aiRetry';
import {
  buildHeadfiSoundScoresPromptBlock,
  formatTraitAxisForPrompt,
  type HeadfiSoundScores,
} from '@/lib/headfiSoundScores';
import { stripHeadphoneIdSuffixes } from '@/lib/utils';

type AnthropicImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

type HeadfiSoundScoresInput = HeadfiSoundScores & {
  type1?: string | null;
  type2?: string | null;
  impedance?: number | null;
  db1?: number | null;
  db2?: number | null;
  unit?: string | null;
  volume?: string | null;
  volume_type?: string | null;
  fr_interpretation_block?: string | null;
  review_summary?: string | null;
  review_sources?: { title: string; url: string }[];
};

function requireAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
  }
  return key;
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

function trimFact(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatOptionalNumber(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return String(value);
}

function buildConfirmedFactsBlock(headfi: HeadfiSoundScoresInput): string {
  const lines: string[] = [
    `브랜드: ${headfi.brand?.trim() || '-'}`,
    `모델명: ${headfi.model?.trim() || '-'}`,
    `카테고리: ${headfi.category?.trim() || '-'}`,
  ];
  const type1 = trimFact(headfi.type1);
  if (type1) lines.push(`타입1(형태): ${type1}`);
  const type2 = trimFact(headfi.type2);
  if (type2) lines.push(`타입2: ${type2}`);
  const impedance = formatOptionalNumber(headfi.impedance);
  if (impedance) lines.push(`임피던스: ${impedance} Ω`);
  const db1 = formatOptionalNumber(headfi.db1);
  if (db1) lines.push(`감도(dB/SPL V): ${db1}`);
  const db2 = formatOptionalNumber(headfi.db2);
  if (db2) lines.push(`감도(dB/mW): ${db2}`);
  const unit = trimFact(headfi.unit);
  if (unit) lines.push(`유닛: ${unit}`);
  const volume = trimFact(headfi.volume);
  const volumeType = trimFact(headfi.volume_type);
  if (volume || volumeType) {
    lines.push(`구동력: ${[volume, volumeType].filter(Boolean).join(' / ') || '-'}`);
  }
  lines.push(
    `성향(따뜻함/밝기): ${formatTraitAxisForPrompt(headfi.trait_warmth)} / ${formatTraitAxisForPrompt(headfi.trait_brightness)} (NULL=모름, -2~+2)`,
  );
  return lines.join('\n');
}

type AnthropicTextCompletionOptions = {
  maxTokens?: number;
  logLabel?: string;
};

async function createAnthropicTextCompletion(
  prompt: string,
  options: AnthropicTextCompletionOptions = {},
): Promise<{ text: string; stopReason: string | null }> {
  const maxTokens = options.maxTokens ?? 1024;
  const start = Date.now();
  const client = new Anthropic({ apiKey: requireAnthropicApiKey() });
  const model = resolveAnthropicHeadfiModel();
  const message = await withRetry(() =>
    client.messages.create({
      model,
      max_tokens: maxTokens,
      thinking: resolveAnthropicThinkingOff(model) as { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    }),
  );
  const stopReason = message.stop_reason ?? null;
  if (options.logLabel) {
    console.info(`[anthropicHeadfi] ${options.logLabel}`, {
      elapsedMs: Date.now() - start,
      usage: message.usage,
      stop_reason: stopReason,
    });
    if (stopReason === 'max_tokens') {
      console.error(`[anthropicHeadfi] ${options.logLabel} 출력 길이 초과`, {
        maxTokens,
        stop_reason: stopReason,
      });
    }
  }
  const textBlock = message.content.find((block) => block.type === 'text');
  return {
    text: textBlock?.type === 'text' ? textBlock.text.trim() : '',
    stopReason,
  };
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
    const model = resolveAnthropicHeadfiModel();
    const message = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 1024,
        thinking: resolveAnthropicThinkingOff(model) as { type: 'disabled' },
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

export type AnalyzeHeadfiSoundResult =
  | { ok: true; analysis: string }
  | { ok: false; error: string };

export async function analyzeHeadfiSound(
  headfi: HeadfiSoundScoresInput,
): Promise<AnalyzeHeadfiSoundResult> {
  const confirmedFacts = buildConfirmedFactsBlock(headfi);
  const frBlock = headfi.fr_interpretation_block?.trim()
    ? `\n[FR 그래프 분석]\n${headfi.fr_interpretation_block.trim()}\n`
    : '';
  const reviewSummary = headfi.review_summary?.trim() ?? '';
  const hasReview = Boolean(reviewSummary) && reviewSummary !== '확인 불가';
  const sourceLines = (headfi.review_sources ?? [])
    .filter((source) => source.url.trim())
    .map((source) => `- ${source.title.trim() || source.url}: ${source.url}`)
    .join('\n');
  const reviewBlock = hasReview
    ? `\n[외부 리뷰 요약]\n${reviewSummary}\n${sourceLines ? `\n[출처]\n${sourceLines}\n` : ''}`
    : '';
  const reviewRule = hasReview
    ? '- 외부 리뷰와 JW 청음 평가가 다르면 차이로 명시한다. 확정 사실과 리뷰가 충돌하면 확정 사실을 우선한다.'
    : '- 외부 리뷰 없음. 점수로만 서술한다. 알려진 리뷰·측정과 대조하지 마라.';
  const frRule = frBlock
    ? '- FR 그래프 분석을 대역 서술의 근거로 쓴다. 확정 사실과 충돌하면 확정 사실을 우선한다.'
    : '- FR 없음. FR 특성(저/중/고역 곡선)을 추정하지 마라.';
  const compareLine = hasReview
    ? '- JW 청음 평가와 외부 리뷰가 일치하는지, 다르다면 무엇이 다른지'
    : '- 외부 리뷰 없이 청음 평가 점수 패턴만으로 서술';

  const prompt = `너는 헤드파이 전문 리뷰어야. 아래 [확정 사실]과 청음 평가 점수를 근거로 이 기기의 음색 성향을 상세하게 분석해줘.

[확정 사실 — 사용자가 DB에 등록한 값. 절대 우선]
${confirmedFacts}

규칙:
- 위 확정 사실이 당신의 사전 지식·유사 모델 기억과 충돌하면 확정 사실만 따른다.
- 신모델이거나 정확히 모르는 기기일 수 있다. 확정 사실에 없는 형태(밀폐형/오픈형 등)·스펙·브랜드 일반화를 추측해 쓰지 마라.
- 타입1이 "밀폐형"이면 절대 "오픈형"이라고 쓰지 말고, "오픈형"이면 절대 "밀폐형"이라고 쓰지 마라.
- 확정 사실에 없는 세부 스펙은 언급하지 말고, 청음 평가 점수 패턴 중심으로 서술하라.
- 성능(1~10)은 품질 평가이고, 성향(-2~+2)은 소리의 성격이다. 성향을 좋고 나쁨으로 읽지 마라.
- '-'는 미입력이므로 그 축을 추정하지 마라. 성향 0은 중립 입력이다.
${reviewRule}
${frRule}

${buildHeadfiSoundScoresPromptBlock(headfi) ?? '[청음 평가] 없음'}
${frBlock}${reviewBlock}
위 확정 사실과 점수 패턴을 바탕으로 다음을 포함한 분석을 작성해줘:
- 전반적인 음색 성향 (예: 따뜻하고 부드러운, 분석적이고 정교한 등)
- 저역/중역/고역 밸런스 특징과 그 근거
- 이 기기가 가장 빛을 발하는 음악적 상황 (장르, 보컬/악기 중심 등)
${compareLine}

구체적이고 전문적으로 작성. 평이한 설명 금지, 근거 기반 서술.
분량: 한국어 약 700~900자 이내, 문단 4개 이내. 불필요한 반복·사족 금지.

JSON만 응답:
{"analysis":"분석 텍스트"}`;

  try {
    const { text, stopReason } = await createAnthropicTextCompletion(prompt, {
      maxTokens: 2048,
      logLabel: 'analyzeHeadfiSound',
    });
    if (stopReason === 'max_tokens') {
      return { ok: false, error: '출력 길이 초과: AI 분석 응답이 잘렸습니다.' };
    }
    const jsonRaw = extractJsonObjectFromText(text);
    if (!jsonRaw) {
      console.error('[anthropicHeadfi] analyzeHeadfiSound JSON 파싱 실패', {
        stop_reason: stopReason,
        preview: text.slice(0, 200),
      });
      return { ok: false, error: '응답 JSON 파싱 실패' };
    }
    let parsed: { analysis?: unknown };
    try {
      parsed = JSON.parse(jsonRaw) as { analysis?: unknown };
    } catch {
      console.error('[anthropicHeadfi] analyzeHeadfiSound JSON 파싱 실패', {
        stop_reason: stopReason,
      });
      return { ok: false, error: '응답 JSON 파싱 실패' };
    }
    const analysis = typeof parsed.analysis === 'string' ? parsed.analysis.trim() : '';
    if (!analysis) {
      return { ok: false, error: '응답 JSON 파싱 실패' };
    }
    return { ok: true, analysis };
  } catch (error) {
    console.error('Anthropic 청음평가 음색 분석 실패:', error);
    return { ok: false, error: 'AI 분석에 실패했습니다.' };
  }
}

export async function recommendHeadfiAlbums(
  headfi: {
    brand: string;
    model: string;
    trait_warmth?: number | null;
    trait_brightness?: number | null;
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
    ? `위 청음 평가의 성능(1~10 품질)과 성향(-2~+2 성격, 우열 아님)·AI 분석·FR 그래프 분석(있는 항목)을 근거로 삼아, 이 기기로 들었을 때 가장 잘 어울리는 
앨범 3개를 선택하고 음향적 근거를 포함한 소개를 작성해줘. '-'는 추정하지 마라.`
    : `이 기기로 들었을 때 가장 잘 어울리는 앨범 3개를 선택하고 음향적 근거를 포함한 소개를 작성해줘.`;

  const prompt = `너는 헤드파이 전문가이자 음악 큐레이터야.
[기기] ${headfi.brand} ${headfi.model} | 따뜻함:${formatTraitAxisForPrompt(headfi.trait_warmth)} 밝기:${formatTraitAxisForPrompt(headfi.trait_brightness)} | 추천장르:${headfi.recommended_genres}${soundScoresBlock}${analysisBlock}${frBlock}
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
    const { text } = await createAnthropicTextCompletion(prompt, {
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
