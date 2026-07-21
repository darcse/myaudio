import OpenAI from 'openai';
import { extractJsonArrayFromText, withRetry } from '@/lib/aiRetry';

export type HeadfiMatchScoreResult = {
  gear_id: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

const DEFAULT_MATCH_SCORE_MODEL = 'gpt-5.4-mini';

function requireOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  return key;
}

export async function analyzeHeadfiMatchScore(
  base: {
    name: string;
    temp: string;
    genres: string;
    drive_grade?: string;
    rk?: string;
    vrms32?: string;
    vrms300?: string;
    chipset?: string;
    sound_scores_block?: string | null;
    ai_sound_analysis?: string | null;
    fr_interpretation_block?: string | null;
  },
  candidateLines: string[],
  validGearIds: number[],
  candidateContext?: string | null,
): Promise<HeadfiMatchScoreResult[] | null> {
  const list = candidateLines.join('\n');
  const dacBaseSpecs =
    base.drive_grade != null
      ? ` | 구동방식/등급:${base.drive_grade} | Chipset:${base.chipset ?? '-'} | 정합임피던스(Rk):${base.rk ?? '-'} | Vrms@32Ω:${base.vrms32 ?? '-'} | Vrms@300Ω:${base.vrms300 ?? '-'}`
      : '';
  const baseListeningBlocks = [
    base.sound_scores_block?.trim() ? `\n${base.sound_scores_block.trim()}\n` : '',
    base.ai_sound_analysis?.trim() ? `\n[청음 평가 AI 분석] ${base.ai_sound_analysis.trim()}\n` : '',
    base.fr_interpretation_block?.trim()
      ? `\n[FR 그래프 분석] ${base.fr_interpretation_block.trim()}\n`
      : '',
  ].join('');
  const candidateSection = candidateContext?.trim() ? `\n${candidateContext.trim()}\n` : '';
  const hasHpListeningContext = Boolean(baseListeningBlocks || candidateSection);
  const prompt = `너는 헤드파이 전문 리뷰어이자 오디오 엔지니어야.
실제 측정 데이터, 전문 리뷰, 유저 평가를 참고해서 아래 기기 조합의 궁합을 분석해줘.

[기준 기기] ${base.name} | 음색:${base.temp} | 추천장르:${base.genres}${dacBaseSpecs}${baseListeningBlocks}${candidateSection}
[후보 기기 목록]
id|기기명|음색|정합임피던스(Rk) 또는 헤드폰Ω|감도|Vrms@32Ω|Vrms@300Ω|저역|중역|고역
${list}

각 후보 기기와의 조합을 아래 기준으로 100점 만점 평가:
- drive: 해당 DAC/AMP/DAP가 헤드폰을 충분히 구동할 수 있는지 (정합 임피던스 Rk, Vrms@32Ω·Vrms@300Ω, 헤드폰 임피던스·감도 매칭)
- synergy: 두 기기의 음색 성향이 서로 보완하거나 시너지를 내는지 (청음 평가 점수·AI 분석·FR 분석이 있으면 반드시 참고)
- genre: 조합이 특정 장르에서 강점을 보이는지

평가 시 주의사항:
- 정합 임피던스(Rk), Vrms@32Ω, Vrms@300Ω, 헤드폰 임피던스/감도 수치를 반드시 고려해서 drive 점수 산정 (값이 '-'이면 해당 항목 없이 판단)
- 헤드폰/이어폰의 청음 평가 점수·AI 분석·FR 그래프 분석${hasHpListeningContext ? '을 위 컨텍스트에서' : '이 있으면'} synergy·genre 판단에 반영
- 음색이 겹치면 synergy 낮게, 상호 보완이면 높게
- 학습된 리뷰·측정 지식을 바탕으로 판단

각 기기에 대해 구체적 근거와 함께 2~3줄 총평 작성.

JSON만 응답:
[{"gear_id":1,"drive":85,"synergy":90,"genre":80,"comment":"구체적 근거 포함 2~3줄 총평"}]`;

  try {
    const client = new OpenAI({ apiKey: requireOpenAIApiKey() });
    const model = process.env.OPENAI_MATCH_SCORE_MODEL?.trim() || DEFAULT_MATCH_SCORE_MODEL;
    const completion = await withRetry(() =>
      client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      }),
    );
    const text = completion.choices[0]?.message?.content?.trim() ?? '';
    const jsonRaw = extractJsonArrayFromText(text);
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
  } catch (error) {
    console.error('OpenAI 매칭 궁합 점수 분석 실패:', error);
    return null;
  }
}
