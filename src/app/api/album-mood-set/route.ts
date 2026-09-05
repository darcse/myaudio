import { NextRequest, NextResponse } from 'next/server';
import { setAlbumMoodManually } from '@/lib/albumEnrichment';
import { getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      albumId?: unknown;
      mood_name?: unknown;
    };

    const idNum =
      typeof body.albumId === 'number' && Number.isFinite(body.albumId)
        ? Math.trunc(body.albumId)
        : parseInt(String(body.albumId ?? ''), 10);
    if (!Number.isInteger(idNum)) {
      return NextResponse.json({ error: 'Invalid albumId' }, { status: 400 });
    }

    const moodName = typeof body.mood_name === 'string' ? body.mood_name.trim() : '';
    if (!moodName) {
      return NextResponse.json({ error: 'mood_name required' }, { status: 400 });
    }

    const result = await setAlbumMoodManually(idNum, moodName);
    if (!result.ok) {
      const status =
        result.error === 'Album not found'
          ? 404
          : result.error === 'Invalid mood_name' || result.error === 'Mood group not found'
            ? 400
            : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      mood_name: result.mood_name,
      mood_manually_set: true,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
