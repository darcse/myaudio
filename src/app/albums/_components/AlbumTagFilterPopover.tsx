'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import type { AlbumTagFilterOption } from '../utils';

type AlbumTagFilterPopoverProps = {
  value: string;
  options: AlbumTagFilterOption[];
  onChange: (value: string) => void;
};

const PANEL_GAP = 6;
const VIEWPORT_PADDING = 8;
const PANEL_PREFERRED_WIDTH = 520;
const PANEL_MAX_HEIGHT = 420;

type PanelPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

function tagFontSize(count: number, maxCount: number): string {
  if (maxCount <= 1) return '11px';
  const ratio = count / maxCount;
  if (ratio >= 0.75) return '13px';
  if (ratio >= 0.45) return '12px';
  return '11px';
}

function computePanelPosition(trigger: HTMLElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(
    PANEL_PREFERRED_WIDTH,
    Math.max(260, viewportWidth - VIEWPORT_PADDING * 2),
  );
  let left = rect.left;
  if (left + width > viewportWidth - VIEWPORT_PADDING) {
    left = Math.max(VIEWPORT_PADDING, viewportWidth - VIEWPORT_PADDING - width);
  }
  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;

  const spaceBelow = viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_PADDING;
  const spaceAbove = rect.top - PANEL_GAP - VIEWPORT_PADDING;
  const openBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
  const available = openBelow ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(180, Math.min(PANEL_MAX_HEIGHT, available));
  const top = openBelow
    ? rect.bottom + PANEL_GAP
    : Math.max(VIEWPORT_PADDING, rect.top - PANEL_GAP - maxHeight);

  return { left, top, width, maxHeight };
}

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
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLocaleLowerCase().includes(query));
  }, [options, search]);

  const maxCount = useMemo(
    () => filteredOptions.reduce((max, option) => Math.max(max, option.count), 0),
    [filteredOptions],
  );

  useEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }
    const update = () => {
      if (!triggerRef.current) return;
      setPanelPosition(computePanelPosition(triggerRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, search, filteredOptions.length]);

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
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelect('전체')}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={{
                fontSize: '11px',
                background: value === '전체' ? 'var(--foreground)' : 'var(--badge-bg)',
                color: value === '전체' ? 'var(--background)' : 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
              aria-pressed={value === '전체'}
            >
              전체
            </button>
            {filteredOptions.length === 0 ? (
              <p className="px-1 py-1 text-sm opacity-60">검색 결과 없음</p>
            ) : (
              filteredOptions.map((option) => {
                const active = value === option.label;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleSelect(option.label)}
                    className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
                    style={{
                      fontSize: tagFontSize(option.count, maxCount),
                      background: active ? 'var(--foreground)' : 'var(--badge-bg)',
                      color: active ? 'var(--background)' : 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }}
                    aria-pressed={active}
                  >
                    {option.label} ({option.count})
                  </button>
                );
              })
            )}
          </div>
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
