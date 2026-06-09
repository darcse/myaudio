/* eslint-disable @next/next/no-img-element */
'use client';

import type { CSSProperties } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ChevronDown, Disc3, Headphones, Music, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DeletingLabel } from '@/components/AsyncMutationUi';
import { countryOptions } from '../constants';
import { getYoutubeId } from '../utils';
import { getMoodGradientPair, hexToRgba, getMoodVibeGradient } from '../moodGradient';
import type { Album } from '../types';

type ListenHistoryRow = {
  id: number;
  listened_at: string;
  impression: string | null;
};

interface AlbumDetailModalProps {
  viewingItem: Album;
  recommendedHeadphones: { id: number; brand: string; model: string }[];
  albumIntro: string;
  audioTags: string[];
  albumIntroLoading: boolean;
  onRefreshAlbumIntro: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAuthenticated: boolean | null;
  isDeleting?: boolean;
  onNavigateToMood?: (moodName: string) => void;
}

function audioTagSurfaceFromMood(moodName: string | null | undefined): CSSProperties {
  const pair = getMoodGradientPair(typeof moodName === 'string' ? moodName : '');
  return {
    background: `linear-gradient(135deg, ${hexToRgba(pair.a, 0.22)}, ${hexToRgba(pair.b, 0.22)})`,
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

const MOOD_VIBE_EMOJIS = ['🤘', '🌙', '⚡', '🎷', '🍃', '✨', '🔷', '🎻', '🎤'];

const MOOD_KEYWORD_SLOTS: { keys: string[]; slot: number }[] = [
  { keys: ['메탈', 'metal', '둠', 'doom', '데스', 'death', '블랙', 'black', '스래시', 'thrash', '헤비', '냉소', '다크', 'dark', 'cold'], slot: 0 },
  { keys: ['슈게', 'shoegaze', '몽환', 'dream', '탐미', 'ambient', '앰비', 'ethereal', '노이즈', 'noise'], slot: 1 },
  { keys: ['펑크', 'punk', '저항', '하드코어', 'hardcore', '스카', 'ska', '강렬', 'energy', 'riot'], slot: 2 },
  { keys: ['재즈', 'jazz', '스윙', 'swing', 'soul', '보사', 'bossa', '쿨', 'cool'], slot: 3 },
  { keys: ['포크', 'folk', '어쿠스', 'acoustic', '컨츄리', 'country', '따뜻', 'warm'], slot: 4 },
  { keys: ['팝', 'pop', '밝', 'bright', '상큼', '댄스', 'dance'], slot: 5 },
  { keys: ['일렉', 'electronic', '신스', 'synth', 'edm', '테크', 'techno', '하우스', 'house'], slot: 6 },
  { keys: ['클래식', 'classical', '오페라', 'opera', '현악', 'orchestral', '실내악'], slot: 7 },
  { keys: ['힙합', 'hip', 'hop', '랩', 'rap', 'r&b', 'urban', '트랩', 'trap'], slot: 8 },
];

const vibeBadgeStyle: CSSProperties = {
  padding: '0.875rem 1.25rem',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.2)',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  width: 'fit-content',
  maxWidth: '100%',
};

const vibeContentStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontWeight: 500,
  fontSize: '0.85rem',
};

const vibeIconStyle: CSSProperties = {
  color: '#fbbf24',
};

function getMoodVibeEmoji(moodName: string): string {
  const n = moodName.trim().toLowerCase();
  for (const row of MOOD_KEYWORD_SLOTS) {
    if (row.keys.some((k) => n.includes(k.toLowerCase()))) {
      return MOOD_VIBE_EMOJIS[row.slot % MOOD_VIBE_EMOJIS.length];
    }
  }
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = (h + n.charCodeAt(i) * (i + 7)) | 0;
  }
  return MOOD_VIBE_EMOJIS[Math.abs(h) % MOOD_VIBE_EMOJIS.length];
}

function MoodMiniCard({
  moodName,
  onNavigate,
}: {
  moodName: string;
  onNavigate?: (name: string) => void;
}) {
  const emoji = getMoodVibeEmoji(moodName);
  const badgeSurface: CSSProperties = { ...vibeBadgeStyle, background: getMoodVibeGradient(moodName) };
  const inner = (
    <div style={vibeContentStyle}>
      <span style={vibeIconStyle} className="shrink-0 leading-none text-base" aria-hidden>
        {emoji}
      </span>
      <span className="break-words text-left">{moodName.trim()}</span>
    </div>
  );
  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(moodName.trim())}
        className="text-left cursor-pointer transition-[filter,opacity] duration-200 hover:brightness-110 active:opacity-90"
        style={badgeSurface}
      >
        {inner}
      </button>
    );
  }
  return <div style={badgeSurface}>{inner}</div>;
}

