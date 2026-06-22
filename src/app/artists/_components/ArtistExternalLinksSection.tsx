'use client';

import { useEffect, useState, type ReactNode } from 'react';
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

function AppleMusicIcon({ className }: LinkIconProps) {
  return (
    <svg viewBox="0 0 457.3 512" className={className} fill="white" aria-hidden>
      <path d="M435.3,16.2c-5.7-0.7-11.5,0.2-16.7,2.5L184,124.6v270.4c0,35.9-29.2,65.1-65.1,65.1S54.1,431,54.1,395.1 c0-35.9,29.2-65.1,65.1-65.1c11.9,0,23.3,3.3,33.2,9.5V161.4c0-7.3,5.2-13.6,12.4-14.9L403.4,26.7c7.4-1.3,14.6,3.6,15.9,11 c0.3,1.8,0.4,3.7,0.4,5.5v120.3c0,35.9-29.2,65.1-65.1,65.1c-35.9,0-65.1-29.2-65.1-65.1c0-21.4,10.7-40.4,27-51.6V126.7 l-184.8,84v220.2c0,35.9-29.2,65.1-65.1,65.1S22,431,22,395.1c0-35.9,29.2-65.1,65.1-65.1c11.9,0,23.3,3.3,33.2,9.5V113.9 c0-9.8,7.9-17.8,17.8-17.8l275-125c1.4-0.6,2.8-1.1,4.3-1.4C428.1,17,431.9,17.8,435.3,16.2z" />
    </svg>
  );
}

function SpotifyIcon({ className }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="white" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 11-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.52-.973c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 01.257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.937.937 0 11-.543-1.794c3.532-1.072 9.404-.865 13.115 1.338a.937.937 0 01-.955 1.613z" />
    </svg>
  );
}

function YoutubeIcon({ className }: LinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="white" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

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
              {registered.map(({ key, label, background, Icon }) => {
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
