'use client';

import { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [artistName]);

  useEffect(() => {
    if (!open) return;
    setNameDraft(artistName);
    setAltDraft(nameAlt ?? '');
  }, [open, artistName, nameAlt]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
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

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={saving}
        className="rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
        title="이름 편집"
        aria-label="이름 편집"
        aria-expanded={open}
      >
        <Pencil className="size-4" strokeWidth={2} />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-xl border p-3 shadow-lg"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
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
      ) : null}
    </div>
  );
}
