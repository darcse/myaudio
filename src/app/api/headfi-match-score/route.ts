import { NextRequest, NextResponse } from 'next/server';
import { analyzeHeadfiMatchScore } from '@/lib/gemini';
import {
  candidateLine,
  compressCandidateRow,
  formatGenres,
  parseFrInterpretationSummary,
  pickCandidates,
  type HeadfiMatchScoreMode,
  isDacAmpDapCategory,
  isWiredHeadphoneEarphoneCategory,
} from '@/lib/headfiMatchScore';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

type CacheScoreRow = {
  target_gear_id: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
};

function deviceName(brand: string | null, model: string | null): string {
  return `${brand ?? ''} ${model ?? ''}`.trim() || '-';
}

function toCacheScore(row: {
  target_gear_id?: number;
  gear_id?: number;
  drive: number;
  synergy: number;
  genre: number;
  comment: string;
}): CacheScoreRow | null {
  const targetId = row.target_gear_id ?? row.gear_id;
  if (targetId == null || !Number.isFinite(targetId)) return null;
  return {
    target_gear_id: targetId,
    drive: row.drive,
    synergy: row.synergy,
    genre: row.genre,
    comment: row.comment,
  };
}

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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const force = body.force === true;
    const cacheOnly = body.cacheOnly === true;
    const mode: HeadfiMatchScoreMode =
      body.mode === 'headphone' ? 'headphone' : 'dac_amp';
    const baseGearId =
      typeof body.baseGearId === 'number'
        ? body.baseGearId
        : parseInt(String(body.baseGearId ?? ''), 10);

    if (!Number.isFinite(baseGearId)) {
      return NextResponse.json({ error: 'baseGearId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: baseRow, error: baseError } = await supabase
      .from('headfi')
      .select('*')
      .eq('id', baseGearId)
      .single();

    if (baseError || !baseRow) {
      return NextResponse.json({ error: '기준 기기를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (baseRow.status2 !== '보유중') {
      return NextResponse.json({ error: '보유중인 기기만 분석할 수 있습니다.' }, { status: 400 });
    }

    if (mode === 'dac_amp' && !isDacAmpDapCategory(baseRow.category)) {
      return NextResponse.json({ error: 'DAC/AMP/DAP 기준 모드입니다.' }, { status: 400 });
    }
    if (mode === 'headphone' && !isWiredHeadphoneEarphoneCategory(baseRow.category)) {
      return NextResponse.json({ error: '헤드폰/이어폰 기준 모드입니다.' }, { status: 400 });
    }

    const { data: allGear, error: listError } = await supabase
      .from('headfi')
      .select('*')
      .eq('status2', '보유중');

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const pool = (allGear ?? []).filter((item) => {
      if (item.id === baseGearId) return false;
      if (mode === 'dac_amp') {
        return isWiredHeadphoneEarphoneCategory(item.category);
      }
      return isDacAmpDapCategory(item.category);
    });

    if (pool.length === 0) {
      return NextResponse.json({ error: '분석할 후보 기기가 없습니다.' }, { status: 404 });
    }

    const gearById = new Map((allGear ?? []).map((g) => [g.id, g as HeadfiGearRow]));

    const { data: cachedRows, error: cacheError } = await supabase
      .from('headfi_match_cache')
      .select('target_gear_id, drive, synergy, genre, comment')
      .eq('base_gear_id', baseGearId);

    if (cacheError) {
      return NextResponse.json({ error: cacheError.message }, { status: 500 });
    }

    const cachedScores = (cachedRows ?? [])
      .map((row) => toCacheScore(row))
      .filter((row): row is CacheScoreRow => row != null)
      .filter((row) => {
        const gear = gearById.get(row.target_gear_id);
        if (!gear) return false;
        if (mode === 'dac_amp') return isWiredHeadphoneEarphoneCategory(gear.category);
        return isDacAmpDapCategory(gear.category);
      });

    if (!force && cachedScores.length > 0) {
      const results = buildRankedResults(cachedScores, gearById);
      if (results.length > 0) {
        return NextResponse.json({ results });
      }
    }

    if (cacheOnly) {
      return NextResponse.json({ results: [] });
    }

    if (force) {
      const { error: deleteError } = await supabase
        .from('headfi_match_cache')
        .delete()
        .eq('base_gear_id', baseGearId);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const candidates = pickCandidates(pool, 20);
    const candidateLines = candidates.map((item) => candidateLine(compressCandidateRow(item)));
    const candidateIds = candidates.map((c) => c.id);

    const genres =
      mode === 'headphone'
        ? formatGenres(
            Array.isArray(baseRow.recommended_genres) ? baseRow.recommended_genres : [],
            3,
          )
        : '-';
    const frSummary =
      mode === 'headphone'
        ? parseFrInterpretationSummary(baseRow.fr_interpretation)
        : '-';

    const scores = await analyzeHeadfiMatchScore(
      {
        name: deviceName(baseRow.brand, baseRow.model),
        temp: baseRow.temp?.trim() || '-',
        genres,
        fr_summary: frSummary,
      },
      candidateLines,
      candidateIds,
    );

    if (!scores || scores.length === 0) {
      return NextResponse.json({ error: '궁합 분석에 실패했습니다.' }, { status: 500 });
    }

    const insertRows = scores.map((row) => ({
      base_gear_id: baseGearId,
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
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
