import { NextRequest, NextResponse } from 'next/server';
import { analyzeHeadfiPosition } from '@/lib/gemini';
import {
  buildDacAmpPositionPromptInput,
  buildPositionPromptInput,
  clampPositionCoord,
  hasPositionCoordinates,
  isPositionAnalyzableCategory,
  POSITION_MAP_CATEGORIES,
} from '@/lib/headfiPosition';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

type HeadfiPositionRow = {
  id: number;
  brand: string | null;
  model: string | null;
  category: string | null;
  position_x: number | null;
  position_y: number | null;
  position_label: string | null;
  bass_quantity: number | null;
  bass_depth: number | null;
  bass_speed: number | null;
  dynamics_slam: number | null;
  midrange_body: number | null;
  tone_warmth: number | null;
  vocal_position: number | null;
  midrange_clarity: number | null;
  treble_brightness: number | null;
  treble_smoothness: number | null;
  treble_airiness: number | null;
  resolution: number | null;
  separation: number | null;
  soundstage: number | null;
  imaging: number | null;
  timbre: number | null;
  fr_interpretation: string | null;
  ai_sound_analysis: string | null;
  amp_type: string | null;
  chipset: string | null;
  output_impedance: number | null;
  vrms_bal: number | null;
  vrms_single: number | null;
  memo: string | null;
};

const POSITION_SELECT =
  'id, brand, model, category, position_x, position_y, position_label, bass_quantity, bass_depth, bass_speed, dynamics_slam, midrange_body, tone_warmth, vocal_position, midrange_clarity, treble_brightness, treble_smoothness, treble_airiness, resolution, separation, soundstage, imaging, timbre, fr_interpretation, ai_sound_analysis, amp_type, chipset, output_impedance, vrms_bal, vrms_single, memo';

function buildAnalyzeInput(row: HeadfiPositionRow) {
  if (isDacAmpDapCategory(row.category)) {
    return buildDacAmpPositionPromptInput({
      ...row,
      brand: row.brand ?? '',
      model: row.model ?? '',
      category: row.category ?? '',
    });
  }
  return buildPositionPromptInput({
    ...row,
    brand: row.brand ?? '',
    model: row.model ?? '',
    category: row.category ?? '',
  });
}

async function analyzeAndSavePosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: HeadfiPositionRow,
): Promise<{ id: number; x: number; y: number; label: string } | null> {
  const generated = await analyzeHeadfiPosition(buildAnalyzeInput(row));
  if (!generated) return null;

  const position_x = clampPositionCoord(generated.x);
  const position_y = clampPositionCoord(generated.y);
  const position_label = generated.label;

  const { error } = await supabase
    .from('headfi')
    .update({ position_x, position_y, position_label })
    .eq('id', row.id);

  if (error) return null;
  return { id: row.id, x: position_x, y: position_y, label: position_label };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const regenerateAll = body.regenerateAll === true;
    const clearPosition = body.clearPosition === true;
    const force = body.force === true;
    const headfiId =
      typeof body.headfiId === 'number'
        ? body.headfiId
        : parseInt(String(body.headfiId ?? ''), 10);

    const supabase = await createClient();

    if (regenerateAll) {
      const { data: rows, error: listError } = await supabase
        .from('headfi')
        .select(POSITION_SELECT)
        .in('category', [...POSITION_MAP_CATEGORIES])
        .not('position_x', 'is', null);

      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 });
      }

      const results: { id: number; x: number; y: number; label: string }[] = [];
      const failed: number[] = [];

      for (const row of (rows ?? []) as HeadfiPositionRow[]) {
        const saved = await analyzeAndSavePosition(supabase, row);
        if (saved) results.push(saved);
        else failed.push(row.id);
      }

      return NextResponse.json({ results, failed, total: (rows ?? []).length });
    }

    if (!Number.isFinite(headfiId)) {
      return NextResponse.json({ error: 'headfiId required' }, { status: 400 });
    }

    if (clearPosition) {
      const { data: row, error: fetchError } = await supabase
        .from('headfi')
        .select('id, category')
        .eq('id', headfiId)
        .single();

      if (fetchError || !row) {
        return NextResponse.json({ error: 'Headfi not found' }, { status: 404 });
      }

      if (!isPositionAnalyzableCategory(row.category)) {
        return NextResponse.json({ error: '포지션 분석 대상 카테고리가 아닙니다.' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('headfi')
        .update({ position_x: null, position_y: null, position_label: null })
        .eq('id', headfiId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ cleared: true, id: headfiId });
    }

    const { data: row, error: fetchError } = await supabase
      .from('headfi')
      .select(POSITION_SELECT)
      .eq('id', headfiId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Headfi not found' }, { status: 404 });
    }

    if (!isPositionAnalyzableCategory(row.category)) {
      return NextResponse.json({ error: '포지션 분석 대상 카테고리가 아닙니다.' }, { status: 400 });
    }

    if (!force && hasPositionCoordinates(row)) {
      return NextResponse.json({
        id: row.id,
        x: Number(row.position_x),
        y: Number(row.position_y),
        label: row.position_label || '',
        cached: true,
      });
    }

    const saved = await analyzeAndSavePosition(supabase, row as HeadfiPositionRow);
    if (!saved) {
      return NextResponse.json({ error: '포지션 분석에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
