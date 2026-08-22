ALTER TABLE lyrics_translations
ADD COLUMN IF NOT EXISTS translated_title TEXT NULL;
