'use client';

import { useEffect, useState, type ReactNode, type SVGProps } from 'react';
import { Music } from 'lucide-react';
import type { ArtistRecord } from '../types';

export type ArtistLinksPatch = {
  apple_music_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
};

type LinkKey = keyof ArtistLinksPatch;

type LinkIconProps = SVGProps<SVGSVGElement>;

function YoutubeIcon({ className, ...props }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden {...props}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-4 items-center justify-center rounded-full bg-[#1DB954] text-[9px] font-bold leading-none text-white ${className ?? ''}`}
      aria-hidden
    >
      S
    </span>
  );
}

function TwitterIcon({ className, ...props }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden {...props}>
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.7l-5.2-6.8L5.2 22H2l7.3-8.4L.8 2h6.9l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.1 3.9H5.3L17.7 20Z" />
    </svg>
  );
}

function InstagramIcon({ className, ...props }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden {...props}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5ZM17.8 6.7a1.3 1.3 0 1 1-1.3 1.3 1.3 1.3 0 0 1 1.3-1.3Z" />
    </svg>
  );
}

const LINK_ITEMS: {
  key: LinkKey;
  label: string;
  Icon: typeof YoutubeIcon | typeof SpotifyIcon | typeof Music;
}[] = [
  { key: 'youtube_url', label: 'YouTube', Icon: YoutubeIcon },
  { key: 'spotify_url', label: 'Spotify', Icon: SpotifyIcon },
  { key: 'apple_music_url', label: 'Apple Music', Icon: Music },
  { key: 'twitter_url', label: 'Twitter', Icon: TwitterIcon },
  { key: 'instagram_url', label: 'Instagram', Icon: InstagramIcon },
];

type ArtistExternalLinksSectionProps = {
  children?: ReactNode;
  artistRecord: ArtistRecord | null;
  linksSaving: boolean;
  editing: boolean;
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
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-[filter,background-color] hover:brightness-110';

export function ArtistExternalLinksSection({
  children,
  artistRecord,
  linksSaving,
  editing,
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

  if (!children && !editing && !showLinkIcons) {
    return null;
  }

  return (
    <div className="mt-2">
      {children || showLinkIcons ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {children ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-80">{children}</div>
          ) : (
            <div />
          )}
          {showLinkIcons ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {registered.map(({ key, label, Icon }) => {
                const href = saved[key];
                if (!href) return null;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkIconButtonClassName}
                    style={{ background: 'var(--surface-elevated)' }}
                    title={label}
                    aria-label={label}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  </a>
                );
              })}
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
