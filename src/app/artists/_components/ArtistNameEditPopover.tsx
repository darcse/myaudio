'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeArtistNameAlt } from '../utils';

type ArtistNameEditPopoverProps = {
  artistName: string;
  nameAlt: string | null;
  saving: boolean;
  isAuthenticated: boolean | null;
  onSave: (patch: { name: string; nameAlt: string | null }) => Promise<boolean>;
};

const PANEL_GAP = 6;
const VIEWPORT_PADDING = 8;
const NAV_OFFSET = 56;
const PANEL_WIDTH = 288;
const PANEL_ESTIMATED_HEIGHT = 248;

type PanelPosition = {
  left: number;
  top?: number;
  bottom?: number;
};

function computePanelPosition(trigger: HTMLButtonElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const minTop = NAV_OFFSET + VIEWPORT_PADDING;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
  const spaceAbove = rect.top - minTop;
  const openBelow = spaceBelow >= PANEL_ESTIMATED_HEIGHT || spaceBelow >= spaceAbove;
  const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING;
  const left = Math.min(Math.max(VIEWPORT_PADDING, rect.left), Math.max(VIEWPORT_PADDING, maxLeft));

  if (openBelow) {
    return { left, top: rect.bottom + PANEL_GAP };
  }
  return { left, bottom: window.innerHeight - rect.top + PANEL_GAP };
}

export function ArtistNameEditPopover({
  artistName,
  nameAlt,
  saving,
  isAuthenticated,
  onSave,
}: ArtistNameEditPopoverProps) {
  const [open, setOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(artistName);
  const [altDraft, setAltDraft] = useState(nameAlt ?? '');
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPanelPosition(computePanelPosition(triggerRef.current));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [artistName]);

  useEffect(() => {
    if (!open) return;
    setNameDraft(artistName);
    setAltDraft(nameAlt ?? '');
  }, [open, artistName, nameAlt]);

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
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (isAuthenticated !== true) return null;

  const handleSave = async () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      toast.error('이름1을 입력해 주세요.');
      return;
    }
    const ok = await onSave({
      name: trimmedName,
      nameAlt: normalizeArtistNameAlt(altDraft),
    });
    if (ok) setOpen(false);
  };

  const panel =
    open && panelPosition != null ? (
      <div
        ref={panelRef}
        className="fixed z-[120] w-72 rounded-xl border p-3 shadow-lg"
        style={{
          left: panelPosition.left,
          ...(panelPosition.top != null ? { top: panelPosition.top } : { bottom: panelPosition.bottom }),
          borderColor: 'var(--border)',
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold opacity-70">이름1</label>
            <input
              type="text"
              className="input-apple w-full px-3 py-2 text-sm"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold opacity-70">이름2</label>
            <input
              type="text"
              className="input-apple w-full px-3 py-2 text-sm"
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              placeholder="로마자·영문 표기"
              disabled={saving}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-apple btn-apple-primary px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="btn-apple px-4 py-2 text-sm disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next && triggerRef.current) {
              setPanelPosition(computePanelPosition(triggerRef.current));
            }
            return next;
          });
        }}
        disabled={saving}
        className="rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
        title="이름 편집"
        aria-label="이름 편집"
        aria-expanded={open}
      >
        <Pencil className="size-4" strokeWidth={2} />
      </button>
      {open && panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
}
