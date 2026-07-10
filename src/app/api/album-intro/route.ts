import { NextRequest, NextResponse } from 'next/server';
import { runAlbumIntroGeneration } from '@/lib/albumEnrichment';
import { getCurrentUser } from '@/lib/supabase/server';

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

    const idNum =
      typeof albumId === 'number' && Number.isFinite(albumId)
        ? Math.trunc(albumId)
        : parseInt(String(albumId), 10);
    if (!Number.isInteger(idNum)) {
      return NextResponse.json({ error: 'Invalid albumId' }, { status: 400 });
    }

    const result = await runAlbumIntroGeneration(idNum);
    if (!result.ok) {
      const status = result.error === 'Album not found' ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: album } = await supabase
      .from('album')
      .select('audio_tags, album_intro')
      .eq('id', idNum)
      .single();

    return NextResponse.json({
      audio_tags: album?.audio_tags ?? [],
      album_intro: album?.album_intro ?? '',
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
