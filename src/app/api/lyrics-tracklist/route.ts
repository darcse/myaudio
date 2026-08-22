import { NextRequest, NextResponse } from 'next/server';
import { fetchAlbumTracklist } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const albumId = typeof body.albumId === 'number' ? body.albumId : parseInt(String(body.albumId ?? ''), 10);
    if (!Number.isFinite(albumId)) {
      return NextResponse.json({ error: 'albumId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: album, error } = await supabase
      .from('album')
      .select('id, artist, album_name, release_date')
      .eq('id', albumId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!album) {
      return NextResponse.json({ error: '앨범을 찾을 수 없습니다.' }, { status: 404 });
    }

    const tracks = await fetchAlbumTracklist({
      artist: album.artist,
      album_name: album.album_name,
      release_date: album.release_date,
    });

    if (!tracks) {
      return NextResponse.json(
        { error: '트랙리스트를 불러오지 못했습니다. 직접 입력해 주세요.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ tracks });
  } catch (e) {
    const message = e instanceof Error ? e.message : '트랙리스트 조회 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
