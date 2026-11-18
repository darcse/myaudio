'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { TagCloud } from '@/components/TagCloud';
import { usePopoverPosition } from '@/hooks/usePopoverPosition';
import { matchesSearchContains } from '@/lib/textSearch';
import type { AlbumTagFilterOption } from '../utils';

type AlbumTagFilterPopoverProps = {
  value: string;
  options: AlbumTagFilterOption[];
  onChange: (value: string) => void;
};

const TAG_PANEL_OPTIONS = {
  preferredWidth: 520,
  preferredHeight: 420,
  maxHeightCap: 420,
  minWidth: 260,
  minHeight: 180,
  openBelowPreferMin: 220,
  aboveAnchor: 'css-top' as const,
  useModalBounds: false,
};

export function AlbumTagFilterPopover({
  value,
  options,
  onChange,
}: AlbumTagFilterPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((option) => matchesSearchContains(option.label, search));
  }, [options, search]);

  const panelPosition = usePopoverPosition(
    open,
    triggerRef,
    TAG_PANEL_OPTIONS,
    `${search}:${filteredOptions.length}`,
  );

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const buttonLabel = value === '전체' ? '태그: 전체' : `태그: ${value}`;

  const panel =
    open && panelPosition != null ? (
      <div
        ref={panelRef}
        className="fixed z-[120] overflow-hidden rounded-xl border shadow-lg"
        style={{
          left: panelPosition.left,
          top: panelPosition.top,
          width: panelPosition.width,
          maxHeight: panelPosition.maxHeight,
          borderColor: 'var(--border)',
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow)',
        }}
        role="dialog"
        aria-label="태그 필터"
      >
        <div className="border-b p-2" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-50" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="태그 검색"
              className="input-apple h-[36px] w-full py-1.5 pl-8 pr-2.5 text-sm"
              aria-label="태그 검색"
            />
          </div>
        </div>
        <div
          className="overflow-y-auto overscroll-y-contain p-3"
          style={{ maxHeight: Math.max(120, panelPosition.maxHeight - 56) }}
        >
          <TagCloud
            items={filteredOptions}
            selected={value}
            onSelect={handleSelect}
            emptyMessage="검색 결과 없음"
          />
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="select-apple flex h-[38px] items-center justify-between gap-2 px-3 py-2 text-left text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="태그 필터"
        title={buttonLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="min-w-0 truncate">{buttonLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" strokeWidth={2} />
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
