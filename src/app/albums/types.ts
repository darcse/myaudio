export type AlbumComposerStored = {
  name: string;
  country: string | null;
  era: string | null;
  wiki_url: string | null;
};

export type AlbumComposerFormEntry = {
  name: string;
  country: string;
  era: string;
  wiki_url: string;
};

export type AlbumTrack = {
  disc: number;
  no: number;
  title: string;
  duration_ms: number | null;
};

export interface Album {
  id: number;
  artist: string | null;
  artist_type: string | null;
  country: string | null;
  album_name: string;
  album_type: string | null;
  release_date: string | null;
  year?: string[] | null;
  genre1: string | null;
  genre2: string | null;
  tags?: string[] | null;
  classic_instrument?: string | null;
  composer?: string | null;
  composer_country?: string | null;
  composer_era?: string | null;
  composer_wiki_url?: string | null;
  composers?: AlbumComposerStored[] | null;
  cover_image_url: string | null;
  dominant_colors?: string[] | null;
  matching1: string | null;
  matching2: string | null;
  title_song_url: string | null;
  youtube_playlist_id?: string | null;
  apple_music_url?: string | null;
  tracks?: AlbumTrack[] | null;
  youtube_tracks?: { videoId: string; title: string }[] | null;
  wiki_url?: string | null;
  created_at?: string;
  audio_tags?: string[] | null;
  manual_recommended_headphone_ids?: number[] | null;
  album_intro?: string | null;
  ai_recommended_headphone_ids?: number[] | null;
  ai_recommended_headphone_reason?: string | null;
  mood_names?: string[] | null;
  mood_name?: string | null;
  mood_manually_set?: boolean | null;
  owns_cd?: boolean | null;
  owns_lp?: boolean | null;
  owns_cassette?: boolean | null;
  [key: string]: unknown;
}

export interface AlbumFormData {
  artist: string;
  artist_type: string;
  country: string;
  album_name: string;
  album_type: string;
  year: string[];
  release_date: string;
  genre1: string;
  genre2: string;
  tags: string[];
  classic_instrument: string;
  composer: string;
  composer_country: string;
  composer_era: string;
  composer_wiki_url: string;
  composers: AlbumComposerFormEntry[];
  cover_image_url: string;
  matching1: string;
  matching2: string;
  title_song_url: string;
  youtube_playlist_id?: string;
  apple_music_url?: string;
  tracks: AlbumTrack[];
  wiki_url?: string | null;
  album_intro: string;
  recommended_hp1: string;
  recommended_hp2: string;
  recommended_hp3: string;
  mood_names: string[];
  owns_cd: boolean;
  owns_lp: boolean;
  owns_cassette: boolean;
}

export type SelectedAlbum = Album | { isManual: true };
