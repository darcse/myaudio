'use client';

import { useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import type { ArtistSummary } from '../types';

type ArtistListSidebarProps = {
  artists: ArtistSummary[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  emptyMessage?: string;
};

export function ArtistListSidebar({
  artists,
  selectedName,
  onSelect,
  emptyMessage = '표시할 아티스트가 없습니다.',
}: ArtistListSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        event.preventDefault();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <aside
      className="flex h-full max-h-[calc(100dvh-14rem)] min-h-[20rem] flex-col rounded-xl border lg:max-h-none lg:min-h-0"
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
    >
      <div
        className="flex items-center gap-1.5 border-b px-3 py-2.5 text-sm font-semibold tabular-nums"
        style={{ borderColor: 'var(--border)' }}
      >
        <Users className="size-4 shrink-0 opacity-70" strokeWidth={1.5} aria-hidden />
        {artists.length}명
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2">
        {artists.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm opacity-60">{emptyMessage}</p>
        ) : (
          <ul className="space-y-1">
            {artists.map((artist) => {
              const active = selectedName === artist.name;
              return (
                <li key={artist.name}>
                  <button
                    type="button"
                    onClick={() => onSelect(artist.name)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      background: active ? 'var(--badge-bg)' : 'transparent',
                      color: 'var(--foreground)',
                      opacity: active ? 1 : 0.85,
                    }}
                  >
                    <span className="min-w-0 truncate font-medium">{artist.name}</span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums opacity-70"
                      style={{ background: 'var(--badge-bg)' }}
                    >
                      {artist.albumCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
