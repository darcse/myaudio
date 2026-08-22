import type { TranslatedLine } from '../types';

export function groupTranslatedLinesByParagraph(
  lyricsText: string,
  translatedLines: TranslatedLine[],
): TranslatedLine[][] {
  const normalized = lyricsText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return translatedLines.length > 0 ? [translatedLines] : [];
  }

  const rawLines = normalized.split('\n');
  const paragraphs: TranslatedLine[][] = [];
  let current: TranslatedLine[] = [];
  let translatedIndex = 0;

  for (const rawLine of rawLines) {
    if (rawLine.trim() === '') {
      if (current.length > 0) {
        paragraphs.push(current);
        current = [];
      }
      continue;
    }

    const translated = translatedLines[translatedIndex];
    if (translated) {
      current.push(translated);
    } else {
      current.push({ original: rawLine.trimEnd(), translation: '' });
    }
    translatedIndex += 1;
  }

  if (current.length > 0) {
    paragraphs.push(current);
  }

  if (paragraphs.length === 0 && translatedLines.length > 0) {
    return [translatedLines];
  }

  return paragraphs;
}
