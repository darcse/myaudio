import { NextRequest, NextResponse } from 'next/server';
import { analyzeHeadfiSound } from '@/lib/anthropicHeadfi';
import { formatFrInterpretationForPrompt } from '@/lib/headfiAlbumMatch';
import { parseHeadfiReviewSources } from '@/lib/headfiReviewSources';
import { headfiHasSoundScores, pickHeadfiSoundScores } from '@/lib/headfiSoundScores';
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
        'id, brand, model, category, type1, type2, impedance, db1, db2, unit, temp, bright, volume, volume_type, bass_quantity, bass_depth, bass_control, midrange_body, treble_airiness, treble_smoothness, resolution, dynamic_range, separation, soundstage, imaging, musicality, listening_comfort, trait_warmth, trait_brightness, trait_vocal_position, trait_bass_decay, fr_interpretation, ai_review_summary, ai_review_sources',
      )
      .eq('id', headfiId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Headfi not found' }, { status: 404 });
    }

    if (row.category !== '헤드폰' && row.category !== '이어폰') {
      return NextResponse.json({ error: '헤드폰·이어폰만 분석할 수 있습니다.' }, { status: 400 });
    }

    const scores = {
      ...pickHeadfiSoundScores(row),
      type1: row.type1,
      type2: row.type2,
      impedance: row.impedance,
      db1: row.db1,
      db2: row.db2,
      unit: row.unit,
      temp: row.temp,
      bright: row.bright,
      volume: row.volume,
      volume_type: row.volume_type,
      fr_interpretation_block: formatFrInterpretationForPrompt(row.fr_interpretation),
      review_summary: typeof row.ai_review_summary === 'string' ? row.ai_review_summary : null,
      review_sources: parseHeadfiReviewSources(row.ai_review_sources),
    };

    if (!headfiHasSoundScores(scores)) {
      return NextResponse.json({ error: '청음 평가 데이터가 없습니다.' }, { status: 400 });
    }

    const generated = await analyzeHeadfiSound(scores);
    if (!generated.ok) {
      return NextResponse.json({ error: generated.error }, { status: 500 });
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
