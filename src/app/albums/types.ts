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
  cover_image_url: string | null;
  matching1: string | null;
  matching2: string | null;
  title_song_url: string | null;
  wiki_url?: string | null;
  created_at?: string;
  audio_tags?: string[] | null;
  manual_recommended_headphone_ids?: number[] | null;
  album_intro?: string | null;
  ai_recommended_headphone_ids?: number[] | null;
  ai_recommended_headphone_reason?: string | null;
  mood_names?: string[] | null;
  mood_name?: string | null;
  [key: string]: unknown;
}

export interface MusicBrainzSearchItem {
  mbid?: string;
  album_name?: string;
  artist?: string;
  album_type?: string;
  release_date?: string;
  cover_image_url?: string;
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
  cover_image_url: string;
  matching1: string;
  matching2: string;
  title_song_url: string;
  wiki_url?: string | null;
  album_intro: string;
  recommended_hp1: string;
  recommended_hp2: string;
  recommended_hp3: string;
  mood_names: string[];
}

export type SelectedAlbum = Album | MusicBrainzSearchItem | { isManual: true };
