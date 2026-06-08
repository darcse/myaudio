'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

const SCROLL_THRESHOLD = 300;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY >= SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-[70] inline-flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-90 sm:size-12"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        color: 'var(--foreground)',
      }}
      aria-label="맨 위로 이동"
      title="맨 위로 이동"
    >
      <ChevronUp className="size-5 sm:size-[22px]" strokeWidth={1.8} aria-hidden />
    </button>
  );
}
