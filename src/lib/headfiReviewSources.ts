export type HeadfiReviewSource = {
  title: string;
  url: string;
};

export const HEADFI_REVIEW_SUMMARY_MAX_CHARS = 1500;

export function parseHeadfiReviewSources(raw: unknown): HeadfiReviewSource[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const sources: HeadfiReviewSource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { title?: unknown; url?: unknown };
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : url;
    sources.push({ title, url });
  }
  return sources;
}

export function truncateReviewSummary(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= HEADFI_REVIEW_SUMMARY_MAX_CHARS) return trimmed;
  return trimmed.slice(0, HEADFI_REVIEW_SUMMARY_MAX_CHARS);
}

export function hasCachedHeadfiReview(row: {
  ai_review_summary?: string | null;
  ai_review_fetched_at?: string | null;
}): boolean {
  return Boolean(row.ai_review_summary?.trim()) || Boolean(row.ai_review_fetched_at);
}
