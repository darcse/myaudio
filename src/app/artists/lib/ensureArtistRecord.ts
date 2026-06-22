import { createClient } from '@/lib/supabase/client';
import type { ArtistRecord } from '../types';

export async function ensureArtistRecord(artistName: string): Promise<ArtistRecord | null> {
  const trimmed = artistName.trim();
  if (!trimmed) return null;

  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('artists')
    .select('*')
    .eq('artist_name', trimmed)
    .maybeSingle();

  if (fetchError) return null;
  if (existing) return existing as ArtistRecord;

  const { data: created, error: insertError } = await supabase
    .from('artists')
    .insert({ artist_name: trimmed })
    .select('*')
    .single();

  if (insertError) {
    const { data: retry } = await supabase
      .from('artists')
      .select('*')
      .eq('artist_name', trimmed)
      .maybeSingle();
    return retry ? (retry as ArtistRecord) : null;
  }

  return created as ArtistRecord;
}
