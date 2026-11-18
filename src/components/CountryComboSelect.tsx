'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import {
  countryOptions,
  type CountryOption,
} from '@/app/albums/constants';

type CountryComboSelectProps = {
  value: string;
  onChange: (value: string) => void;
  usageCounts?: Record<string, number>;
  disabled?: boolean;
  placeholder?: string;
  emptyOptionLabel?: string;
  allowEmpty?: boolean;
  className?: string;
  'aria-label'?: string;
};

const PANEL_GAP = 6;
const VIEWPORT_PADDING = 8;
const SEARCH_HEADER_HEIGHT = 52;
const PANEL_PREFERRED_HEIGHT = 256;

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

function getContainingBounds(trigger: HTMLButtonElement): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
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
  const preferredHeight = Math.min(
    PANEL_PREFERRED_HEIGHT,
    Math.max(0, bounds.bottom - bounds.top) * 0.9,
  );
  const spaceBelow = bounds.bottom - rect.bottom;
  const spaceAbove = rect.top - bounds.top;
  const openBelow = spaceBelow >= preferredHeight || spaceBelow >= spaceAbove;
  const placement: PanelPlacement = openBelow ? 'below' : 'above';
  const availableSpace = (openBelow ? spaceBelow : spaceAbove) - PANEL_GAP;
  const maxHeight = Math.max(SEARCH_HEADER_HEIGHT + 80, Math.min(preferredHeight, availableSpace));
  const listMaxHeight = Math.max(80, maxHeight - SEARCH_HEADER_HEIGHT);
  const availableWidth = Math.max(0, bounds.right - bounds.left);
  const width = Math.min(Math.max(rect.width, 220), availableWidth);
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

function normalizeQuery(value: string): string {
  return value.trim().normalize('NFC').toLocaleLowerCase();
}

const HANGUL_S_BASE = 0xac00;
const HANGUL_V_COUNT = 21;
const HANGUL_T_COUNT = 28;
const HANGUL_N_COUNT = HANGUL_V_COUNT * HANGUL_T_COUNT;

const COMPAT_CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const COMPAT_JUNGSEONG = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
] as const;

const COMPAT_JONGSEONG = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄱㅅ',
  'ㄴ',
  'ㄴㅈ',
  'ㄴㅎ',
  'ㄷ',
  'ㄹ',
  'ㄹㄱ',
  'ㄹㅁ',
  'ㄹㅂ',
  'ㄹㅅ',
  'ㄹㅌ',
  'ㄹㅍ',
  'ㄹㅎ',
  'ㅁ',
  'ㅂ',
  'ㅂㅅ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const EXPAND_COMPAT_JAMO: Record<string, string> = {
  ㄳ: 'ㄱㅅ',
  ㄵ: 'ㄴㅈ',
  ㄶ: 'ㄴㅎ',
  ㄺ: 'ㄹㄱ',
  ㄻ: 'ㄹㅁ',
  ㄼ: 'ㄹㅂ',
  ㄽ: 'ㄹㅅ',
  ㄾ: 'ㄹㅌ',
  ㄿ: 'ㄹㅍ',
  ㅀ: 'ㄹㅎ',
  ㅄ: 'ㅂㅅ',
};

