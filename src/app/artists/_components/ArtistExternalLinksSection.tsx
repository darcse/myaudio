'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { AppleMusicIcon, SpotifyIcon, YoutubeIcon } from '@/components/streamingServiceIcons';
import type { ArtistRecord } from '../types';

export type ArtistLinksPatch = {
  apple_music_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
};

type LinkKey = keyof ArtistLinksPatch;

type LinkIconProps = {
  className?: string;
};

function TwitterIcon({ className }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="white" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="white" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

const LINK_ITEMS: {
  key: LinkKey;
  label: string;
  background: string;
  Icon: (props: LinkIconProps) => ReactNode;
}[] = [
  { key: 'apple_music_url', label: 'Apple Music', background: '#FC3C44', Icon: AppleMusicIcon },
  { key: 'spotify_url', label: 'Spotify', background: '#1DB954', Icon: SpotifyIcon },
  { key: 'youtube_url', label: 'YouTube', background: '#FF0000', Icon: YoutubeIcon },
  { key: 'twitter_url', label: 'Twitter', background: '#000000', Icon: TwitterIcon },
  {
    key: 'instagram_url',
    label: 'Instagram',
    background: 'linear-gradient(45deg, #833AB4, #FD1D1D, #F77737)',
    Icon: InstagramIcon,
  },
];

type ArtistExternalLinksSectionProps = {
  children?: ReactNode;
  artistRecord: ArtistRecord | null;
  linksSaving: boolean;
  editing: boolean;
  isAuthenticated: boolean | null;
  metaClassName?: string;
  onEditingChange: (editing: boolean) => void;
  onSaveLinks: (patch: ArtistLinksPatch) => Promise<boolean>;
};

function linksFromRecord(record: ArtistRecord | null): ArtistLinksPatch {
  return {
    apple_music_url: record?.apple_music_url?.trim() || null,
    spotify_url: record?.spotify_url?.trim() || null,
    youtube_url: record?.youtube_url?.trim() || null,
    twitter_url: record?.twitter_url?.trim() || null,
    instagram_url: record?.instagram_url?.trim() || null,
  };
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

const linkIconButtonClassName =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-[filter,background-color] hover:brightness-110';

export function ArtistExternalLinksSection({
  children,
  artistRecord,
  linksSaving,
  editing,
  isAuthenticated,
  metaClassName = 'text-sm opacity-80',
  onEditingChange,
  onSaveLinks,
}: ArtistExternalLinksSectionProps) {
  const [draft, setDraft] = useState<Record<LinkKey, string>>({
    apple_music_url: '',
    spotify_url: '',
    youtube_url: '',
    twitter_url: '',
    instagram_url: '',
  });

  const saved = linksFromRecord(artistRecord);
  const registered = LINK_ITEMS.filter((item) => saved[item.key]);

  useEffect(() => {
    const links = linksFromRecord(artistRecord);
    onEditingChange(false);
    setDraft({
      apple_music_url: links.apple_music_url ?? '',
      spotify_url: links.spotify_url ?? '',
      youtube_url: links.youtube_url ?? '',
      twitter_url: links.twitter_url ?? '',
      instagram_url: links.instagram_url ?? '',
    });
  }, [artistRecord, onEditingChange]);

  const handleSave = async () => {
    const patch: ArtistLinksPatch = {
      apple_music_url: normalizeUrl(draft.apple_music_url),
      spotify_url: normalizeUrl(draft.spotify_url),
      youtube_url: normalizeUrl(draft.youtube_url),
      twitter_url: normalizeUrl(draft.twitter_url),
      instagram_url: normalizeUrl(draft.instagram_url),
    };
    const ok = await onSaveLinks(patch);
    if (ok) onEditingChange(false);
  };

  const showLinkIcons = !editing && registered.length > 0;
  const showLinksToolbar = Boolean(children) || showLinkIcons || isAuthenticated === true;

  if (!showLinksToolbar && !editing) {
    return null;
  }

  return (
    <div>
      {showLinksToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {children ? (
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${metaClassName}`}>{children}</div>
          ) : (
            <div />
          )}
          {!editing && (showLinkIcons || isAuthenticated === true) ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {showLinkIcons
                ? registered.map(({ key, label, background, Icon }) => {
                    const href = saved[key];
                    if (!href) return null;
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkIconButtonClassName}
                        style={{ background }}
                        title={label}
                        aria-label={label}
                      >
                        <Icon className="size-3.5 shrink-0" />
                      </a>
                    );
                  })
                : null}
              {isAuthenticated === true ? (
                <button
                  type="button"
                  onClick={() => onEditingChange(true)}
                  disabled={linksSaving}
                  className="rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-40"
                  title="링크 편집"
                  aria-label="링크 편집"
                >
                  <Pencil className="size-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div className="mt-3 space-y-3">
          {LINK_ITEMS.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-[11px] font-semibold opacity-70">{label}</label>
              <input
                type="url"
                className="input-apple w-full px-3 py-2 text-sm"
                value={draft[key]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={`${label} URL`}
                disabled={linksSaving}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={linksSaving}
              className="btn-apple btn-apple-primary px-4 py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                onEditingChange(false);
                setDraft({
                  apple_music_url: saved.apple_music_url ?? '',
                  spotify_url: saved.spotify_url ?? '',
                  youtube_url: saved.youtube_url ?? '',
                  twitter_url: saved.twitter_url ?? '',
                  instagram_url: saved.instagram_url ?? '',
                });
              }}
              disabled={linksSaving}
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
