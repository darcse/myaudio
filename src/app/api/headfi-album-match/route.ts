import { NextRequest, NextResponse } from 'next/server';
import { recommendHeadfiAlbumMatch } from '@/lib/gemini';
import {
  parseFrInterpretationSummary,
  selectAlbumsForHeadfiMatch,
} from '@/lib/headfiAlbumMatch';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

const WIRED_CATEGORIES = new Set(['헤드폰', '이어폰']);

function deviceName(brand: string | null, model: string | null): string {
  return `${brand ?? ''} ${model ?? ''}`.trim() || '-';
}

function formatOutputImpedance(value: number | null | undefined): string {
  if (value != null && Number.isFinite(Number(value))) {
    return `${value} Ω`;
  }
  return '-';
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const dacAmpId =
      typeof body.dacAmpId === 'number'
        ? body.dacAmpId
        : parseInt(String(body.dacAmpId ?? ''), 10);
    const headphoneId =
      typeof body.headphoneId === 'number'
        ? body.headphoneId
        : parseInt(String(body.headphoneId ?? ''), 10);

    if (!Number.isFinite(dacAmpId) || !Number.isFinite(headphoneId)) {
      return NextResponse.json({ error: 'dacAmpId and headphoneId required' }, { status: 400 });
    }

    const supabase = await createClient();

    const [dacRes, hpRes, albumsRes] = await Promise.all([
      supabase
        .from('headfi')
        .select('id, brand, model, category, amp_type, temp, output_impedance, status2')
        .eq('id', dacAmpId)
        .single(),
      supabase
        .from('headfi')
        .select('id, brand, model, category, temp, fr_interpretation, recommended_genres, status2')
        .eq('id', headphoneId)
        .single(),
      supabase.from('album').select('id, artist, genre1, genre2, audio_tags'),
    ]);

    if (dacRes.error || !dacRes.data) {
      return NextResponse.json({ error: 'DAC/AMP not found' }, { status: 404 });
    }
    if (hpRes.error || !hpRes.data) {
      return NextResponse.json({ error: 'Headphone not found' }, { status: 404 });
    }
    if (albumsRes.error) {
      return NextResponse.json({ error: albumsRes.error.message }, { status: 500 });
    }

    if (dacRes.data.category !== 'DAC/AMP') {
      return NextResponse.json({ error: 'DAC/AMP 기기를 선택해 주세요.' }, { status: 400 });
    }
    if (!WIRED_CATEGORIES.has(hpRes.data.category)) {
      return NextResponse.json({ error: '유선 헤드폰·이어폰을 선택해 주세요.' }, { status: 400 });
    }
    if (dacRes.data.status2 !== '보유중' || hpRes.data.status2 !== '보유중') {
      return NextResponse.json({ error: '보유중인 기기만 추천할 수 있습니다.' }, { status: 400 });
    }

    const albums = albumsRes.data ?? [];
    if (albums.length === 0) {
      return NextResponse.json({ error: '보유 앨범이 없습니다.' }, { status: 404 });
    }

    const candidates = selectAlbumsForHeadfiMatch(
      albums,
      Array.isArray(hpRes.data.recommended_genres) ? hpRes.data.recommended_genres : [],
    );

    const recommendations = await recommendHeadfiAlbumMatch(
      {
        name: deviceName(dacRes.data.brand, dacRes.data.model),
        amp_type: dacRes.data.amp_type?.trim() || '-',
        temp: dacRes.data.temp?.trim() || '-',
        output_impedance: formatOutputImpedance(dacRes.data.output_impedance),
      },
      {
        name: deviceName(hpRes.data.brand, hpRes.data.model),
        temp: hpRes.data.temp?.trim() || '-',
        fr_summary: parseFrInterpretationSummary(hpRes.data.fr_interpretation),
        recommended_genres: Array.isArray(hpRes.data.recommended_genres)
          ? hpRes.data.recommended_genres.join(', ') || '-'
          : '-',
      },
      candidates,
    );

    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json({ error: '추천 생성에 실패했습니다.' }, { status: 500 });
    }

    const albumIds = recommendations.map((r) => r.album_id);
    const { data: albumRows, error: albumDetailError } = await supabase
      .from('album')
      .select('*')
      .in('id', albumIds);

    if (albumDetailError) {
      return NextResponse.json({ error: albumDetailError.message }, { status: 500 });
    }

    const albumById = new Map((albumRows ?? []).map((a) => [a.id, a]));
    const results = recommendations
      .map((rec) => {
        const album = albumById.get(rec.album_id);
        if (!album) return null;
        return {
          album_id: rec.album_id,
          reason: rec.reason,
          album,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    return NextResponse.json({ recommendations: results });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
