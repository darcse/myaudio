export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function stripHeadphoneIdSuffixes(text: string): string {
  return text.replace(/(\S)\(\d+\)/g, '$1');
}

export function splitProseParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const byBlank = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  const byLine = trimmed.split(/\n/).map((p) => p.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return [trimmed];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    out.push(sentences.slice(i, i + 2).join(' '));
  }
  return out;
}
