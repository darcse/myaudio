'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { getYoutubeId } from '@/app/albums/utils';
import { deleteLyricsTranslation } from '../actions';
import { groupTranslatedLinesByParagraph } from '../lib/group-lyrics-paragraphs';
import type { LyricsTranslation, LyricsTranslationTrack, TranslatedLine } from '../types';

export function LyricsViewContent({
  albumId,
  trackId,
}: {
  albumId: number;
  trackId: string;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthState();
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<LyricsTranslationTrack | null>(null);
  const [translation, setTranslation] = useState<LyricsTranslation | null>(null);
  const [albumName, setAlbumName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const client = createClient();
        const [{ data: trackRow, error: trackError }, { data: trRow, error: trError }] =
          await Promise.all([
            client.from('lyrics_translation_tracks').select('*').eq('id', trackId).maybeSingle(),
            client.from('lyrics_translations').select('*').eq('track_id', trackId).maybeSingle(),
          ]);
        if (trackError) throw trackError;
        if (trError) throw trError;
        if (!trackRow || trackRow.album_id !== albumId) {
          toast.error('트랙을 찾을 수 없습니다.');
          router.push(`/lyrics/${albumId}`);
          return;
        }
        if (!trRow) {
          router.replace(`/lyrics/${albumId}/${trackId}/edit`);
          return;
        }
        const { data: album } = await client
          .from('album')
          .select('album_name')
          .eq('id', albumId)
          .maybeSingle();
        if (!cancelled) {
          setTrack(trackRow as LyricsTranslationTrack);
          setTranslation(trRow as LyricsTranslation);
          setAlbumName(album?.album_name ?? '');
        }
      } catch (e) {
        toast.error(getClientErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [albumId, trackId, router]);

  const handleDelete = async () => {
    if (!translation || isAuthenticated === false) return;
    if (!window.confirm('이 가사를 삭제할까요?')) return;
    setDeleting(true);
    try {
      await deleteLyricsTranslation(translation.id);
      toast.success('삭제했습니다.');
      router.push(`/lyrics/${albumId}`);
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const paragraphs = useMemo(
    () =>
      groupTranslatedLinesByParagraph(
        translation?.lyrics_text ?? '',
        (translation?.translated_lines ?? []) as TranslatedLine[],
      ),
    [translation?.lyrics_text, translation?.translated_lines],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="size-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
        />
      </div>
    );
  }

  if (!track || !translation) return null;

  const ytId = translation.youtube_url ? getYoutubeId(translation.youtube_url) : null;

  return (
    <div className="relative mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/lyrics/${albumId}`}
            className="flex size-[38px] shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            aria-label="트랙리스트로"
          >
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold opacity-75 sm:text-base">{albumName}</p>
          </div>
        </div>
        {isAuthenticated ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={`/lyrics/${albumId}/${trackId}/edit`}
              className="inline-flex size-[38px] items-center justify-center rounded-lg"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
              aria-label="수정"
            >
              <Pencil className="size-4" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="inline-flex size-[38px] items-center justify-center rounded-lg disabled:opacity-40"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
              aria-label="삭제"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="mb-6 rounded-xl px-4 py-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
      >
        <p className="text-lg font-bold leading-snug sm:text-xl">{track.track_title}</p>
        {translation.translated_title?.trim() &&
        translation.translated_title.trim() !== track.track_title.trim() ? (
          <p className="mt-1.5 text-base leading-snug opacity-85">{translation.translated_title.trim()}</p>
        ) : null}
      </div>

      {ytId ? (
        <div className="mb-6 overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <div className="relative aspect-video w-full bg-black">
            <iframe
              title="YouTube"
              src={`https://www.youtube.com/embed/${ytId}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <div
            key={paragraphIndex}
            className="rounded-xl px-4 py-3"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          >
            {paragraph.map((line, lineIndex) => (
              <div key={lineIndex} className={lineIndex > 0 ? 'mt-4' : undefined}>
                <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{line.original}</p>
                {line.phonetic ? (
                  <p className="mt-1 text-sm leading-relaxed opacity-70 whitespace-pre-wrap">{line.phonetic}</p>
                ) : null}
                {line.translation ? (
                  <p className="mt-1 text-sm leading-relaxed opacity-90 whitespace-pre-wrap">{line.translation}</p>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
