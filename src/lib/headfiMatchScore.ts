import type { Headfi } from '@/app/headfi/types';
import { parseFrInterpretationSummary } from '@/lib/headfiAlbumMatch';
import { shuffleArray } from '@/lib/utils';

export { parseFrInterpretationSummary };

export type HeadfiMatchScoreMode = 'dac_amp' | 'headphone';

export type CompressedCandidate = {
  id: number;
  name: string;
  temp: string;
  impedance: string;
  db1: string;
  low: string;
  mid: string;
  high: string;
};

function deviceName(brand: string | null, model: string | null): string {
  return `${brand ?? ''} ${model ?? ''}`.trim() || '-';
}

function avgScore(...values: (number | null | undefined)[]): number {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(Number(v)));
  if (nums.length === 0) return 0;
  const sum = nums.reduce((acc, v) => acc + Number(v), 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

export function compressHeadfiAudioBands(item: Headfi): { low: number; mid: number; high: number } {
  return {
    low: avgScore(item.bass_quantity, item.bass_depth),
    mid: avgScore(item.midrange_body, item.midrange_clarity),
    high: avgScore(item.treble_brightness, item.treble_airiness),
  };
}

export function formatGenres(genres: string[] | null | undefined, max = 3): string {
  if (!Array.isArray(genres) || genres.length === 0) return '-';
  return genres.slice(0, max).join(', ');
}

export function compressCandidateRow(item: Headfi): CompressedCandidate {
  const isWired =
    item.category === '헤드폰' || item.category === '이어폰';
  const bands = isWired ? compressHeadfiAudioBands(item) : null;
  const impedance =
    item.category === 'DAC/AMP'
      ? item.output_impedance != null && Number.isFinite(Number(item.output_impedance))
        ? String(item.output_impedance)
        : '-'
      : item.impedance != null && Number.isFinite(Number(item.impedance))
        ? String(item.impedance)
        : '-';
  const db1 =
    item.db1 != null && Number.isFinite(Number(item.db1)) ? String(item.db1) : '-';

  return {
    id: item.id,
    name: deviceName(item.brand, item.model),
    temp: item.temp?.trim() || '-',
    impedance,
    db1,
    low: bands ? String(bands.low) : '-',
    mid: bands ? String(bands.mid) : '-',
    high: bands ? String(bands.high) : '-',
  };
}

export function candidateLine(row: CompressedCandidate): string {
  return `${row.id}|${row.name}|${row.temp}|${row.impedance}|${row.db1}|${row.low}|${row.mid}|${row.high}`;
}

export function pickCandidates(items: Headfi[], limit = 20): Headfi[] {
  return shuffleArray(items).slice(0, limit);
}
