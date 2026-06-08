import { NextRequest, NextResponse } from 'next/server';
import { recommendByMood } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mood = body?.mood;
    const moodText = typeof body?.moodText === 'string' ? body.moodText : '';
    const weather = body?.weather ?? null;
    const timeSlot = typeof body?.timeSlot === 'string' ? body.timeSlot : '';

    if (!mood || typeof mood !== 'string') {
      return NextResponse.json({ error: 'mood required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: albums, error: albumsErr } = await supabase
      .from('album')
      .select('id, artist, album_name, genre1, genre2');

    if (albumsErr) {
      return NextResponse.json({ error: albumsErr.message }, { status: 500 });
    }
    if (!albums || albums.length === 0) {
      return NextResponse.json({ error: 'No albums found' }, { status: 404 });
    }

    const { data: headphones, error: headphonesErr } = await supabase
      .from('headfi')
      .select('id, brand, model, tone_warmth, treble_brightness, soundstage')
      .eq('category', '헤드폰')
      .eq('status2', '보유중');

    if (headphonesErr) {
      return NextResponse.json({ error: headphonesErr.message }, { status: 500 });
    }
    if (!headphones || headphones.length === 0) {
      return NextResponse.json({ error: 'No headphones found' }, { status: 404 });
    }

    const candidateAlbums = [...albums].sort(() => Math.random() - 0.5).slice(0, 30);
    const result = await recommendByMood(
      mood,
      moodText,
      weather,
      candidateAlbums,
      headphones,
      timeSlot,
    );

    if (!result) {
      return NextResponse.json({ error: 'Recommendation failed' }, { status: 500 });
    }

    const { data: albumDetail } = result.album_id
      ? await supabase
          .from('album')
          .select('id, album_name, artist, cover_image_url, genre1, genre2')
          .eq('id', result.album_id)
          .single()
      : { data: null };

    const { data: headphoneDetail } = result.headphone_id
      ? await supabase
          .from('headfi')
          .select('id, brand, model, image_url')
          .eq('id', result.headphone_id)
          .single()
      : { data: null };

    return NextResponse.json({
      album: albumDetail,
      headphone: headphoneDetail,
      reason: result.reason,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