function toHangulJamo(value: string): string {
  let out = '';
  for (const char of value.normalize('NFC')) {
    const code = char.codePointAt(0);
    if (code == null) continue;

    if (code >= HANGUL_S_BASE && code < HANGUL_S_BASE + 19 * HANGUL_N_COUNT) {
      const sIndex = code - HANGUL_S_BASE;
      const lIndex = Math.floor(sIndex / HANGUL_N_COUNT);
      const vIndex = Math.floor((sIndex % HANGUL_N_COUNT) / HANGUL_T_COUNT);
      const tIndex = sIndex % HANGUL_T_COUNT;
      out += COMPAT_CHOSEONG[lIndex];
      out += COMPAT_JUNGSEONG[vIndex];
      if (tIndex > 0) out += COMPAT_JONGSEONG[tIndex];
      continue;
    }

    if (code >= 0x1100 && code <= 0x1112) {
      out += COMPAT_CHOSEONG[code - 0x1100];
      continue;
    }
    if (code >= 0x1161 && code <= 0x1175) {
      out += COMPAT_JUNGSEONG[code - 0x1161];
      continue;
    }
    if (code >= 0x11a8 && code <= 0x11c2) {
      out += COMPAT_JONGSEONG[code - 0x11a7];
      continue;
    }

    if (code >= 0x3131 && code <= 0x318e) {
      out += EXPAND_COMPAT_JAMO[char] ?? char;
      continue;
    }

    out += char;
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesEnglishWordStart(haystack: string, needle: string): boolean {
  if (!needle) return true;
  const pattern = new RegExp(`(?:^|[\\s\\-(/[])${escapeRegExp(needle)}`, 'i');
  return pattern.test(haystack);
}

function hasHangul(value: string): boolean {
  return /[\u1100-\u11FF\u3131-\u318E\uAC00-\uD7A3]/.test(value);
}

type CountryMatchKind = 'none' | 'prefix' | 'other';

function countryMatchKind(option: CountryOption, query: string): CountryMatchKind {
  if (!query) return 'prefix';

  let matched = false;
  let prefix = false;
  const nameJamo = toHangulJamo(option.name);
  const queryJamo = toHangulJamo(query);

  if (hasHangul(query) || queryJamo !== query) {
    if (nameJamo.includes(queryJamo)) {
      matched = true;
      if (nameJamo.startsWith(queryJamo)) prefix = true;
    }
  }

  const en = option.en.toLocaleLowerCase();
  if (matchesEnglishWordStart(en, query)) {
    matched = true;
    if (en.startsWith(query)) prefix = true;
  }

  const code = option.code.toLocaleLowerCase();
  if (code.startsWith(query)) {
    matched = true;
    if (code === query) prefix = true;
  }

  if (!matched) return 'none';
  return prefix ? 'prefix' : 'other';
}

function matchesCountry(option: CountryOption, query: string): boolean {
  return countryMatchKind(option, query) !== 'none';
}

function compareCountryOptions(
  a: CountryOption,
  b: CountryOption,
  usageCounts?: Record<string, number>,
): number {
  if (a.name === '기타' && b.name !== '기타') return 1;
  if (b.name === '기타' && a.name !== '기타') return -1;
  const countA = usageCounts?.[a.name] ?? 0;
  const countB = usageCounts?.[b.name] ?? 0;
  if (countA !== countB) return countB - countA;
  return a.name.localeCompare(b.name, 'ko');
}

function sortCountryOptions(
  options: readonly CountryOption[],
  usageCounts?: Record<string, number>,
  query = '',
): CountryOption[] {
  const normalized = normalizeQuery(query);
  return [...options].sort((a, b) => {
    if (normalized) {
      const kindA = countryMatchKind(a, normalized);
      const kindB = countryMatchKind(b, normalized);
      const rank = (kind: CountryMatchKind) => (kind === 'prefix' ? 0 : kind === 'other' ? 1 : 2);
      const rankDiff = rank(kindA) - rank(kindB);
      if (rankDiff !== 0) return rankDiff;
    }
    return compareCountryOptions(a, b, usageCounts);
  });
}

export function CountryComboSelect({
  value,
  onChange,
  usageCounts,
  disabled = false,
  placeholder = '국가 선택',
  emptyOptionLabel = '선택',
  allowEmpty = true,
  className = '',
  'aria-label': ariaLabel,
}: CountryComboSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const knownNames = useMemo(
    () => new Set(countryOptions.map((option) => option.name)),
    [],
  );
  const selectedOption = useMemo(
    () => countryOptions.find((option) => option.name === value) ?? null,
    [value],
  );
  const isLegacyValue = Boolean(value.trim()) && !knownNames.has(value);

  const filteredOptions = useMemo(() => {
    const query = normalizeQuery(search);
    const matched = countryOptions.filter((option) => matchesCountry(option, query));
    return sortCountryOptions(matched, usageCounts, query);
  }, [search, usageCounts]);

  const selectableRows = useMemo(() => {
    const rows: { key: string; label: string; value: string }[] = [];
    if (allowEmpty) {
      rows.push({ key: '__empty', label: emptyOptionLabel, value: '' });
    }
    if (isLegacyValue) {
      rows.push({
        key: `__legacy:${value}`,
        label: `${value} (기존 값)`,
        value,
      });
    }
    for (const option of filteredOptions) {
      rows.push({
        key: option.code,
        label: `${option.flag} ${option.name}`,
        value: option.name,
      });
    }
    return rows;
  }, [allowEmpty, emptyOptionLabel, filteredOptions, isLegacyValue, value]);

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
    if (!open) return;
    setSearch('');
    setHighlightIndex(0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, search, updatePanelPosition]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

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

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const moveHighlight = (delta: number) => {
    if (selectableRows.length === 0) return;
    setHighlightIndex((prev) => {
      const next = (prev + delta + selectableRows.length) % selectableRows.length;
      return next;
    });
  };

  const triggerLabel = selectedOption
    ? `${selectedOption.flag} ${selectedOption.name}`
    : isLegacyValue
      ? `${value} (기존 값)`
      : placeholder;

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
              placeholder="한글·영문 검색"
              className="input-apple h-[36px] w-full py-1.5 pl-8 pr-2.5 text-sm"
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveHighlight(1);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  moveHighlight(-1);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const row = selectableRows[highlightIndex];
                  if (row) handleSelect(row.value);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setOpen(false);
                }
              }}
            />
          </div>
        </div>
        <div
          className="overflow-y-auto overscroll-y-contain p-2"
          style={{ maxHeight: panelPosition.listMaxHeight }}
        >
          {selectableRows.length === 0 ? (
            <p className="px-3 py-2 text-sm opacity-60">검색 결과 없음</p>
          ) : (
            selectableRows.map((row, index) => (
              <button
                key={row.key}
                type="button"
                role="option"
                aria-selected={value === row.value}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors"
                style={{
                  background:
                    index === highlightIndex || value === row.value
                      ? 'var(--badge-bg)'
                      : 'transparent',
                  color: 'var(--foreground)',
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => handleSelect(row.value)}
              >
                {row.label}
              </button>
            ))
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className="select-apple flex h-[42px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span className={`min-w-0 truncate ${value ? '' : 'opacity-60'}`}>{triggerLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" strokeWidth={2} />
      </button>
      {open && panelContent ? createPortal(panelContent, document.body) : null}
    </div>
  );
}

export function albumCountryUsageCounts(
  albums: readonly { country?: string | null }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const album of albums) {
    const name = album.country?.trim();
    if (!name) continue;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

export function usedCountryNames(
  values: readonly (string | null | undefined)[],
): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const name = value?.trim();
    if (name) set.add(name);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
}
