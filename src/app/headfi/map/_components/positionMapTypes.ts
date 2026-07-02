import type { Headfi } from '@/app/headfi/types';

export type PlottedPoint = { item: Headfi; x: number; y: number };

export type MapSingleMarker = {
  kind: 'single';
  id: string;
  x: number;
  y: number;
  item: Headfi;
  color: string;
};

export type MapClusterMarker = {
  kind: 'cluster';
  id: string;
  x: number;
  y: number;
  items: Headfi[];
  color: string;
  count: number;
};

export type MapMarker = MapSingleMarker | MapClusterMarker;

export type HoverTooltip = {
  kind: 'single' | 'cluster';
  left: number;
  top: number;
  placement: 'above' | 'below';
  item?: Headfi;
  items?: Headfi[];
};

export type ActivePopover = {
  left: number;
  top: number;
  items: Headfi[];
};

export type StatusFilter = '전체' | '보유중' | '방출';
export type CategoryFilter = '전체' | '헤드폰' | '이어폰';
