'use client';

import { useEffect } from 'react';

export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY || html.scrollTop;
    const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const prevHtmlOverscroll = html.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    if (scrollbarGap > 0) {
      const currentPad = Number.parseFloat(prevBodyPaddingRight) || 0;
      body.style.paddingRight = `${currentPad + scrollbarGap}px`;
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      window.scrollTo(scrollX, scrollY);
    };
  }, [active]);
}
