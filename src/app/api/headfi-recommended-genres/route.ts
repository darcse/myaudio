import { NextRequest, NextResponse } from 'next/server';
import { recommendHeadfiListeningGenres } from '@/lib/gemini';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

const WIRED = new Set(['헤드폰', '이어폰']);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rawId = body.headfiId;
    const headfiId =
      typeof rawId === 'number' ? rawId : parseInt(String(rawId ?? ''), 10);
    const force = body.force === true;

    if (!Number.isFinite(headfiId)) {
      return NextResponse.json({ error: 'headfiId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: row, error: fetchError } = await supabase
      .from('headfi')
      .select('id, brand, model, category, recommended_genres')
      .eq('id', headfiId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!WIRED.has(row.category)) {
      return NextResponse.json({ error: '유선 헤드폰·이어폰만 지원합니다.' }, { status: 400 });
    }

    const existing = row.recommended_genres;
    if (!force && Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ recommended_genres: existing });
    }

    const brand = typeof row.brand === 'string' ? row.brand : '';
    const model = typeof row.model === 'string' ? row.model : '';
    if (!brand.trim() || !model.trim()) {
      return NextResponse.json(
        { error: '브랜드·모델명이 필요합니다.', recommended_genres: null },
        { status: 400 },
      );
    }

    const rawGenres = await recommendHeadfiListeningGenres({ brand, model });
    const genres = rawGenres?.slice(0, 4) ?? null;
    if (!genres || genres.length === 0) {
      return NextResponse.json(
        {
          message: '추천 장르를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          recommended_genres: null,
        },
        { status: 503 },
      );
    }

    const { error: updateError } = await supabase
      .from('headfi')
      .update({ recommended_genres: genres })
      .eq('id', headfiId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ recommended_genres: genres });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
