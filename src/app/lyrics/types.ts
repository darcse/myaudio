export type TranslatedLine = {
  original: string;
  phonetic?: string;
  translation: string;
};

export type LyricsTranslationTrack = {
  id: string;
  user_id: string;
  album_id: number;
  track_number: number;
  track_title: string;
  created_at?: string;
};

export type LyricsTranslation = {
  id: string;
  user_id: string;
  track_id: string;
  lyrics_text: string;
  youtube_url: string | null;
  translated_lines: TranslatedLine[];
  language?: string | null;
  created_at?: string;
};

export type LyricsAlbumCard = {
  albumId: number;
  albumName: string;
  artist: string | null;
  country: string | null;
  coverImageUrl: string | null;
  releaseDate: string | null;
  genre1: string | null;
  trackCount: number;
  translatedCount: number;
};

export type TrackWithTranslation = LyricsTranslationTrack & {
  translation: LyricsTranslation | null;
};
