'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  computePanelPosition,
  type ComputePanelPositionOptions,
  type PanelPosition,
} from '@/lib/popoverPosition';

export function usePopoverPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  options: ComputePanelPositionOptions = {},
  recalcKey: string | number = 0,
): PanelPosition | null {
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }
    const update = () => {
      if (!triggerRef.current) return;
      setPanelPosition(computePanelPosition(triggerRef.current, optionsRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, triggerRef, recalcKey]);

  return panelPosition;
}
