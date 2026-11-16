'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  ARTIST_TYPE_OPTIONS,
  COMPOSER_ERA_OPTIONS,
  countryOptions,
} from '@/app/albums/constants';
import {
  buildProfileFieldsPatchDiff,
  type ArtistProfileFieldsPatch,
} from '../lib/updateArtistProfileFields';
import type { ArtistLibraryRole } from '../types';
import { isSameArtistName, normalizeArtistNameAlt } from '../utils';

export type ArtistSaveOptions = {
  silentSuccess?: boolean;
};

type ArtistInfoEditModalProps = {
  role: ArtistLibraryRole;
  albumCount: number;
  artistName: string;
  nameAlt: string | null;
  country: string | null;
  wikiUrl: string | null;
  artistType?: string | null;
  era?: string | null;
  saving: boolean;
  isAuthenticated: boolean | null;
  onSaveNames: (
    patch: { name: string; nameAlt: string | null },
    options?: ArtistSaveOptions,
  ) => Promise<boolean>;
  onSaveProfileFields: (
    patch: ArtistProfileFieldsPatch,
    options?: ArtistSaveOptions,
  ) => Promise<boolean>;
};

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function ArtistInfoEditModal({
  role,
  albumCount,
  artistName,
  nameAlt,
  country,
  wikiUrl,
  artistType = null,
  era = null,
  saving,
  isAuthenticated,
  onSaveNames,
  onSaveProfileFields,
}: ArtistInfoEditModalProps) {
  const [open, setOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(artistName);
  const [altDraft, setAltDraft] = useState(nameAlt ?? '');
  const [countryDraft, setCountryDraft] = useState(country ?? '');
  const [wikiDraft, setWikiDraft] = useState(wikiUrl ?? '');
  const [artistTypeDraft, setArtistTypeDraft] = useState(artistType ?? '');
  const [eraDraft, setEraDraft] = useState(era ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [role, artistName]);

  useEffect(() => {
    if (!open) return;
    setNameDraft(artistName);
    setAltDraft(nameAlt ?? '');
    setCountryDraft(country ?? '');
    setWikiDraft(wikiUrl ?? '');
    setArtistTypeDraft(artistType ?? '');
    setEraDraft(era ?? '');
  }, [open, artistName, nameAlt, country, wikiUrl, artistType, era]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving && !submitting) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, submitting]);

  if (isAuthenticated !== true) return null;

  const busy = saving || submitting;
  const roleLabel = role === 'composer' ? '작곡가' : '아티스트';
  const crossRoleLabel = role === 'composer' ? '아티스트' : '작곡가';

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
  };

  const handleSave = async () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      toast.error('이름1을 입력해 주세요.');
      return;
    }

    const nextAlt = normalizeArtistNameAlt(altDraft);
    const nameChanged =
      !isSameArtistName(trimmedName, artistName) ||
      (nextAlt ?? null) !== (normalizeArtistNameAlt(nameAlt) ?? null);
    const profilePatch = buildProfileFieldsPatchDiff({
      role,
      current: {
        country,
        wikiUrl,
        artistType,
        era,
      },
      next: {
        country: toNullable(countryDraft),
        wikiUrl: toNullable(wikiDraft),
        artistType: toNullable(artistTypeDraft),
        era: toNullable(eraDraft),
      },
    });
    const profileChanged = Object.keys(profilePatch).length > 0;

    if (!nameChanged && !profileChanged) {
      toast.success('변경된 항목이 없습니다.');
      setOpen(false);
      return;
    }

    setSubmitting(true);
    try {
      if (profileChanged) {
        const profileOk = await onSaveProfileFields(profilePatch, { silentSuccess: true });
        if (!profileOk) return;

        if (nameChanged) {
          const nameOk = await onSaveNames(
            { name: trimmedName, nameAlt: nextAlt },
            { silentSuccess: true },
          );
          if (!nameOk) {
            toast.error(
              '부가 정보는 저장됐지만 이름 저장에 실패했습니다. 다시 저장하면 맞춰집니다.',
            );
            return;
          }
          toast.success('정보를 저장했습니다.');
          setOpen(false);
          return;
        }

        toast.success('부가 정보를 저장했습니다.');
        setOpen(false);
        return;
      }

      const nameOk = await onSaveNames(
        { name: trimmedName, nameAlt: nextAlt },
        { silentSuccess: true },
      );
      if (!nameOk) return;
      toast.success('아티스트 이름을 저장했습니다.');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const modal =
    open && typeof document !== 'undefined' ? (
      <div
        className="modal-overlay-apple fixed inset-0 z-[120] flex items-center justify-center p-4"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) handleClose();
        }}
      >
        <div
          className="modal-panel-apple relative flex max-h-[min(40rem,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden"
          onPointerDown={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="정보 편집"
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold">정보 편집</h3>
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="flex size-8 items-center justify-center rounded-full text-lg font-semibold opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold opacity-70">이름1</label>
              <input
                type="text"
                className="input-apple w-full px-3 py-2 text-sm"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                disabled={busy}
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
                disabled={busy}
              />
            </div>
            {role === 'artist' ? (
              <div>
                <label className="mb-1 block text-[11px] font-semibold opacity-70">아티스트 구분</label>
                <select
                  className="select-apple h-[38px] w-full px-3 text-sm"
                  value={artistTypeDraft}
                  onChange={(e) => setArtistTypeDraft(e.target.value)}
                  disabled={busy}
                >
                  <option value="">선택</option>
                  {ARTIST_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {artistTypeDraft &&
                  !(ARTIST_TYPE_OPTIONS as readonly string[]).includes(artistTypeDraft) ? (
                    <option value={artistTypeDraft}>{artistTypeDraft}</option>
                  ) : null}
                </select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-[11px] font-semibold opacity-70">국적</label>
              <select
                className="select-apple h-[38px] w-full px-3 text-sm"
                value={countryDraft}
                onChange={(e) => setCountryDraft(e.target.value)}
                disabled={busy}
              >
                <option value="">선택</option>
                {countryOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.flag} {option.name}
                  </option>
                ))}
              </select>
            </div>
            {role === 'composer' ? (
              <div>
                <label className="mb-1 block text-[11px] font-semibold opacity-70">시대</label>
                <select
                  className="select-apple h-[38px] w-full px-3 text-sm"
                  value={eraDraft}
                  onChange={(e) => setEraDraft(e.target.value)}
                  disabled={busy}
                >
                  <option value="">선택</option>
                  {COMPOSER_ERA_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {eraDraft && !(COMPOSER_ERA_OPTIONS as readonly string[]).includes(eraDraft) ? (
                    <option value={eraDraft}>{eraDraft}</option>
                  ) : null}
                </select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-[11px] font-semibold opacity-70">위키 URL</label>
              <input
                type="url"
                className="input-apple w-full px-3 py-2 text-sm"
                value={wikiDraft}
                onChange={(e) => setWikiDraft(e.target.value)}
                placeholder="https://..."
                disabled={busy}
              />
            </div>
            <p className="text-[11px] leading-relaxed opacity-70">
              이 {roleLabel}의 앨범 {albumCount}장에 일괄 반영됩니다. 같은 이름 {crossRoleLabel} 앨범에도
              국적·위키가 함께 반영됩니다. 이름을 바꾸면 앨범의 연주자·작곡가 이름도 함께 바뀝니다.
            </p>
          </div>
          <div
            className="flex gap-2 border-t px-4 py-3 sm:px-5"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="btn-apple btn-apple-primary px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="btn-apple px-4 py-2 text-sm disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
        title="정보 편집"
        aria-label="정보 편집"
        aria-expanded={open}
      >
        <Pencil className="size-4" strokeWidth={2} />
      </button>
      {modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
