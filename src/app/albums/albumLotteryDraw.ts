import { createClient } from '@/lib/supabase/client';
import { getClientErrorMessage } from '@/lib/supabase-error';
import type { Album } from './types';

const SPIN_SELECT = 'id, cover_image_url';

export type AlbumLotterySpinCover = {
  id: number;
  cover_image_url: string | null;
};

export type AlbumLotteryDrawResult =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ok'; winner: Album; spinCovers: AlbumLotterySpinCover[] };

export function albumLotteryCoverAsAlbum(cover: AlbumLotterySpinCover): Album {
  return {
    id: cover.id,
    artist: null,
    artist_type: null,
    country: null,
    album_name: '',
    album_type: null,
    release_date: null,
    genre1: null,
    genre2: null,
    cover_image_url: cover.cover_image_url,
    matching1: null,
    matching2: null,
    title_song_url: null,
  };
}

export async function fetchCatalogAlbumLotteryDraw(): Promise<AlbumLotteryDrawResult> {
  try {
    const supabase = createClient();
    const { count, error: countError } = await supabase
      .from('album')
      .select('id', { count: 'exact', head: true });

    if (countError) return { status: 'error', message: getClientErrorMessage(countError) };
    if (!count || count < 1) return { status: 'empty' };

    const winnerOffset = Math.floor(Math.random() * count);
    const { data: winnerRows, error: winnerError } = await supabase
      .from('album')
      .select('*')
      .order('id', { ascending: true })
      .range(winnerOffset, winnerOffset);

    if (winnerError) return { status: 'error', message: getClientErrorMessage(winnerError) };
    const winner = (winnerRows?.[0] ?? null) as Album | null;
    if (!winner) return { status: 'error', message: '당첨 앨범을 불러오지 못했습니다.' };

    const spinCount = Math.min(count, 20 + Math.floor(Math.random() * 11));
    const spinStart = Math.max(0, Math.floor(Math.random() * Math.max(1, count - spinCount + 1)));
    const spinEnd = spinStart + spinCount - 1;
    const { data: spinRows, error: spinError } = await supabase
      .from('album')
      .select(SPIN_SELECT)
      .order('id', { ascending: true })
      .range(spinStart, spinEnd);

    if (spinError) return { status: 'error', message: getClientErrorMessage(spinError) };

    const spinCovers: AlbumLotterySpinCover[] = (spinRows ?? []).map((row) => ({
      id: Number(row.id),
      cover_image_url: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
    }));

    if (!spinCovers.some((cover) => cover.id === winner.id)) {
      spinCovers.push({ id: winner.id, cover_image_url: winner.cover_image_url });
    }

    return { status: 'ok', winner, spinCovers };
  } catch (error) {
    return { status: 'error', message: getClientErrorMessage(error) };
  }
}
