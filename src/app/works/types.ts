export interface Lyrics {
  id: number;
  title: string;
  album: string | null;
  genre1: string | null;
  genre2: string | null;
  lyrics: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  youtube_url: string | null;
  created_at?: string;
  vibe_colors?: string[] | null;
  vibe_emoji?: string | null;
  is_favorite?: boolean;
}

export type LyricsFormData = {
  title: string;
  album: string;
  genre1: string;
  genre2: string;
  lyrics: string;
  cover_image_url: string;
  audio_url: string;
  youtube_url: string;
};

export type SelectedLyrics = Lyrics | { isManual: true };

export type LyricsQueueSource = 'album' | 'favorites';