const modalPanelStyle: CSSProperties = {
  padding: 0,
  maxHeight: 'min(56rem, calc(100dvh - 2rem))',
  height: 'min(56rem, calc(100dvh - 2rem))',
};

const modalBodyScrollStyle: CSSProperties = {
  flex: '1 1 0%',
  minHeight: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const btnIconClass = 'size-4 shrink-0 mr-1.5';

export function AlbumDetailModal({
  viewingItem,
  recommendedHeadphones,
  albumIntro,
  audioTags,
  albumIntroLoading,
  onRefreshAlbumIntro,
  onClose,
  onEdit,
  onDelete,
  isAuthenticated,
  isDeleting = false,
  onNavigateToMood,
}: AlbumDetailModalProps) {
  const [listenHistory, setListenHistory] = useState<ListenHistoryRow[]>([]);
  const [listenLoading, setListenLoading] = useState(false);
  const [listenDate, setListenDate] = useState('');
  const [listenImpression, setListenImpression] = useState('');
  const [listenSaving, setListenSaving] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [headphonesOpen, setHeadphonesOpen] = useState(true);
  const [listenOpen, setListenOpen] = useState(false);

  const loadListenHistory = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('album_listen_history')
      .select('id, listened_at, impression')
      .eq('album_id', viewingItem.id)
      .order('listened_at', { ascending: false });
    if (error) {
      toast.error(error.message || '청취 이력을 불러오지 못했습니다.');
      setListenHistory([]);
      return;
    }
    setListenHistory((data ?? []) as ListenHistoryRow[]);
  }, [viewingItem.id]);

  useEffect(() => {
    if (isAuthenticated !== true) {
      setListenHistory([]);
      return;
    }
    let cancelled = false;
    setListenLoading(true);
    void loadListenHistory().finally(() => {
      if (!cancelled) setListenLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, viewingItem.id, loadListenHistory]);

  useEffect(() => {
    setListenDate('');
    setListenImpression('');
    setHeadphonesOpen(true);
    setListenOpen(false);
    setYoutubeOpen(false);
  }, [viewingItem.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const addListenHistory = async () => {
    if (isAuthenticated !== true) return;
    const d = listenDate.trim();
    if (!d) {
      toast.error('청취일을 선택해 주세요.');
      return;
    }
    setListenSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      const { error } = await supabase.from('album_listen_history').insert({
        album_id: viewingItem.id,
        listened_at: d,
        impression: listenImpression.trim() || null,
      });
      if (error) {
        toast.error(error.message || '저장하지 못했습니다.');
        return;
      }
      setListenImpression('');
      await loadListenHistory();
      toast.success('청취 이력을 저장했습니다.');
    } finally {
      setListenSaving(false);
    }
  };

  const deleteListenHistory = async (rowId: number) => {
    setListenSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('album_listen_history').delete().eq('id', rowId);
      if (error) {
        toast.error(error.message || '삭제하지 못했습니다.');
        return;
      }
      await loadListenHistory();
    } finally {
      setListenSaving(false);
    }
  };

  const modalTree = (
    <div className="modal-overlay-apple fixed inset-0 z-50 box-border flex flex-col overflow-hidden p-4">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="modal-panel-apple relative flex min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-lg)]"
          style={modalPanelStyle}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full text-lg font-semibold text-white transition-all hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          >
            &times;
          </button>

          <div className="relative w-full shrink-0 overflow-hidden rounded-t-[var(--radius-lg)]" style={{ height: 300 }}>
            {viewingItem.cover_image_url ? (
              <>
                <div className="absolute inset-0 overflow-hidden" aria-hidden>
                  <img
                    src={viewingItem.cover_image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover blur-xl scale-110"
                  />
                </div>
                <div className="absolute inset-0 z-[1] flex items-center justify-center p-6 pointer-events-none">
                  <img
                    src={viewingItem.cover_image_url}
                    alt="앨범 커버"
                    className="aspect-square max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center z-[1]" style={{ background: 'var(--badge-bg)' }}>
                <Music className="size-12 opacity-30" strokeWidth={1.5} />
              </div>
            )}
            <div
              className="absolute inset-0 z-[2] pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
            />
            <div className="absolute bottom-0 left-0 right-0 z-[3] p-5">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {viewingItem.genre1 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {viewingItem.genre1}
                  </span>
                )}
                {viewingItem.genre2 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    {viewingItem.genre2}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-white leading-snug line-clamp-2">{viewingItem.album_name}</h2>
                  <p className="text-sm text-white/70 mt-0.5 truncate">
                    {viewingItem.artist}{' '}
                    {viewingItem.artist_type && `(${viewingItem.artist_type})`}
                    {viewingItem.country && (
                      <span className="ml-1.5">
                        {countryOptions.find((c) => c.name === viewingItem.country)?.flag}
                      </span>
                    )}
                  </p>
                </div>
                {viewingItem.title_song_url && getYoutubeId(viewingItem.title_song_url) && (
                  <button
                    type="button"
                    onClick={() => setYoutubeOpen((o) => !o)}
                    className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full transition-colors"
                    style={{ background: youtubeOpen ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }}
                    title="타이틀 곡 재생"
                  >
                    {youtubeOpen ? (
                      <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24" aria-hidden>
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-white fill-current ml-0.5" viewBox="0 0 24 24" aria-hidden>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {youtubeOpen && viewingItem.title_song_url && getYoutubeId(viewingItem.title_song_url) ? (
            <div className="aspect-video w-full shrink-0">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYoutubeId(viewingItem.title_song_url)}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="scrollbar-hide min-h-0 flex-1 overscroll-y-contain" style={modalBodyScrollStyle}>
              <div className="min-w-0 p-6 space-y-5">
                <div className="flex flex-row gap-4 items-start text-sm opacity-90">
                  {typeof viewingItem.mood_name === 'string' && viewingItem.mood_name.trim() ? (
                    <div className="shrink-0 w-fit max-w-full min-w-0">
                      <MoodMiniCard moodName={viewingItem.mood_name} onNavigate={onNavigateToMood} />
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-y-2 min-w-0 flex-1">
                    <p><strong>발매일:</strong> {viewingItem.release_date || '-'}</p>
                    <p><strong>앨범 타입:</strong> {viewingItem.album_type || '-'}</p>
                  </div>
                </div>

                {(isAuthenticated !== false ||
                  albumIntroLoading ||
                  audioTags.length > 0 ||
                  albumIntro.trim().length > 0 ||
                  recommendedHeadphones.length > 0) && (
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <strong className="text-sm flex items-center gap-1.5">
                        <Disc3 className="size-4 opacity-80" />
                        앨범 소개
                      </strong>
                      {isAuthenticated !== false ? (
                        <button
                          type="button"
                          onClick={onRefreshAlbumIntro}
                          disabled={albumIntroLoading}
                          className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
                          style={{ color: 'var(--foreground)' }}
                          title="앨범 소개·태그 다시 생성"
                          aria-label="앨범 소개·태그 다시 생성"
                        >
                          <RefreshCw className={`size-4 ${albumIntroLoading ? 'animate-spin' : ''}`} />
                        </button>
                      ) : null}
                    </div>

                    {albumIntroLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-8">
                        <div
                          className="w-6 h-6 border-2 rounded-full animate-spin"
                          style={{
                            borderColor: 'var(--border)',
                            borderTopColor: 'var(--foreground)',
                          }}
                          aria-hidden
                        />
                        <p className="text-sm opacity-80">Gemini가 앨범 소개를 작성 중이에요...</p>
                      </div>
                    ) : (
                      <>
                        {audioTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {audioTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                                style={audioTagSurfaceFromMood(viewingItem.mood_name)}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {albumIntro.trim() ? (
                          <p
                            className="text-xs leading-relaxed opacity-70 p-3 rounded-xl whitespace-pre-line"
                            style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                          >
                            {albumIntro}
                          </p>
                        ) : (
                          <p className="text-xs opacity-60">아직 생성된 앨범 소개가 없습니다. 새로고침 버튼을 눌러 생성해 보세요.</p>
                        )}
                      </>
                    )}

                    {!albumIntroLoading && recommendedHeadphones.length > 0 ? (
                      <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => setHeadphonesOpen((o) => !o)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left transition-opacity hover:opacity-90"
                          style={{ color: 'var(--foreground)' }}
                          aria-expanded={headphonesOpen}
                        >
                          <strong className="flex items-center gap-1.5 text-sm">
                            <Headphones className="size-4 shrink-0 opacity-80" />
                            추천 헤드폰
                          </strong>
                          <ChevronDown
                            className={`size-5 shrink-0 opacity-60 transition-transform ${headphonesOpen ? 'rotate-180' : ''}`}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                        {headphonesOpen ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {recommendedHeadphones.map((h) => (
                              <Link
                                key={h.id}
                                href={`/headfi?view=${h.id}`}
                                className="flex aspect-[5/2] flex-col items-center justify-center gap-1 rounded-xl p-2 text-center text-[11px] font-semibold leading-tight transition-opacity hover:opacity-90"
                                style={{
                                  background: 'var(--badge-bg)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--foreground)',
                                }}
                                onClick={onClose}
                              >
                                <span className="line-clamp-2 w-full">{h.brand}</span>
                                <span className="line-clamp-3 w-full text-[10px] font-medium opacity-75">{h.model}</span>
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}

                {isAuthenticated === true ? (
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setListenOpen((o) => !o)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left transition-opacity hover:opacity-90"
                      style={{ color: 'var(--foreground)' }}
                      aria-expanded={listenOpen}
                    >
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <strong className="text-sm">청취 이력</strong>
                        <span className="text-xs tabular-nums opacity-55">{listenHistory.length}건</span>
                      </span>
                      <ChevronDown
                        className={`size-5 shrink-0 opacity-60 transition-transform ${listenOpen ? 'rotate-180' : ''}`}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                    {listenOpen ? (
                      <>
                        {listenLoading ? (
                          <div className="mb-4 mt-3 flex items-center gap-2 py-2 opacity-60">
                            <div
                              className="h-4 w-4 animate-spin rounded-full border-2"
                              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
                            />
                            <span className="text-xs">불러오는 중…</span>
                          </div>
                        ) : listenHistory.length > 0 ? (
                          <ul className="mb-4 mt-3 space-y-3">
                            {listenHistory.map((row) => (
                              <li
                                key={row.id}
                                className="flex gap-3 rounded-xl p-3"
                                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold tabular-nums">
                                    {new Date(row.listened_at + 'T12:00:00').toLocaleDateString('ko-KR')}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm opacity-85">
                                    {row.impression?.trim() ? row.impression : '—'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void deleteListenHistory(row.id)}
                                  disabled={listenSaving}
                                  className="btn-apple btn-apple-danger shrink-0 self-start px-2 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-50"
                                  aria-label="이력 삭제"
                                >
                                  <Trash2 className="size-3.5" strokeWidth={2} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mb-4 mt-3 text-xs opacity-60">아직 기록된 청취 이력이 없습니다.</p>
                        )}
                        <div className="mt-1 flex min-w-0 flex-row flex-nowrap items-center gap-2">
                          <input
                            type="date"
                            value={listenDate}
                            onChange={(e) => setListenDate(e.target.value)}
                            title="청취일"
                            aria-label="청취일"
                            className="box-border w-[10.5rem] max-w-[min(100%,10.5rem)] shrink-0 rounded-lg border px-1.5 py-2 text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
                          />
                          <input
                            type="text"
                            value={listenImpression}
                            onChange={(e) => setListenImpression(e.target.value)}
                            placeholder="소감 (선택)"
                            title="소감 (선택)"
                            aria-label="소감 (선택)"
                            className="min-w-0 flex-1 basis-0 rounded-lg border px-3 py-2 text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)', color: 'var(--foreground)' }}
                          />
                          <button
                            type="button"
                            onClick={() => void addListenHistory()}
                            disabled={listenSaving}
                            className="btn-apple btn-apple-primary box-border shrink-0 px-3 py-2 text-sm leading-none disabled:pointer-events-none disabled:opacity-50"
                          >
                            추가
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {isAuthenticated ? (
                  <div className="flex gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={onEdit}
                      className="btn-apple btn-apple-secondary flex-1 py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isDeleting}
                    >
                      <Pencil className={btnIconClass} /> 정보 수정하기
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="btn-apple btn-apple-danger flex-1 py-3 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
                      disabled={isDeleting}
                      aria-busy={isDeleting}
                    >
                      {isDeleting ? (
                        <DeletingLabel />
                      ) : (
                        <>
                          <Trash2 className={btnIconClass} /> 삭제하기
                        </>
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalTree, document.body);
}
