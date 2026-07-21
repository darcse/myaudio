import OpenAI from 'openai';
import { extractJsonObjectFromText, withRetry } from '@/lib/aiRetry';

const DEFAULT_MODEL = 'gpt-5.4-mini';
const INSTRUCTIONS =
  '당신은 한국어 음악 매거진 에디터입니다. 아티스트 소개글을 존대어(~습니다체)로 자연스럽게 작성합니다. 팩트체크 보고서·뉴스 기사 투가 아닌, 매거진 프로필 소개글 문체를 사용합니다. 연도·월·주년수 등 숫자는 반드시 아라비아 숫자(0-9)로 표기합니다. 모든 소개 문장은 한국어(한글)로만 작성합니다.';

type ArtistBioInput = {
  artist_name: string;
  country: string;
  artist_type: string;
  genre: string;
};

function requireOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  return key;
}

function looksLikeJapaneseBio(text: string): boolean {
  const hangul = (text.match(/[\uAC00-\uD7AF]/g) ?? []).length;
  const kana = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) ?? []).length;
  const scriptChars = (text.match(/[\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) ?? []).length;
  if (scriptChars === 0) return false;
  if (kana >= 3) return hangul < kana * 2;
  return hangul / scriptChars < 0.35;
}

function buildArtistBioPrompt(artist: ArtistBioInput, strictKorean: boolean): string {
  const strictNote = strictKorean
    ? `\n\n이전 응답이 일본어였습니다. bio는 한글 문장으로만 다시 작성하세요. 히라가나·카타카나·영어 본문 문장은 절대 쓰지 마세요.`
    : '';

  return `웹 검색으로 "${artist.artist_name}" 아티스트를 조사해.
검색 결과가 일본어·영어여도 bio 본문은 반드시 한국어로 번역·서술해.
아티스트명이 일본어·로마자여도 소개 문장은 한국어로만 작성하고, 일본어·영어 문장을 그대로 쓰지 마.
검색으로 확인되지 않은 구체적인 곡명·앨범명은 언급하지 말고, 지어내지 마.

문체:
- 반드시 존대어(~습니다, ~였습니다, ~입니다 등 격식체)로 작성하고, "~한다", "~이다", "~하고 있다" 같은 반말·평서체는 사용하지 마.
- 음악 매거진 아티스트 프로필처럼 자연스럽고 읽기 쉬운 서술체로 작성해.
- "~확인된다", "~확인되며", "~으로 알려진다", "~가 파악된다" 같은 검증·보도 문체는 쓰지 마.
- 대신 "~활동하고 있습니다", "~선보였습니다", "~펼치고 있습니다", "~이어가고 있습니다" 등 일반적인 소개글 서술형을 사용해.
- 확인되지 않은 정보에 대한 언급, 사과, 면책, "자료가 부족하다", "단정하지 않는다" 같은 메타 발언은 절대 넣지 마. 확인된 사실만으로 자연스럽게 마무리해.
- 연도, 월, 일, 주년수, 멤버 수, 차수 등 모든 숫자는 반드시 아라비아 숫자로 표기해. "이천이십일년 이월", "오주년"처럼 한글로 풀어쓰지 마. 예: "2021년 2월", "5주년", "3번째 앨범".

[작성 예시 — 문체·톤·길이 참고]
{"bio": "2005년 결성된 ℃-ute는 헬로! 프로젝트 소속의 일본 아이돌 그룹으로, 뛰어난 퍼포먼스 실력과 가창력을 바탕으로 '아이돌이 동경하는 아이돌'이라 불렸습니다. 펑키하고 세련된 댄스 팝을 주력 사운드로 선보이며 'Dance de Bakoon!' 등 수많은 히트곡을 남겼습니다. 2017년 해산까지 약 12년간 왕성하게 활동하며 일본 아이돌 음악계에 뚜렷한 음악적 족적과 높은 예술적 평가를 남겼습니다."}

[아티스트] ${artist.artist_name} | 국적: ${artist.country || '-'} | 타입: ${artist.artist_type || '-'} | 주요 장르: ${artist.genre || '-'}

다음을 참고해 3~4줄 소개를 작성해 (해당 정보가 확인된 경우에만 포함):
- 활동 시작 시기와 배경
- 음악적 특징과 대표 사운드
- 대표작 또는 주요 활동
- 국내외 평가나 영향력

bio 필드는 한글(한국어) 문장으로만 구성해. 히라가나·카타카나·영어 본문 문장 금지. 아티스트명·앨범명 등 고유명사만 원어 표기 가능.

반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.
{"bio": "소개 내용"}${strictNote}`;
}

function buildFallbackBio(artist: ArtistBioInput): string {
  const typeLabel = artist.artist_type || '아티스트';
  if (artist.country && artist.genre) {
    return `${artist.country} 출신 ${artist.genre} ${typeLabel} ${artist.artist_name}으로, 음악 활동을 이어가고 있습니다.`;
  }
  if (artist.country) {
    return `${artist.country}를 기반으로 활동하는 ${typeLabel} ${artist.artist_name}입니다.`;
  }
  if (artist.genre) {
    return `${artist.genre} 장르의 ${typeLabel} ${artist.artist_name}으로, 음악 활동을 펼치고 있습니다.`;
  }
  return `${typeLabel} ${artist.artist_name}으로, 음악 활동을 이어가고 있습니다.`;
}

function extractBioFromResponseText(text: string): string | null {
  const jsonRaw = extractJsonObjectFromText(text);
  if (!jsonRaw) return null;
  try {
    const parsed = JSON.parse(jsonRaw) as { bio?: unknown };
    let bio = typeof parsed.bio === 'string' ? parsed.bio.trim() : '';
    bio = bio.replace(/\\n/g, '\n');
    return bio || null;
  } catch {
    return null;
  }
}

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (response.output_text?.trim()) {
    return response.output_text.trim();
  }
  const texts: string[] = [];
  for (const item of response.output) {
    if (item.type !== 'message') continue;
    for (const content of item.content) {
      if (content.type === 'output_text' && content.text) {
        texts.push(content.text);
      }
    }
  }
  return texts.join('').trim();
}

async function requestArtistBio(artist: ArtistBioInput, strictKorean: boolean): Promise<string | null> {
  const client = new OpenAI({ apiKey: requireOpenAIApiKey() });
  const model = process.env.OPENAI_ARTIST_BIO_MODEL?.trim() || DEFAULT_MODEL;
  const response = await withRetry(() =>
    client.responses.create({
      model,
      instructions: INSTRUCTIONS,
      input: buildArtistBioPrompt(artist, strictKorean),
      tools: [{ type: 'web_search' }],
      max_output_tokens: 4096,
    }),
  );

  if (response.status === 'failed') {
    throw new Error('OpenAI artist bio response failed');
  }

  const text = extractOutputText(response);
  if (!text) {
    return response.status === 'incomplete' ? buildFallbackBio(artist) : null;
  }

  const bio = extractBioFromResponseText(text);
  if (bio) return bio;

  return buildFallbackBio(artist);
}

export async function generateArtistBio(artist: ArtistBioInput): Promise<{ bio: string } | null> {
  try {
    let bio = await requestArtistBio(artist, false);
    if (!bio) return { bio: buildFallbackBio(artist) };
    if (looksLikeJapaneseBio(bio)) {
      const retried = await requestArtistBio(artist, true);
      if (retried && !looksLikeJapaneseBio(retried)) {
        bio = retried;
      }
    }
    return { bio };
  } catch {
    return null;
  }
}
