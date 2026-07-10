import { NextRequest, NextResponse } from 'next/server';
import { runAlbumMoodAssign } from '@/lib/albumEnrichment';
import { getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { albumId } = await req.json();
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

    const result = await runAlbumMoodAssign(idNum);
    if (!result.ok) {
      const status =
        result.error === 'Album not found'
          ? 404
          : result.error === 'Mood classification failed'
            ? 502
            : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ mood_name: result.mood_name, skipped: result.skipped });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
