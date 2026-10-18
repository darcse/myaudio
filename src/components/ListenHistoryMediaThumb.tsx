'use client';

import type { ComponentType } from 'react';
import { AudioLines, CassetteTape, Disc, Disc3, Ellipsis, Headphones } from 'lucide-react';
import { AppleMusicIcon, SpotifyIcon, YoutubeIcon } from '@/components/streamingServiceIcons';

type ThumbIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

type MediaThumbSpec = {
  background: string;
  Icon: ThumbIcon;
  branded?: boolean;
};

const MEDIA_THUMB: Record<string, MediaThumbSpec> = {
  'Apple Music': { background: '#FC3C44', Icon: AppleMusicIcon, branded: true },
  Spotify: { background: '#1DB954', Icon: SpotifyIcon, branded: true },
  'YouTube Music': { background: '#FF0000', Icon: YoutubeIcon, branded: true },
  CD: { background: 'var(--badge-bg)', Icon: Disc },
  LP: { background: 'var(--badge-bg)', Icon: Disc3 },
  Cassette: { background: 'var(--badge-bg)', Icon: CassetteTape },
  FLAC: { background: 'var(--badge-bg)', Icon: AudioLines },
  기타: { background: 'var(--badge-bg)', Icon: Ellipsis },
};

export function ListenHistoryMediaThumb({ media }: { media: string }) {
  const spec = MEDIA_THUMB[media] ?? { background: 'var(--badge-bg)', Icon: Headphones };
  const Icon = spec.Icon;
  return (
    <div
      className="relative size-11 shrink-0 overflow-hidden rounded-md"
      style={{ background: spec.background }}
    >
      <div className={`flex size-full items-center justify-center ${spec.branded ? '' : 'opacity-40'}`}>
        <Icon className="size-4" strokeWidth={1.5} />
      </div>
    </div>
  );
}
