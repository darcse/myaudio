import { NextRequest, NextResponse } from 'next/server';
import { generateAlbumIntroAndTags } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const albumId = body?.albumId;
    if (!albumId) {
      return NextResponse.json({ error: 'albumId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: album, error: albumError } = await supabase
      .from('album')
      .select('id, artist, album_name, genre1, genre2, release_date, country')
      .eq('id', albumId)
      .single();

    if (albumError || !album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const generated = await generateAlbumIntroAndTags(album);
    if (!generated) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from('album')
      .update({
        audio_tags: generated.audio_tags.length ? generated.audio_tags : null,
        album_intro: generated.album_intro || null,
        ai_recommended_headphone_ids: null,
        ai_recommended_headphone_reason: null,
      })
      .eq('id', albumId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      audio_tags: generated.audio_tags,
      album_intro: generated.album_intro,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
