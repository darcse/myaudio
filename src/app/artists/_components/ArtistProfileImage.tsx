/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { Pencil, UserCircle } from 'lucide-react';

type ArtistProfileImageProps = {
  profileImageUrl: string | null;
  artistName: string;
  isAuthenticated: boolean | null;
  saving: boolean;
  onSave: (profileImageUrl: string | null) => Promise<boolean>;
};

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function ArtistProfileImage({
  profileImageUrl,
  artistName,
  isAuthenticated,
  saving,
  onSave,
}: ArtistProfileImageProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [imageError, setImageError] = useState(false);

  const savedUrl = profileImageUrl?.trim() || null;

  useEffect(() => {
    setEditing(false);
    setDraft(profileImageUrl?.trim() || '');
    setImageError(false);
  }, [profileImageUrl]);

  const showImage = Boolean(savedUrl && !imageError);
  const canEdit = isAuthenticated === true && !editing;

  const handleSave = async () => {
    const ok = await onSave(normalizeUrl(draft));
    if (ok) setEditing(false);
  };

  const imageContent = showImage ? (
    <img
      src={savedUrl!}
      alt={`${artistName} 프로필`}
      className="size-full object-cover"
      onError={() => setImageError(true)}
    />
  ) : (
    <UserCircle className="size-24 opacity-35" strokeWidth={1.25} aria-hidden />
  );

  const imageFrameClassName =
    'relative flex size-[132px] shrink-0 items-center justify-center overflow-hidden rounded-full';
  const imageFrameStyle = {
    background: 'var(--badge-bg)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="shrink-0">
      {canEdit ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={saving}
          className={`group ${imageFrameClassName} transition-opacity disabled:opacity-40`}
          style={imageFrameStyle}
          aria-label="프로필 이미지 편집"
        >
          {imageContent}
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity max-lg:opacity-0 lg:group-hover:opacity-100"
            aria-hidden
          >
            <Pencil className="size-6 text-white" strokeWidth={2} />
          </span>
        </button>
      ) : (
        <div className={imageFrameClassName} style={imageFrameStyle}>
          {imageContent}
        </div>
      )}

      {editing ? (
        <div className="mt-3 w-48 space-y-2 sm:w-56">
          <input
            type="url"
            className="input-apple w-full px-3 py-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="프로필 이미지 URL"
            disabled={saving}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-apple btn-apple-primary px-3 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(savedUrl ?? '');
                setImageError(false);
              }}
              disabled={saving}
              className="btn-apple px-3 py-1.5 text-xs disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
