import { NextRequest, NextResponse } from 'next/server';
import { translateLyricsLines } from '@/lib/anthropicLyricsTranslate';
import { getCurrentUser } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const lyricsText = typeof body.lyricsText === 'string' ? body.lyricsText : '';
    const trackTitle = typeof body.trackTitle === 'string' ? body.trackTitle : '';
    if (!lyricsText.trim()) {
      return NextResponse.json({ error: '가사 텍스트는 필수입니다.' }, { status: 400 });
    }

    const result = await translateLyricsLines(lyricsText, trackTitle);
    if (!result) {
      return NextResponse.json({ error: '번역에 실패했습니다.' }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : '번역 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
