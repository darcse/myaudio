'use client';

import { useEffect } from 'react';

type BodyScrollLockSnapshot = {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverscroll: string;
  scrollX: number;
  scrollY: number;
};

let lockCount = 0;
let snapshot: BodyScrollLockSnapshot | null = null;

function acquireBodyScrollLock() {
  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    const scrollbarGap = Math.max(0, window.innerWidth - html.clientWidth);
    snapshot = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverscroll: html.style.overscrollBehavior,
      scrollX: window.scrollX,
      scrollY: window.scrollY || html.scrollTop,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    if (scrollbarGap > 0) {
      const currentPad = Number.parseFloat(snapshot.bodyPaddingRight) || 0;
      body.style.paddingRight = `${currentPad + scrollbarGap}px`;
    }
  }
  lockCount += 1;
}

function releaseBodyScrollLock() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0 || !snapshot) return;
  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = snapshot.htmlOverflow;
  body.style.overflow = snapshot.bodyOverflow;
  body.style.paddingRight = snapshot.bodyPaddingRight;
  html.style.overscrollBehavior = snapshot.htmlOverscroll;
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  snapshot = null;
}

export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    acquireBodyScrollLock();
    return () => {
      releaseBodyScrollLock();
    };
  }, [active]);
}
