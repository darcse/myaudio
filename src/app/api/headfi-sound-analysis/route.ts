import { NextRequest, NextResponse } from 'next/server';
import { analyzeHeadfiSound, headfiHasSoundScores } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const headfiId =
      typeof body.headfiId === 'number'
        ? body.headfiId
        : parseInt(String(body.headfiId ?? ''), 10);

    if (!Number.isFinite(headfiId)) {
      return NextResponse.json({ error: 'headfiId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: row, error: fetchError } = await supabase
      .from('headfi')
      .select(
        'id, brand, model, category, bass_quantity, bass_depth, bass_speed, dynamics_slam, midrange_body, tone_warmth, vocal_position, midrange_clarity, treble_brightness, treble_smoothness, treble_airiness, resolution, separation, soundstage, imaging, timbre',
      )
      .eq('id', headfiId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Headfi not found' }, { status: 404 });
    }

    const scores = {
      brand: row.brand || '',
      model: row.model || '',
      category: row.category || '',
      bass_quantity: row.bass_quantity,
      bass_depth: row.bass_depth,
      bass_speed: row.bass_speed,
      dynamics_slam: row.dynamics_slam,
      midrange_body: row.midrange_body,
      tone_warmth: row.tone_warmth,
      vocal_position: row.vocal_position,
      midrange_clarity: row.midrange_clarity,
      treble_brightness: row.treble_brightness,
      treble_smoothness: row.treble_smoothness,
      treble_airiness: row.treble_airiness,
      resolution: row.resolution,
      separation: row.separation,
      soundstage: row.soundstage,
      imaging: row.imaging,
      timbre: row.timbre,
    };

    if (!headfiHasSoundScores(scores)) {
      return NextResponse.json({ error: '청음 평가 데이터가 없습니다.' }, { status: 400 });
    }

    const generated = await analyzeHeadfiSound(scores);
    if (!generated) {
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from('headfi')
      .update({ ai_sound_analysis: generated.analysis })
      .eq('id', headfiId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ analysis: generated.analysis });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
