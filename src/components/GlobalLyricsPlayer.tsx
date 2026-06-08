'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useLyricsPlayer } from '@/contexts/LyricsPlayerContext';
import { LyricsPlayerBar } from '@/app/lyrics/_components/LyricsPlayerBar';
import { useAuthState } from '@/hooks/useAuthState';
import { toggleLyricsFavorite } from '@/app/lyrics/actions';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { Lyrics } from '@/app/lyrics/types';

export function GlobalLyricsPlayer() {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const {
    playingTrack,
    orderedTracks,
    favoriteDrawerTracks,
    playFavoriteFromDrawer,
    changeTrack,
    stopPlayback,
    patchTrackFavorite,
  } = useLyricsPlayer();
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [drawerUnfavoriteBusyId, setDrawerUnfavoriteBusyId] = useState<number | null>(null);

  if (!playingTrack) return null;

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast.error('로그인 후 이용할 수 있습니다.');
      return;
    }
    const next = !(playingTrack.is_favorite ?? false);
    setFavoriteBusy(true);
    try {
      await toggleLyricsFavorite(playingTrack.id, next);
      patchTrackFavorite(playingTrack.id, next);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lyrics-favorite-updated', { detail: { id: playingTrack.id, isFavorite: next } }),
        );
      }
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const tryPlayFavoriteFromDrawer = (t: Lyrics) => {
    const ok = playFavoriteFromDrawer(t);
    if (!ok) {
      toast.error('재생할 오디오 URL이 없습니다.');
    }
    return ok;
  };

  const handleUnfavoriteFromDrawer = async (t: Lyrics) => {
    if (!isAuthenticated) {
      toast.error('로그인 후 이용할 수 있습니다.');
      return;
    }
    setDrawerUnfavoriteBusyId(t.id);
    try {
      await toggleLyricsFavorite(t.id, false);
      patchTrackFavorite(t.id, false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lyrics-favorite-updated', { detail: { id: t.id, isFavorite: false } }),
        );
      }
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setDrawerUnfavoriteBusyId(null);
    }
  };

  return (
    <LyricsPlayerBar
      track={playingTrack}
      orderedTracks={orderedTracks}
      favoriteDrawerTracks={favoriteDrawerTracks}
      tryPlayFavoriteFromDrawer={tryPlayFavoriteFromDrawer}
      onUnfavoriteFromDrawer={isAuthenticated ? handleUnfavoriteFromDrawer : undefined}
      drawerUnfavoriteBusyId={drawerUnfavoriteBusyId}
      onTrackChange={changeTrack}
      onClose={stopPlayback}
      onOpenLyrics={() => router.push(`/lyrics?view=${playingTrack.id}`)}
      onFavoriteToggle={isAuthenticated ? handleFavoriteToggle : undefined}
      favoriteBusy={favoriteBusy}
    />
  );
}
