import { NextRequest, NextResponse } from 'next/server';
import { interpretHeadfiFrGraphFromImageBuffer } from '@/lib/gemini';
import { fetchRemoteImageBytes } from '@/lib/headfi-fr-remote';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

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
    if (!Number.isFinite(headfiId)) {
      return NextResponse.json({ error: 'headfiId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: row, error: fetchError } = await supabase
      .from('headfi')
      .select('id, fr_graph_url')
      .eq('id', headfiId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const graphUrl = row.fr_graph_url;
    if (!graphUrl || typeof graphUrl !== 'string' || !graphUrl.trim()) {
      return NextResponse.json({ error: 'FR 그래프 URL이 없습니다.' }, { status: 400 });
    }

    const fetched = await fetchRemoteImageBytes(graphUrl.trim());
    if (!fetched) {
      return NextResponse.json(
        {
          error: 'IMAGE_DOWNLOAD_FAILED',
          message:
            '그래프 이미지를 서버에서 받지 못했습니다. 링크가 막혔을 수 있으니 수정 화면에서 URL을 바꾸거나 이미지를 다시 업로드해 보세요.',
        },
        { status: 422 },
      );
    }

    const interpreted = await interpretHeadfiFrGraphFromImageBuffer(
      fetched.buffer,
      fetched.mimeType,
    );
    if (!interpreted) {
      return NextResponse.json(
        {
          error: 'GEMINI_FAILED',
          message: 'AI 해석 단계에서 실패했습니다. 잠시 후 다시 시도해 주세요.',
        },
        { status: 500 },
      );
    }

    const fr_interpretation = JSON.stringify(interpreted);

    const { error: updateError } = await supabase
      .from('headfi')
      .update({ fr_interpretation })
      .eq('id', headfiId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      fr_interpretation: interpreted,
    });
  } catch (error) {
    console.error('headfi-fr-interpret error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
