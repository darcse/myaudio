import { NextRequest, NextResponse } from 'next/server';
import { fetchRemoteImageBytes, isAllowedPublicImageUrl } from '@/lib/headfi-fr-remote';
import { getCurrentUser } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = req.nextUrl.searchParams.get('url');
    if (!raw?.trim()) {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }

    const target = raw.trim();
    if (!isAllowedPublicImageUrl(target)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    const got = await fetchRemoteImageBytes(target);
    if (!got) {
      return NextResponse.json({ error: 'Image fetch failed' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(got.buffer), {
      status: 200,
      headers: {
        'Content-Type': got.mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('headfi-fr-image error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
