import type { Headfi } from '@/app/headfi/types';
import { isPositionMapCategory } from '@/lib/headfiPosition';
import type {
  CategoryFilter,
  MapMarker,
  PlottedPoint,
  StatusFilter,
} from './positionMapTypes';

export const PLOT_W = 560;
export const PLOT_H = 400;
export const PLOT_PAD = 28;
export const VIEW_PAD_TOP = 18;
export const VIEW_PAD_SIDE = 42;
export const VIEW_PAD_BOTTOM = 8;
export const VIEW_W = PLOT_W + VIEW_PAD_SIDE * 2;
export const VIEW_H = PLOT_H + VIEW_PAD_TOP + VIEW_PAD_BOTTOM;
export const COORD_SPREAD = 1.2;
export const TOOLTIP_HIDE_DELAY_MS = 120;
export const AXIS_LABEL_CLASS =
  'pointer-events-none absolute text-[11px] leading-none opacity-70 whitespace-nowrap';

export const CLUSTER_THRESHOLD = 30;
const MIXED_CLUSTER_COLOR = '#888888';

export const POSITION_DOT_LEGEND = [
  { label: '오픈형 헤드폰', color: '#57C1FF' },
  { label: '밀폐형 헤드폰', color: '#1E3A8A' },
  { label: '커널형 이어폰', color: '#EF4444' },
  { label: '오픈형 이어폰', color: '#F97316' },
  { label: '기타/미분류', color: '#888888' },
] as const;

export const STATUS_FILTER_OPTIONS: StatusFilter[] = ['전체', '보유중', '방출'];
export const CATEGORY_FILTER_OPTIONS: CategoryFilter[] = ['전체', '헤드폰', '이어폰'];

export function toPlotX(value: number): number {
  const scaled = Math.max(-1, Math.min(1, value * COORD_SPREAD));
  return PLOT_PAD + ((scaled + 1) / 2) * (PLOT_W - 2 * PLOT_PAD);
}

export function toPlotY(value: number): number {
  const scaled = Math.max(-1, Math.min(1, value * COORD_SPREAD));
  return PLOT_PAD + ((1 - scaled) / 2) * (PLOT_H - 2 * PLOT_PAD);
}

export function getPositionDotColor(item: Headfi): string {
  if (item.category === '헤드폰' && item.type1 === '오픈형') return '#57C1FF';
  if (item.category === '헤드폰' && item.type1 === '밀폐형') return '#1E3A8A';
  if (item.category === '이어폰' && item.type1 === '커널형') return '#EF4444';
  if (item.category === '이어폰' && item.type1 === '오픈형') return '#F97316';
  return '#888888';
}

export function clusterPlottedPoints(points: PlottedPoint[]): MapMarker[] {
  const count = points.length;
  if (count === 0) return [];

  const parent = points.map((_, index) => index);

  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) <= CLUSTER_THRESHOLD) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, PlottedPoint[]>();
  for (let i = 0; i < count; i++) {
    const root = find(i);
    const group = groups.get(root) ?? [];
    group.push(points[i]);
    groups.set(root, group);
  }

  const markers: MapMarker[] = [];
  let clusterIndex = 0;
  for (const group of groups.values()) {
    const x = group.reduce((sum, point) => sum + point.x, 0) / group.length;
    const y = group.reduce((sum, point) => sum + point.y, 0) / group.length;
    if (group.length === 1) {
      const item = group[0].item;
      markers.push({
        kind: 'single',
        id: `single-${item.id}`,
        x,
        y,
        item,
        color: getPositionDotColor(item),
      });
      continue;
    }
    const colors = new Set(group.map((point) => getPositionDotColor(point.item)));
    markers.push({
      kind: 'cluster',
      id: `cluster-${clusterIndex}`,
      x,
      y,
      items: group.map((point) => point.item),
      color: colors.size === 1 ? [...colors][0] : MIXED_CLUSTER_COLOR,
      count: group.length,
    });
    clusterIndex += 1;
  }
  return markers;
}

export function deviceDisplayName(item: Headfi): string {
  return `${item.brand ?? ''} ${item.model ?? ''}`.trim() || '—';
}

export function popoverRowHeight(item: Headfi): number {
  return item.position_label ? 52 : 36;
}

export function clampPopoverPosition(
  wrap: HTMLDivElement,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const rect = wrap.getBoundingClientRect();
  const left = Math.min(Math.max(clientX - rect.left, 8), rect.width - width - 8);
  const top = Math.min(Math.max(clientY - rect.top + 8, 8), rect.height - height - 8);
  return { left, top };
}

export function clampTooltipPosition(
  wrap: HTMLDivElement,
  clientX: number,
  clientY: number,
  tooltipWidth: number,
  tooltipHeight: number,
): { left: number; top: number; placement: 'above' | 'below' } {
  const rect = wrap.getBoundingClientRect();
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  const left = Math.min(Math.max(relativeX, tooltipWidth / 2 + 8), rect.width - tooltipWidth / 2 - 8);
  let placement: 'above' | 'below' = 'above';
  let top = relativeY - 10;
  if (top - tooltipHeight < 8) {
    placement = 'below';
    top = relativeY + 16;
  }
  top = Math.min(Math.max(top, 8), rect.height - 8);
  return { left, top, placement };
}

export function filterToggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px',
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

export function matchesMapFilters(
  item: Headfi,
  statusFilter: StatusFilter,
  categoryFilter: CategoryFilter,
): boolean {
  if (!isPositionMapCategory(item.category)) return false;
  if (statusFilter !== '전체' && item.status2 !== statusFilter) return false;
  if (categoryFilter !== '전체' && item.category !== categoryFilter) return false;
  return true;
}

export function patchItemPosition(
  items: Headfi[],
  id: number,
  position: { x: number; y: number; label: string } | null,
): Headfi[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (!position) {
      return { ...item, position_x: null, position_y: null, position_label: null };
    }
    return {
      ...item,
      position_x: position.x,
      position_y: position.y,
      position_label: position.label,
    };
  });
}
