import Anthropic from '@anthropic-ai/sdk';
import { extractJsonObjectFromText, withRetry } from '@/lib/aiRetry';
import type { TranslatedLine } from '@/app/lyrics/types';

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';

function requireAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
  }
  return key;
}

function resolveAnthropicModel(): string {
  return (
    process.env.ANTHROPIC_LYRICS_TRANSLATE_MODEL?.trim() ||
    process.env.ANTHROPIC_HEADFI_MODEL?.trim() ||
    DEFAULT_ANTHROPIC_MODEL
  );
}

function looksJapanese(text: string): boolean {
  const kana = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) ?? []).length;
  const kanji = (text.match(/[\u4E00-\u9FFF]/g) ?? []).length;
  return kana >= 2 || (kana >= 1 && kanji >= 1) || kanji >= 8;
}

const SYSTEM = `당신은 일본·영미 팝 가사를 한국어로 옮기는 전문 번역가다.
웹에서 가사를 검색·보완하지 않는다. 사용자가 준 원문만 사용한다.
일본어 줄의 phonetic은 반드시 한글 발음만 쓴다(히라가나·가타카나·로마자 금지).`;

export async function translateLyricsLines(lyricsText: string): Promise<{
  lines: TranslatedLine[];
  language: string | null;
} | null> {
  const raw = lyricsText.replace(/\r\n/g, '\n').trim();
  if (!raw) return null;

  const sourceLines = raw
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => !(l.trim() === '' && (i === 0 || i === arr.length - 1)));

  if (sourceLines.length === 0) return null;

  const numbered = sourceLines.map((line, i) => `${i + 1}|${line}`).join('\n');
  const likelyJa = looksJapanese(raw);

  const prompt = `아래 가사를 줄 단위로 한국어로 옮겨라. 웹 검색·가사 조회 금지. 주어진 원문만 사용.

번역(translation) 원칙:
- 직역하지 마라. 원문의 의미·감정·어조를 살리되, 한국어 화자가 자연스럽게 읽히는 의역으로 써라.
- 조사·어미·관용 표현은 한국어 가사처럼 자연스럽게 맞추고, "~어 가는"처럼 어색한 직역 투를 피하라.
- 줄 단위로 대응하되, 한 줄 안에서는 의미가 통하게 재구성해도 된다. 줄을 합치거나 나누지 마라.

발음(phonetic) 원칙 (일본어만):
- 한글만. 한국어 화자가 소리나는 대로 (외래어 표기법·관용 포함).
- 예: "さよなら" → "사요나라" / "絶対運命ごっこ" → "젯타이 운메이 곳코"
- 금지: 히라가나·가타카나·로마자. 한자→가나 풀어쓰기만 한 것은 발음이 아니다.

기타:
- 입력 줄 순서·빈 줄 유지.
- original은 입력 원문 그대로 복사. 수정·보완 금지.
- 일본어가 아니면 phonetic 생략 또는 "".
- 빈 줄: original="", translation="", phonetic 생략.
- language: 원문 주 언어 코드 (ja/en/ko/other).

[의역 예시 — translation만 참고]
원문: 裏切られても そばで笑ってく 嘘の日々
나쁜 직역: 배신당해도 곁에서 웃어 가는 거짓된 나날
좋은 의역: 배신당해도 곁에서 웃어주는 거짓말의 나날

입력 (번호|원문):
${numbered}

일본어 가능성 힌트: ${likelyJa ? '높음' : '낮음 또는 불명'}

반드시 JSON만 출력:
{
  "language": "ja",
  "lines": [
    { "original": "원문", "phonetic": "한글발음만", "translation": "의역" }
  ]
}`;

  try {
    const client = new Anthropic({ apiKey: requireAnthropicApiKey() });
    const message = await withRetry(() =>
      client.messages.create({
        model: resolveAnthropicModel(),
        max_tokens: 8192,
        thinking: { type: 'disabled' },
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    );
    const textBlock = message.content.find((block) => block.type === 'text');
    const text = textBlock?.type === 'text' ? textBlock.text.trim() : '';
    const jsonRaw = extractJsonObjectFromText(text);
    if (!jsonRaw) return null;
    const parsed = JSON.parse(jsonRaw) as { language?: unknown; lines?: unknown };
    if (!Array.isArray(parsed.lines)) return null;

    const lines: TranslatedLine[] = [];
    for (let i = 0; i < sourceLines.length; i++) {
      const src = sourceLines[i];
      const item = parsed.lines[i];
      const row =
        item && typeof item === 'object'
          ? (item as { original?: unknown; phonetic?: unknown; translation?: unknown })
          : null;
      const original =
        typeof row?.original === 'string' && row.original.length > 0 ? row.original : src;
      const translation =
        typeof row?.translation === 'string' ? row.translation.trim() : src.trim() ? '' : '';
      const phonetic =
        typeof row?.phonetic === 'string' && row.phonetic.trim() ? row.phonetic.trim() : undefined;
      const line: TranslatedLine = { original, translation };
      if (phonetic) line.phonetic = phonetic;
      lines.push(line);
    }

    const language = typeof parsed.language === 'string' ? parsed.language.trim() : null;
    return { lines, language: language || (likelyJa ? 'ja' : null) };
  } catch {
    return null;
  }
}
