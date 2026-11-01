'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { countryOptions } from '../constants';
import {
  buildComposerComboOptions,
  type ComposerComboOption,
} from '../utils';

type ComposerComboSelectProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectOption: (option: ComposerComboOption) => void;
};

const PANEL_GAP = 6;
const VIEWPORT_PADDING = 8;
const PANEL_PREFERRED_HEIGHT = 256;

type PanelPlacement = 'above' | 'below';

type PanelPosition = {
  left: number;
  width: number;
  maxHeight: number;
  placement: PanelPlacement;
  top?: number;
  bottom?: number;
};

function getContainingBounds(trigger: HTMLElement): {
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

function computePanelPosition(trigger: HTMLElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const bounds = getContainingBounds(trigger);
  const preferredHeight = Math.min(PANEL_PREFERRED_HEIGHT, Math.max(0, bounds.bottom - bounds.top) * 0.9);
  const spaceBelow = bounds.bottom - rect.bottom;
  const spaceAbove = rect.top - bounds.top;
  const openBelow = spaceBelow >= preferredHeight || spaceBelow >= spaceAbove;
  const placement: PanelPlacement = openBelow ? 'below' : 'above';
  const availableSpace = (openBelow ? spaceBelow : spaceAbove) - PANEL_GAP;
  const maxHeight = Math.max(80, Math.min(preferredHeight, availableSpace));
  const availableWidth = Math.max(0, bounds.right - bounds.left);
  const width = Math.min(Math.max(rect.width, 0), availableWidth);
  const overflowRight = rect.left + width > bounds.right;
  const left = overflowRight
    ? Math.max(bounds.left, rect.right - width)
    : Math.min(Math.max(bounds.left, rect.left), Math.max(bounds.left, bounds.right - width));

  if (placement === 'below') {
    return { left, width, maxHeight, placement, top: rect.bottom + PANEL_GAP };
  }
  return {
    left,
    width,
    maxHeight,
    placement,
    bottom: window.innerHeight - rect.top + PANEL_GAP,
  };
}

function optionMeta(option: ComposerComboOption): string {
  const country = option.country?.trim() ?? '';
  const era = option.era?.trim() ?? '';
  const countryLabel = country
    ? `${countryOptions.find((item) => item.name === country)?.flag ?? ''} ${country}`.trim()
    : '';
  return [countryLabel, era].filter(Boolean).join(' · ');
}

export function ComposerComboSelect({
  value,
  onChange,
  onSelectOption,
}: ComposerComboSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ComposerComboOption[]>([]);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const updatePanelPosition = useCallback(() => {
    if (!inputRef.current) return;
    setPanelPosition(computePanelPosition(inputRef.current));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void createClient()
      .from('album')
      .select('composer, composer_country, composer_era, composer_wiki_url, created_at')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setOptions([]);
        } else {
          setOptions(buildComposerComboOptions(data ?? []));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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

  const query = value.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter((option) => option.name.toLowerCase().includes(query));
  }, [options, query]);

  const handleSelect = (option: ComposerComboOption) => {
    onSelectOption(option);
    setOpen(false);
  };

  const panelContent =
    open && panelPosition != null ? (
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        className="fixed z-[120] overflow-hidden rounded-xl border shadow-lg"
        style={{
          left: panelPosition.left,
          width: panelPosition.width,
          minWidth: 0,
          maxWidth: '100%',
          maxHeight: panelPosition.maxHeight,
          ...(panelPosition.placement === 'below'
            ? { top: panelPosition.top }
            : { bottom: panelPosition.bottom }),
          borderColor: 'var(--border)',
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="overflow-y-auto overscroll-y-contain p-2" style={{ maxHeight: panelPosition.maxHeight }}>
          {loading ? (
            <p className="px-2 py-4 text-center text-xs opacity-60">작곡가 목록을 불러오는 중...</p>
          ) : options.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs opacity-60">
              등록된 작곡가가 없습니다. 이름을 직접 입력해 주세요.
            </p>
          ) : filteredOptions.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs opacity-60">
              검색 결과가 없습니다. 입력한 이름으로 저장됩니다.
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredOptions.map((option) => {
                const meta = optionMeta(option);
                const selected = value.trim() === option.name;
                return (
                  <button
                    key={option.name}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="flex w-full min-w-0 flex-col items-start rounded-lg px-3 py-2 text-left transition-colors"
                    style={{
                      background: selected ? 'var(--badge-bg)' : 'transparent',
                      color: 'var(--foreground)',
                    }}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="w-full break-words text-sm">{option.name}</span>
                    {meta ? (
                      <span className="mt-0.5 w-full break-words text-[11px] opacity-55">{meta}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="작곡가"
          className="input-apple h-[42px] w-full px-3 py-2 pr-9 text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            setOpen(true);
            if (inputRef.current) setPanelPosition(computePanelPosition(inputRef.current));
          }}
          placeholder="작곡가 검색 또는 직접 입력"
        />
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>
      {open && panelContent && typeof document !== 'undefined'
        ? createPortal(panelContent, document.body)
        : null}
    </div>
  );
}
