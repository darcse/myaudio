'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { getClientErrorMessage } from '@/lib/supabase-error';
import { saveLyricsTranslation } from '../actions';
import type { LyricsTranslation, LyricsTranslationTrack, TranslatedLine } from '../types';

export function LyricsEditContent({
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
  const [existing, setExisting] = useState<LyricsTranslation | null>(null);
  const [lyricsText, setLyricsText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [previewLines, setPreviewLines] = useState<TranslatedLine[] | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

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
        if (!cancelled) {
          setTrack(trackRow as LyricsTranslationTrack);
          if (trRow) {
            const tr = trRow as LyricsTranslation;
            setExisting(tr);
            setYoutubeUrl(tr.youtube_url ?? '');
            setPreviewLines(tr.translated_lines ?? []);
            setLanguage(tr.language ?? null);
            setLyricsText(
              (tr.lyrics_text?.trim()
                ? tr.lyrics_text
                : (tr.translated_lines ?? []).map((l) => l.original).join('\n')) ?? '',
            );
          }
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

  const handleTranslate = async () => {
    if (!lyricsText.trim()) {
      toast.error('가사 텍스트는 필수입니다.');
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch('/api/lyrics-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyricsText }),
      });
      const json = (await res.json()) as {
        lines?: TranslatedLine[];
        language?: string | null;
        error?: string;
      };
      if (!res.ok || !json.lines) {
        throw new Error(json.error || '번역에 실패했습니다.');
      }
      setPreviewLines(json.lines);
      setLanguage(json.language ?? null);
      toast.success('번역 미리보기를 생성했습니다.');
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    if (isAuthenticated === false) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!lyricsText.trim()) {
      toast.error('가사 텍스트는 필수입니다.');
      return;
    }
    const lines =
      previewLines && previewLines.length > 0
        ? previewLines
        : lyricsText.split('\n').map((original) => ({
            original,
            translation: '',
          }));
    if (!lines.some((l) => l.original.trim())) {
      toast.error('가사 텍스트는 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      await saveLyricsTranslation({
        trackId,
        youtubeUrl,
        lyricsText,
        translatedLines: lines,
        language,
        translationId: existing?.id ?? null,
      });
      toast.success('저장했습니다.');
      router.push(`/lyrics/${albumId}/${trackId}`);
    } catch (e) {
      toast.error(getClientErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

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

  if (!track) return null;

  return (
    <div className="relative mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-5 flex items-center gap-2">
        <Link
          href={`/lyrics/${albumId}`}
          className="flex size-[38px] shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          aria-label="뒤로"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{existing ? '가사 수정' : '가사 등록'}</h1>
          <p className="truncate text-sm opacity-65">{track.track_title}</p>
        </div>
      </div>

      <label className="mb-1 block text-sm font-semibold opacity-90">가사 텍스트</label>
      <textarea
        className="input-apple mb-4 min-h-[220px] w-full resize-y p-3 text-sm leading-relaxed"
        value={lyricsText}
        onChange={(e) => {
          setLyricsText(e.target.value);
          setPreviewLines(null);
        }}
        placeholder="가사 원문을 붙여넣으세요. AI는 이 텍스트만 번역합니다."
      />

      <label className="mb-1 block text-sm font-semibold opacity-90">유튜브 URL (선택)</label>
      <input
        className="input-apple mb-4 h-[42px] w-full px-3 text-sm"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={translating || isAuthenticated === false}
          onClick={() => void handleTranslate()}
          className="btn-apple inline-flex h-[42px] items-center gap-2 px-4 text-sm font-semibold disabled:opacity-40"
        >
          {translating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          AI 번역
        </button>
        <button
          type="button"
          disabled={saving || isAuthenticated === false}
          onClick={() => void handleSave()}
          className="btn-apple btn-apple-secondary h-[42px] px-4 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {previewLines ? (
        <div>
          <p className="mb-3 text-sm font-semibold">미리보기</p>
          <div className="space-y-3">
            {previewLines.map((line, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
              >
                {line.original.trim() === '' && !line.translation?.trim() ? (
                  <div className="h-2" />
                ) : (
                  <>
                    <p className="text-[15px] font-medium whitespace-pre-wrap">{line.original}</p>
                    {line.phonetic ? (
                      <p className="mt-1 text-sm opacity-70 whitespace-pre-wrap">{line.phonetic}</p>
                    ) : null}
                    <p className="mt-1 text-sm opacity-90 whitespace-pre-wrap">{line.translation}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
