import {
  Bluetooth,
  Cpu,
  Ear,
  Headphones,
  Music,
  Package,
  Radio,
  Smartphone,
  Speaker,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Headfi } from '@/app/headfi/types';

export const HEADFI_CATEGORY_ORDER = [
  '헤드폰',
  '이어폰',
  '무선 헤드폰',
  '무선 이어폰',
  '스피커',
  'DAC/AMP',
  'DAP',
  'Source',
  '기타',
];

export const HEADFI_CATEGORY_ICON: Record<string, ReactNode> = {
  헤드폰: <Headphones className="size-5" strokeWidth={1.5} />,
  이어폰: <Ear className="size-5" strokeWidth={1.5} />,
  '무선 헤드폰': <Bluetooth className="size-5" strokeWidth={1.5} />,
  '무선 이어폰': <Radio className="size-5" strokeWidth={1.5} />,
  스피커: <Speaker className="size-5" strokeWidth={1.5} />,
  'DAC/AMP': <Cpu className="size-5" strokeWidth={1.5} />,
  DAP: <Smartphone className="size-5" strokeWidth={1.5} />,
  Source: <Music className="size-5" strokeWidth={1.5} />,
  기타: <Package className="size-5" strokeWidth={1.5} />,
};

export function buildSortedHeadfiCategories(rows: Pick<Headfi, 'category'>[]): [string, number][] {
  const headfiCategories = rows.reduce(
    (acc, h) => {
      const cat = h.category || '기타';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  return [
    ...HEADFI_CATEGORY_ORDER.filter((cat) => headfiCategories[cat] && headfiCategories[cat] > 0).map(
      (cat) => [cat, headfiCategories[cat]] as [string, number],
    ),
    ...Object.entries(headfiCategories).filter(
      ([cat, count]) => !HEADFI_CATEGORY_ORDER.includes(cat) && count > 0,
    ) as [string, number][],
  ];
}
