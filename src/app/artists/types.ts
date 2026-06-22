import type { Album } from '@/app/albums/types';

export interface ArtistRecord {
  id: string;
  artist_name: string;
  bio: string | null;
  profile_image_url: string | null;
  apple_music_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  created_at?: string;
}

export interface ArtistSummary {
  name: string;
  albumCount: number;
  country: string | null;
  artistType: string | null;
  genres: string[];
  albums: Album[];
}

export type ArtistMobileTab = 'list' | 'detail';

export type ArtistStats = {
  totalAlbums: number;
  totalListenCount: number;
  latestListenedAt: string | null;
};

export type RelatedArtist = {
  name: string;
  albumCount: number;
  country: string | null;
  artistType: string | null;
  profileImageUrl: string | null;
};

export type ListenHistoryEntry = {
  count: number;
  latestListenedAt: string;
};
