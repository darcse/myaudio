import { NextRequest, NextResponse } from 'next/server';
import { analyzeHeadfiPosition } from '@/lib/gemini';
import {
  buildDacAmpPositionPromptInput,
  buildWiredPositionLabelPromptInput,
  clampPositionCoord,
  computeWiredPositionCoords,
  fallbackWiredPositionLabel,
  hasPositionCoordinates,
  isPositionAnalyzableCategory,
  POSITION_MAP_CATEGORIES,
} from '@/lib/headfiPosition';
import { isDacAmpDapCategory } from '@/lib/headfiMatchScore';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { Headfi } from '@/app/headfi/types';

type HeadfiPositionRow = Headfi & {
  brand: string | null;
  model: string | null;
  category: string | null;
};

const POSITION_SELECT =
  'id, brand, model, category, position_x, position_y, position_label, bass_quantity, bass_depth, bass_control, midrange_body, treble_airiness, treble_smoothness, resolution, dynamic_range, separation, soundstage, imaging, musicality, listening_comfort, trait_warmth, trait_brightness, trait_vocal_position, trait_bass_decay, fr_interpretation, ai_sound_analysis, amp_type, chipset, output_impedance, vrms_bal, vrms_single, memo';

async function analyzeAndSavePosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: HeadfiPositionRow,
): Promise<{ id: number; x: number; y: number; label: string } | null> {
  const brand = row.brand ?? '';
  const model = row.model ?? '';
  const category = row.category ?? '';

  if (isDacAmpDapCategory(row.category)) {
    const generated = await analyzeHeadfiPosition(
      buildDacAmpPositionPromptInput({
        ...row,
        brand,
        model,
        category,
      }),
    );
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

  const coords = computeWiredPositionCoords(row);
  if (!coords) return null;

  const generated = await analyzeHeadfiPosition(
    buildWiredPositionLabelPromptInput({
      ...row,
      brand,
      model,
      category,
      x: coords.x,
      y: coords.y,
    }),
  );
  const position_label = generated?.label?.trim() || fallbackWiredPositionLabel(coords.x, coords.y);
  const { error } = await supabase
    .from('headfi')
    .update({
      position_x: coords.x,
      position_y: coords.y,
      position_label,
    })
    .eq('id', row.id);
  if (error) return null;
  return { id: row.id, x: coords.x, y: coords.y, label: position_label };
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
      const skipped: number[] = [];

      for (const row of (rows ?? []) as HeadfiPositionRow[]) {
        if (!computeWiredPositionCoords(row)) {
          skipped.push(row.id);
          continue;
        }
        const saved = await analyzeAndSavePosition(supabase, row);
        if (saved) results.push(saved);
        else failed.push(row.id);
      }

      return NextResponse.json({ results, failed, skipped, total: (rows ?? []).length });
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

    const typedRow = row as HeadfiPositionRow;

    if (!force && hasPositionCoordinates(typedRow)) {
      return NextResponse.json({
        id: typedRow.id,
        x: Number(typedRow.position_x),
        y: Number(typedRow.position_y),
        label: typedRow.position_label || '',
        cached: true,
      });
    }

    if (!isDacAmpDapCategory(typedRow.category) && !computeWiredPositionCoords(typedRow)) {
      if (hasPositionCoordinates(typedRow)) {
        return NextResponse.json({
          id: typedRow.id,
          x: Number(typedRow.position_x),
          y: Number(typedRow.position_y),
          label: typedRow.position_label || '',
          preserved: true,
        });
      }
      return NextResponse.json(
        { error: '좌표 계산에 필요한 청음 평가(성향 온기·밝기, 해상도·분리도·정위감, 음악적 매력)가 없습니다.' },
        { status: 400 },
      );
    }

    const saved = await analyzeAndSavePosition(supabase, typedRow);
    if (!saved) {
      return NextResponse.json({ error: '포지션 분석에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
