'use server';

import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { YoutubeTrack } from '@/lib/youtubeTracks';

export async function saveAlbumYoutubeTracks(albumId: number, tracks: YoutubeTrack[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const supabase = await createClient();
  const { error } = await supabase
    .from('album')
    .update({ youtube_tracks: tracks })
    .eq('id', albumId);
  if (error) throw error;
}
