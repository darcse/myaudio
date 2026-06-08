import type { SupabaseClient } from '@supabase/supabase-js';
import { ARCHIVE_APP } from '../constants';

export function monthlyReviewCommentQuery(
  supabase: SupabaseClient,
  year: number,
  month: number,
) {
  return supabase
    .from('monthly_review_comments')
    .select('comment')
    .eq('year', year)
    .eq('month', month)
    .eq('app', ARCHIVE_APP)
    .maybeSingle();
}

export function monthlyReviewCommentUpsertPayload(
  year: number,
  month: number,
  comment: string,
) {
  return {
    year,
    month,
    app: ARCHIVE_APP,
    comment,
    updated_at: new Date().toISOString(),
  };
}
