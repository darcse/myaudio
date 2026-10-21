import { NextRequest, NextResponse } from 'next/server';
import { summarizeHeadfiExternalReviews } from '@/lib/gemini';
import {
  hasCachedHeadfiReview,
  parseHeadfiReviewSources,
  truncateReviewSummary,
} from '@/lib/headfiReviewSources';
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
      .select(
        'id, brand, model, category, type1, impedance, db1, ai_review_summary, ai_review_sources, ai_review_fetched_at',
      )
      .eq('id', headfiId)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!WIRED.has(row.category)) {
      return NextResponse.json({ error: '유선 헤드폰·이어폰만 지원합니다.' }, { status: 400 });
    }

    if (!force && hasCachedHeadfiReview(row)) {
      return NextResponse.json({
        summary: typeof row.ai_review_summary === 'string' ? row.ai_review_summary : '',
        sources: parseHeadfiReviewSources(row.ai_review_sources),
        fetched_at: row.ai_review_fetched_at,
        cached: true,
      });
    }

    const brand = typeof row.brand === 'string' ? row.brand : '';
    const model = typeof row.model === 'string' ? row.model : '';
    if (!brand.trim() || !model.trim()) {
      return NextResponse.json({ error: '브랜드·모델명이 필요합니다.' }, { status: 400 });
    }

    const generated = await summarizeHeadfiExternalReviews({
      brand,
      model,
      category: typeof row.category === 'string' ? row.category : '',
      type1: typeof row.type1 === 'string' ? row.type1 : null,
      impedance: typeof row.impedance === 'number' ? row.impedance : null,
      db1: typeof row.db1 === 'number' ? row.db1 : null,
    });

    if (!generated) {
      return NextResponse.json(
        { error: '외부 리뷰 요약을 만들지 못했습니다.', summary: null, sources: [] },
        { status: 503 },
      );
    }

    const summary = truncateReviewSummary(generated.summary);
    const sources = parseHeadfiReviewSources(generated.sources);
    const fetched_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('headfi')
      .update({
        ai_review_summary: summary,
        ai_review_sources: sources,
        ai_review_fetched_at: fetched_at,
      })
      .eq('id', headfiId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ summary, sources, fetched_at, cached: false });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
