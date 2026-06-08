import { NextRequest, NextResponse } from 'next/server';
import { analyzeLyricsVibe } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const lyricsId = body.lyricsId;
    const lyricsText = typeof body.lyricsText === 'string' ? body.lyricsText.trim() : '';

    if (!lyricsId || !lyricsText) {
      return NextResponse.json({ error: 'lyricsId and lyricsText required' }, { status: 400 });
    }

    const result = await analyzeLyricsVibe(lyricsText);
    if (!result) {
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }

    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('lyrics')
      .update({
        vibe_colors: result.colors,
        vibe_emoji: result.emoji,
      })
      .eq('id', lyricsId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('analyze-lyrics-vibe error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
