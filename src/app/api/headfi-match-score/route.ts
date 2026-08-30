import { NextRequest, NextResponse } from 'next/server';
import { analyzeHeadfiMatchScore } from '@/lib/openaiHeadfi';
import {
  buildComboBaseForPrompt,
  buildHeadphoneListeningContextSections,
  candidateLine,
  compressCandidateRow,
  pickCandidates,
  isWiredHeadphoneEarphoneCategory,
} from '@/lib/headfiMatchScore';
import type { Headfi } from '@/app/headfi/types';
import type { HeadfiCombo } from '@/app/headfi/types';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

type CacheScoreRow = {
  target_gear_id: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

type HeadfiGearRow = {
  id: number;
  brand: string | null;
  model: string | null;
  category: string | null;
};

function buildRankedResults(
  scores: CacheScoreRow[],
  gearById: Map<number, HeadfiGearRow>,
): {
  gear_id: number;
  brand: string;
  model: string;
  category: string;
  drive: number;
  synergy: number;
  genre: number;
  total: number;
  comment: string;
}[] {
  const mapped = scores
    .map((score) => {
      const gear = gearById.get(score.target_gear_id);
      if (!gear) return null;
      const total = score.drive + score.synergy + score.genre;
      return {
        gear_id: gear.id,
        brand: gear.brand ?? '',
        model: gear.model ?? '',
        category: gear.category ?? '',
        drive: score.drive,
        synergy: score.synergy,
        genre: score.genre,
        total,
        comment: score.comment,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const bestByGear = new Map<number, (typeof mapped)[number]>();
  for (const row of mapped) {
    const prev = bestByGear.get(row.gear_id);
    if (!prev || row.total > prev.total) {
      bestByGear.set(row.gear_id, row);
    }
  }

  return Array.from(bestByGear.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

async function clearMatchCacheForGear(supabase: Awaited<ReturnType<typeof createClient>>, gearId: number) {
  const { data: combos, error: comboError } = await supabase
    .from('headfi_combos')
    .select('id')
    .or(`select1_id.eq.${gearId},select2_id.eq.${gearId}`);
  if (comboError) {
    return comboError;
  }
  const comboIds = (combos ?? []).map((row) => row.id as string);
  if (comboIds.length > 0) {
    const { error } = await supabase.from('headfi_match_cache').delete().in('combo_id', comboIds);
    if (error) return error;
  }
  const { error: targetError } = await supabase
    .from('headfi_match_cache')
    .delete()
    .eq('target_gear_id', gearId);
  return targetError;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const supabase = await createClient();

    const clearCacheForGearId =
      typeof body.clearCacheForGearId === 'number'
        ? body.clearCacheForGearId
        : parseInt(String(body.clearCacheForGearId ?? ''), 10);

    if (Number.isFinite(clearCacheForGearId)) {
      const deleteError = await clearMatchCacheForGear(supabase, clearCacheForGearId);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      return NextResponse.json({ cleared: true, gearId: clearCacheForGearId });
    }

    const comboId = typeof body.comboId === 'string' ? body.comboId.trim() : '';
    if (!comboId) {
      return NextResponse.json({ error: 'comboId required' }, { status: 400 });
    }

    const force = body.force === true;
    const cacheOnly = body.cacheOnly === true;
    const targetGearId =
      typeof body.targetGearId === 'number'
        ? body.targetGearId
        : parseInt(String(body.targetGearId ?? ''), 10);
    const singleTarget = Number.isFinite(targetGearId);

    const { data: comboRow, error: comboError } = await supabase
      .from('headfi_combos')
      .select('id, select1_id, select2_id, created_at')
      .eq('id', comboId)
      .single();

    if (comboError || !comboRow) {
      return NextResponse.json({ error: '조합을 찾을 수 없습니다.' }, { status: 404 });
    }

    const combo = comboRow as HeadfiCombo;
    if (combo.select1_id == null) {
      return NextResponse.json({ error: '조합에 기기 1이 없습니다.' }, { status: 400 });
    }

    const gearIds = [combo.select1_id, combo.select2_id].filter(
      (id): id is number => id != null && Number.isFinite(id),
    );

    const { data: comboGearRows, error: comboGearError } = await supabase
      .from('headfi')
      .select('*')
      .in('id', gearIds);

    if (comboGearError) {
      return NextResponse.json({ error: comboGearError.message }, { status: 500 });
    }

    const select1 = (comboGearRows ?? []).find((row) => row.id === combo.select1_id) as Headfi | undefined;
    const select2 =
      combo.select2_id != null
        ? ((comboGearRows ?? []).find((row) => row.id === combo.select2_id) as Headfi | undefined)
        : null;

    if (!select1 || select1.status2 !== '보유중') {
      return NextResponse.json({ error: '조합의 기기 1을 찾을 수 없거나 보유중이 아닙니다.' }, { status: 400 });
    }
    if (combo.select2_id != null && (!select2 || select2.status2 !== '보유중')) {
      return NextResponse.json({ error: '조합의 기기 2를 찾을 수 없거나 보유중이 아닙니다.' }, { status: 400 });
    }

    const { data: allGear, error: listError } = await supabase
      .from('headfi')
      .select('*')
      .eq('status2', '보유중');

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const gearById = new Map((allGear ?? []).map((g) => [g.id, g as HeadfiGearRow]));

    const pool = (allGear ?? []).filter((item) => {
      if (gearIds.includes(item.id)) return false;
      return isWiredHeadphoneEarphoneCategory(item.category);
    });

    if (pool.length === 0) {
      return NextResponse.json({ error: '분석할 후보 헤드폰/이어폰이 없습니다.' }, { status: 404 });
    }

    const { data: cachedRows, error: cacheError } = await supabase
      .from('headfi_match_cache')
      .select('target_gear_id, drive, synergy, genre, comment')
      .eq('combo_id', comboId);

    if (cacheError) {
      return NextResponse.json({ error: cacheError.message }, { status: 500 });
    }

    const cachedScores: CacheScoreRow[] = (cachedRows ?? [])
      .map((row) => ({
        target_gear_id: row.target_gear_id as number,
        drive: row.drive as number,
        synergy: row.synergy as number,
        genre: row.genre as number,
        comment: row.comment as string,
      }))
      .filter((row) => gearById.has(row.target_gear_id));

    if (!force && singleTarget) {
      const cached = cachedScores.find((s) => s.target_gear_id === targetGearId);
      if (cached) {
        const results = buildRankedResults([cached], gearById);
        if (results.length > 0) {
          return NextResponse.json({ results });
        }
      }
    }

    if (!force && !singleTarget && cachedScores.length > 0) {
      const results = buildRankedResults(cachedScores, gearById);
      if (results.length > 0) {
        return NextResponse.json({ results });
      }
    }

    if (cacheOnly) {
      return NextResponse.json({ results: [] });
    }

    if (force) {
      if (singleTarget) {
        const { error: deleteError } = await supabase
          .from('headfi_match_cache')
          .delete()
          .eq('combo_id', comboId)
          .eq('target_gear_id', targetGearId);
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      } else {
        const { error: deleteError } = await supabase
          .from('headfi_match_cache')
          .delete()
          .eq('combo_id', comboId);
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }
    }

    let candidates;
    if (singleTarget) {
      const targetRow = pool.find((item) => item.id === targetGearId);
      if (!targetRow) {
        return NextResponse.json({ error: '대상 헤드폰/이어폰을 찾을 수 없습니다.' }, { status: 404 });
      }
      candidates = [targetRow];
    } else {
      candidates = pickCandidates(pool, 20);
    }

    const candidateHeadfiRows = candidates as Headfi[];
    const candidateLines = candidateHeadfiRows.map((item) => candidateLine(compressCandidateRow(item)));
    const candidateIds = candidateHeadfiRows.map((c) => c.id);
    const candidateContext = buildHeadphoneListeningContextSections(candidateHeadfiRows);
    const comboBase = buildComboBaseForPrompt(select1, select2 ?? null);

    const scores = await analyzeHeadfiMatchScore(
      comboBase,
      candidateLines,
      candidateIds,
      candidateContext,
    );

    if (!scores || scores.length === 0) {
      return NextResponse.json(
        { error: '궁합 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 },
      );
    }

    const insertRows = scores.map((row) => ({
      combo_id: comboId,
      base_gear_id: combo.select1_id,
      target_gear_id: row.gear_id,
      drive: row.drive,
      synergy: row.synergy,
      genre: row.genre,
      comment: row.comment,
    }));

    const { error: insertError } = await supabase.from('headfi_match_cache').insert(insertRows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const freshScores: CacheScoreRow[] = scores.map((row) => ({
      target_gear_id: row.gear_id,
      drive: row.drive,
      synergy: row.synergy,
      genre: row.genre,
      comment: row.comment,
    }));

    const results = buildRankedResults(freshScores, gearById);
    if (results.length === 0) {
      return NextResponse.json({ error: '궁합 분석에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('headfi-match-score error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
