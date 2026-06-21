import { NextRequest, NextResponse } from 'next/server';
import { recommendAlbumHeadphones } from '@/lib/gemini';
import { parseFrInterpretationSummary } from '@/lib/headfiAlbumMatch';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

function formatImpedance(value: number | null | undefined): string {
  if (value != null && Number.isFinite(Number(value))) {
    return `${value} Ω`;
  }
  return '-';
}

function formatSensitivity(db1: number | null | undefined, db2: number | null | undefined): string {
  const parts: string[] = [];
  if (db1 != null && Number.isFinite(Number(db1))) parts.push(`${db1}dB/SPL V`);
  if (db2 != null && Number.isFinite(Number(db2))) parts.push(`${db2}dB/mW`);
  return parts.length > 0 ? parts.join(' ') : '-';
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const albumId =
      typeof body.albumId === 'number' ? body.albumId : parseInt(String(body.albumId ?? ''), 10);
    if (!Number.isFinite(albumId)) {
      return NextResponse.json({ error: 'albumId required' }, { status: 400 });
    }

    const supabase = await createClient();

    const [albumRes, headphonesRes] = await Promise.all([
      supabase
        .from('album')
        .select('id, artist, album_name, genre1, genre2, audio_tags, mood_name')
        .eq('id', albumId)
        .single(),
      supabase
        .from('headfi')
        .select(
          'id, brand, model, category, temp, impedance, db1, db2, recommended_genres, fr_interpretation, status2',
        )
        .eq('category', '헤드폰')
        .eq('status2', '보유중'),
    ]);

    if (albumRes.error || !albumRes.data) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }
    if (headphonesRes.error) {
      return NextResponse.json({ error: headphonesRes.error.message }, { status: 500 });
    }

    const headphones = headphonesRes.data ?? [];
    if (headphones.length === 0) {
      return NextResponse.json({ error: '보유중인 헤드폰이 없습니다.' }, { status: 404 });
    }

    const headphoneRows = headphones.map((h) => ({
      id: h.id,
      brand: h.brand || '',
      model: h.model || '',
      temp: h.temp?.trim() || '-',
      impedance: formatImpedance(h.impedance),
      sensitivity: formatSensitivity(h.db1, h.db2),
      recommended_genres: Array.isArray(h.recommended_genres)
        ? h.recommended_genres.join(', ') || '-'
        : '-',
      fr_summary: parseFrInterpretationSummary(h.fr_interpretation),
    }));

    const generated = await recommendAlbumHeadphones(albumRes.data, headphoneRows);
    if (!generated) {
      return NextResponse.json({ error: 'Recommendation failed' }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from('album')
      .update({
        ai_recommended_headphone_ids: generated.headphone_ids,
        ai_recommended_headphone_reason: generated.reason,
      })
      .eq('id', albumId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      headphone_ids: generated.headphone_ids,
      reason: generated.reason,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
