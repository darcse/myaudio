export function stripMonthlyCommentIntro(raw: string): string {
  const trimmed = raw.trim();
  const sectionStart = trimmed.search(/^🎵|^🎧|^🎶/m);
  if (sectionStart > 0) return trimmed.slice(sectionStart).trim();
  return trimmed;
}
