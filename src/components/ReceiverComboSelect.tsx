'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  bootstrapRecentReceiversIfEmpty,
  getRecentReceiverIds,
  RECENT_RECEIVER_DISPLAY_LIMIT,
  recordRecentReceiver,
  readRecentReceiverEntries,
} from '@/lib/recentReceivers';

export type ReceiverOption = {
  id: number;
  brand: string;
  model: string;
};

type ReceiverComboSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ReceiverOption[];
  disabled?: boolean;
  placeholder?: string;
  emptyOptionLabel?: string;
  allowEmpty?: boolean;
  className?: string;
  'aria-label'?: string;
};

function formatReceiverLabel(option: ReceiverOption): string {
  return `${option.brand} ${option.model}`.trim() || '—';
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function matchesSearch(option: ReceiverOption, query: string): boolean {
  if (!query) return true;
  const haystack = `${option.brand} ${option.model}`.toLowerCase();
  return haystack.includes(query);
}

const PANEL_GAP = 6;
const VIEWPORT_PADDING = 8;
const SEARCH_HEADER_HEIGHT = 52;
const PANEL_PREFERRED_HEIGHT = 256;
const PANEL_FIXED_WIDTH = 300;

type PanelPlacement = 'above' | 'below';

type PanelPosition = {
  left: number;
  width: number;
  maxHeight: number;
  listMaxHeight: number;
  placement: PanelPlacement;
  top?: number;
  bottom?: number;
};

function getContainingBounds(trigger: HTMLButtonElement): { left: number; right: number; top: number; bottom: number } {
  const viewport = {
    left: VIEWPORT_PADDING,
    right: window.innerWidth - VIEWPORT_PADDING,
    top: VIEWPORT_PADDING,
    bottom: window.innerHeight - VIEWPORT_PADDING,
  };
  const modal = trigger.closest('.modal-panel-apple');
  if (!(modal instanceof HTMLElement)) return viewport;
  const rect = modal.getBoundingClientRect();
  return {
    left: Math.max(viewport.left, rect.left + VIEWPORT_PADDING),
    right: Math.min(viewport.right, rect.right - VIEWPORT_PADDING),
    top: Math.max(viewport.top, rect.top + VIEWPORT_PADDING),
    bottom: Math.min(viewport.bottom, rect.bottom - VIEWPORT_PADDING),
  };
}

function computePanelPosition(trigger: HTMLButtonElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const bounds = getContainingBounds(trigger);
  const preferredHeight = Math.min(PANEL_PREFERRED_HEIGHT, Math.max(0, bounds.bottom - bounds.top) * 0.9);
  const spaceBelow = bounds.bottom - rect.bottom;
  const spaceAbove = rect.top - bounds.top;
  const openBelow = spaceBelow >= preferredHeight || spaceBelow >= spaceAbove;
  const placement: PanelPlacement = openBelow ? 'below' : 'above';
  const availableSpace = (openBelow ? spaceBelow : spaceAbove) - PANEL_GAP;
  const maxHeight = Math.max(SEARCH_HEADER_HEIGHT + 80, Math.min(preferredHeight, availableSpace));
  const listMaxHeight = Math.max(80, maxHeight - SEARCH_HEADER_HEIGHT);
  const availableWidth = Math.max(0, bounds.right - bounds.left);
  const width = Math.min(PANEL_FIXED_WIDTH, availableWidth);
  const overflowRight = rect.left + width > bounds.right;
  const left = overflowRight
    ? Math.max(bounds.left, rect.right - width)
    : Math.min(Math.max(bounds.left, rect.left), bounds.right - width);

  if (placement === 'below') {
    return {
      left,
      width,
      maxHeight,
      listMaxHeight,
      placement,
      top: rect.bottom + PANEL_GAP,
    };
  }

  return {
    left,
    width,
    maxHeight,
    listMaxHeight,
    placement,
    bottom: window.innerHeight - rect.top + PANEL_GAP,
  };
}

export function ReceiverComboSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = '리시버 선택',
  emptyOptionLabel = '선택 안 함',
  allowEmpty = true,
  className = '',
  'aria-label': ariaLabel,
}: ReceiverComboSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [recentVersion, setRecentVersion] = useState(0);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const optionById = useMemo(() => {
    const map = new Map<number, ReceiverOption>();
    for (const option of options) {
      map.set(option.id, option);
    }
    return map;
  }, [options]);

  const validIdSet = useMemo(() => new Set(options.map((option) => option.id)), [options]);

  const selectedOption = value ? optionById.get(Number(value)) ?? null : null;

  const refreshRecent = useCallback(() => {
    setRecentVersion((prev) => prev + 1);
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPanelPosition(computePanelPosition(triggerRef.current));
  }, []);

  useEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }
    updatePanelPosition();
    const handleLayoutChange = () => updatePanelPosition();
    window.addEventListener('resize', handleLayoutChange);
    window.addEventListener('scroll', handleLayoutChange, true);
    return () => {
      window.removeEventListener('resize', handleLayoutChange);
      window.removeEventListener('scroll', handleLayoutChange, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    void bootstrapRecentReceiversIfEmpty(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('album_listen_history')
        .select('headphone_id, created_at')
        .not('headphone_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data ?? [])
        .map((row) => row.headphone_id)
        .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
    }).then(() => refreshRecent());
  }, [refreshRecent]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setShowAll(false);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, search, showAll, updatePanelPosition]);

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

  const normalizedSearch = normalizeSearchText(search);
  const isSearching = normalizedSearch.length > 0;

  const filteredOptions = useMemo(() => {
    if (!isSearching) return options;
    return options.filter((option) => matchesSearch(option, normalizedSearch));
  }, [options, isSearching, normalizedSearch]);

  const recentOptions = useMemo(() => {
    void recentVersion;
    const recentIds = getRecentReceiverIds(RECENT_RECEIVER_DISPLAY_LIMIT, validIdSet);
    return recentIds
      .map((id) => optionById.get(id))
      .filter((option): option is ReceiverOption => option != null);
  }, [optionById, recentVersion, validIdSet]);

  const recentIdSet = useMemo(() => new Set(recentOptions.map((option) => option.id)), [recentOptions]);

  const remainingOptions = useMemo(() => {
    if (isSearching) return filteredOptions;
    if (!showAll) return [];
    return options.filter((option) => !recentIdSet.has(option.id));
  }, [filteredOptions, isSearching, options, recentIdSet, showAll]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    const parsed = parseInt(nextValue, 10);
    if (Number.isFinite(parsed)) {
      recordRecentReceiver(parsed);
      refreshRecent();
    }
    setOpen(false);
  };

  const renderOptionButton = (option: ReceiverOption) => (
    <button
      key={option.id}
      type="button"
      role="option"
      aria-selected={value === String(option.id)}
      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap transition-colors hover:opacity-100"
      style={{
        background: value === String(option.id) ? 'var(--badge-bg)' : 'transparent',
        color: 'var(--foreground)',
      }}
      onClick={() => handleSelect(String(option.id))}
    >
      {formatReceiverLabel(option)}
    </button>
  );

  const triggerLabel = selectedOption ? formatReceiverLabel(selectedOption) : placeholder;

  const panelContent =
    panelPosition != null ? (
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        className="fixed z-[120] overflow-hidden rounded-xl border shadow-lg"
        style={{
          left: panelPosition.left,
          width: panelPosition.width,
          minWidth: panelPosition.width,
          maxHeight: panelPosition.maxHeight,
          ...(panelPosition.placement === 'below'
            ? { top: panelPosition.top }
            : { bottom: panelPosition.bottom }),
          borderColor: 'var(--border)',
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="border-b p-2" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-50" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="브랜드·모델 검색"
              className="input-apple h-[36px] w-full py-1.5 pl-8 pr-2.5 text-sm"
            />
          </div>
        </div>

        <div
          className="overflow-y-auto overscroll-y-contain p-2"
          style={{ maxHeight: panelPosition.listMaxHeight }}
        >
          {options.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs opacity-60">등록된 보유 리시버가 없습니다.</p>
          ) : isSearching ? (
            filteredOptions.length > 0 ? (
              <div className="space-y-0.5">{filteredOptions.map(renderOptionButton)}</div>
            ) : (
              <p className="px-2 py-4 text-center text-xs opacity-60">검색 결과가 없습니다.</p>
            )
          ) : (
            <>
              {allowEmpty ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ''}
                  className="mb-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap opacity-70 transition-colors hover:opacity-100"
                  style={{
                    background: value === '' ? 'var(--badge-bg)' : 'transparent',
                  }}
                  onClick={() => handleSelect('')}
                >
                  {emptyOptionLabel}
                </button>
              ) : null}

              {recentOptions.length > 0 ? (
                <div className="mb-2">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide opacity-50">최근 사용</p>
                  <div className="space-y-0.5">{recentOptions.map(renderOptionButton)}</div>
                </div>
              ) : readRecentReceiverEntries().length === 0 && options.length > 0 ? (
                <p className="px-2 pb-2 text-xs opacity-50">최근 사용 이력이 없습니다.</p>
              ) : null}

              {!showAll && options.length > recentOptions.length ? (
                <button
                  type="button"
                  className="btn-apple btn-apple-secondary mb-1 w-full px-3 py-2 text-xs font-medium"
                  onClick={() => setShowAll(true)}
                >
                  전체보기 ({options.length}개)
                </button>
              ) : null}

              {showAll && remainingOptions.length > 0 ? (
                <div>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide opacity-50">전체</p>
                  <div className="space-y-0.5">{remainingOptions.map(renderOptionButton)}</div>
                </div>
              ) : null}

              {showAll && remainingOptions.length === 0 && recentOptions.length === options.length ? (
                <p className="px-2 py-2 text-xs opacity-50">표시할 전체 목록이 없습니다.</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={className}>
      <button
        ref={triggerRef}
        type="button"
        className="select-apple flex h-[42px] w-full items-center justify-between gap-2 px-3 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => {
            const next = !prev;
            if (next && triggerRef.current) {
              setPanelPosition(computePanelPosition(triggerRef.current));
            }
            return next;
          });
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
      >
        <span className={`min-w-0 truncate text-left ${selectedOption ? '' : 'opacity-60'}`}>{triggerLabel}</span>
        <ChevronDown className={`size-4 shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && panelContent && typeof document !== 'undefined' ? createPortal(panelContent, document.body) : null}
    </div>
  );
}
