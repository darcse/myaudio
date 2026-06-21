import { NextRequest, NextResponse } from 'next/server';
import { recommendHeadfiAlbums } from '@/lib/gemini';
import { parseFrInterpretationSummary, selectAlbumsForHeadfiMatch } from '@/lib/headfiAlbumMatch';
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

    const [headfiRes, albumsRes] = await Promise.all([
      supabase
        .from('headfi')
        .select('id, brand, model, category, temp, recommended_genres, fr_interpretation, ai_sound_analysis')
        .eq('id', headfiId)
        .single(),
      supabase.from('album').select('id, artist, genre1, genre2, audio_tags'),
    ]);

    if (headfiRes.error || !headfiRes.data) {
      return NextResponse.json({ error: 'Headfi not found' }, { status: 404 });
    }
    if (albumsRes.error) {
      return NextResponse.json({ error: albumsRes.error.message }, { status: 500 });
    }

    const albums = albumsRes.data ?? [];
    if (albums.length === 0) {
      return NextResponse.json({ error: '보유 앨범이 없습니다.' }, { status: 404 });
    }

    const row = headfiRes.data;
    const aiSoundAnalysis =
      row.category === '헤드폰' && typeof row.ai_sound_analysis === 'string'
        ? row.ai_sound_analysis.trim() || null
        : null;
    const candidates = selectAlbumsForHeadfiMatch(
      albums,
      Array.isArray(row.recommended_genres) ? row.recommended_genres : [],
    );

    const generated = await recommendHeadfiAlbums(
      {
        brand: row.brand || '',
        model: row.model || '',
        temp: row.temp?.trim() || '-',
        recommended_genres: Array.isArray(row.recommended_genres)
          ? row.recommended_genres.join(', ') || '-'
          : '-',
        fr_summary: parseFrInterpretationSummary(row.fr_interpretation),
        ai_sound_analysis: aiSoundAnalysis,
      },
      candidates,
    );

    if (!generated) {
      return NextResponse.json({ error: 'Recommendation failed' }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('headfi')
      .update({
        ai_recommended_album_ids: generated.album_ids,
        ai_recommended_album_reason: generated.reason,
        ai_recommended_at: now,
      })
      .eq('id', headfiId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      album_ids: generated.album_ids,
      reason: generated.reason,
      ai_recommended_at: now,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
