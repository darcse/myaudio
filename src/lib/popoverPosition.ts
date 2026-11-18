export type PanelPlacement = 'above' | 'below';

export type PanelPosition = {
  left: number;
  width: number;
  maxHeight: number;
  placement: PanelPlacement;
  top?: number;
  bottom?: number;
  listMaxHeight?: number;
};

export type ComputePanelPositionOptions = {
  gap?: number;
  viewportPadding?: number;
  preferredHeight?: number;
  maxHeightCap?: number;
  minHeight?: number;
  preferredWidth?: number;
  minWidth?: number;
  matchTriggerWidth?: boolean;
  searchHeaderHeight?: number;
  openBelowPreferMin?: number;
  useModalBounds?: boolean;
  aboveAnchor?: 'css-bottom' | 'css-top';
};

const DEFAULT_GAP = 6;
const DEFAULT_VIEWPORT_PADDING = 8;

function getContainingBounds(
  trigger: HTMLElement,
  viewportPadding: number,
  useModalBounds: boolean,
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const viewport = {
    left: viewportPadding,
    right: window.innerWidth - viewportPadding,
    top: viewportPadding,
    bottom: window.innerHeight - viewportPadding,
  };
  if (!useModalBounds) return viewport;
  const modal = trigger.closest('.modal-panel-apple');
  if (!(modal instanceof HTMLElement)) return viewport;
  const rect = modal.getBoundingClientRect();
  return {
    left: Math.max(viewport.left, rect.left + viewportPadding),
    right: Math.min(viewport.right, rect.right - viewportPadding),
    top: Math.max(viewport.top, rect.top + viewportPadding),
    bottom: Math.min(viewport.bottom, rect.bottom - viewportPadding),
  };
}

export function computePanelPosition(
  trigger: HTMLElement,
  options: ComputePanelPositionOptions = {},
): PanelPosition {
  const gap = options.gap ?? DEFAULT_GAP;
  const viewportPadding = options.viewportPadding ?? DEFAULT_VIEWPORT_PADDING;
  const useModalBounds = options.useModalBounds ?? false;
  const aboveAnchor = options.aboveAnchor ?? 'css-bottom';
  const searchHeaderHeight = options.searchHeaderHeight;
  const matchTriggerWidth = options.matchTriggerWidth ?? false;
  const minWidth = options.minWidth ?? (matchTriggerWidth ? 220 : 260);
  const preferredWidth = options.preferredWidth;
  const preferredHeight = options.preferredHeight ?? 256;
  const maxHeightCap = options.maxHeightCap;
  const minHeight = options.minHeight ?? (searchHeaderHeight != null ? searchHeaderHeight + 80 : 180);
  const openBelowPreferMin = options.openBelowPreferMin;

  const rect = trigger.getBoundingClientRect();
  const bounds = getContainingBounds(trigger, viewportPadding, useModalBounds);
  const boundsHeight = Math.max(0, bounds.bottom - bounds.top);
  const heightBudget = Math.min(
    preferredHeight,
    maxHeightCap ?? preferredHeight,
    boundsHeight * (useModalBounds ? 0.9 : 1),
  );

  const spaceBelow = bounds.bottom - rect.bottom - (useModalBounds ? 0 : gap);
  const spaceAbove = rect.top - bounds.top - (useModalBounds ? 0 : gap);
  const preferMin = openBelowPreferMin ?? heightBudget;
  const openBelow = spaceBelow >= preferMin || spaceBelow >= spaceAbove;
  const placement: PanelPlacement = openBelow ? 'below' : 'above';
  const availableSpace = useModalBounds
    ? (openBelow ? spaceBelow : spaceAbove) - gap
    : openBelow
      ? spaceBelow
      : spaceAbove;
  const maxHeight = Math.max(minHeight, Math.min(heightBudget, maxHeightCap ?? heightBudget, availableSpace));
  const listMaxHeight =
    searchHeaderHeight != null ? Math.max(80, maxHeight - searchHeaderHeight) : undefined;

  const availableWidth = Math.max(0, bounds.right - bounds.left);
  let width: number;
  if (matchTriggerWidth) {
    width = Math.min(Math.max(rect.width, minWidth), availableWidth);
  } else {
    const cappedPreferred = preferredWidth ?? Math.min(520, availableWidth);
    width = Math.min(cappedPreferred, Math.max(minWidth, availableWidth));
  }

  const overflowRight = rect.left + width > bounds.right;
  const left = overflowRight
    ? Math.max(bounds.left, rect.right - width)
    : Math.min(Math.max(bounds.left, rect.left), Math.max(bounds.left, bounds.right - width));

  if (placement === 'below') {
    return {
      left,
      width,
      maxHeight,
      listMaxHeight,
      placement,
      top: rect.bottom + gap,
    };
  }

  if (aboveAnchor === 'css-top') {
    return {
      left,
      width,
      maxHeight,
      listMaxHeight,
      placement,
      top: Math.max(viewportPadding, rect.top - gap - maxHeight),
    };
  }

  return {
    left,
    width,
    maxHeight,
    listMaxHeight,
    placement,
    bottom: window.innerHeight - rect.top + gap,
  };
}
