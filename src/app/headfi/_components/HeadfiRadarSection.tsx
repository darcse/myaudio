'use client';

import { Activity, Music2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { hasCachedHeadfiReview, parseHeadfiReviewSources } from '@/lib/headfiReviewSources';
import { HeadfiFrSection } from './HeadfiFrSection';
import { splitProseParagraphs } from '@/lib/utils';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useEffect, useState } from 'react';
import {
  countFilledPerformanceFromGear,
  hasCompletePerformanceRadar,
  hasListeningEvaluationInput,
  LISTENING_PERFORMANCE_FIELDS,
  LISTENING_TRAIT_DISPLAY,
  LISTENING_TRAIT_STEPS,
  PERFORMANCE_LABELS,
  performanceGroupAverages,
  readNullableScore,
  traitTagSummary,
} from '../listeningEvaluation';
import type { Headfi } from '../types';

type HeadfiRadarSectionProps = {
  viewingItem: Headfi;
  isAuthenticated: boolean | null;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
  variant?: 'default' | 'tab';
  mode?: 'all' | 'radar' | 'genres';
};

type ListenPane = 'scores' | 'fr' | 'review' | 'analysis';

const LISTEN_PANES: { id: ListenPane; label: string }[] = [
  { id: 'scores', label: '청음 평가' },
  { id: 'fr', label: 'FR 그래프' },
  { id: 'review', label: '외부 리뷰' },
  { id: 'analysis', label: 'AI 분석' },
];

function formatReviewFetchedAt(value: string | null): string {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('ko-KR');
}

export function HeadfiRadarSection({
  viewingItem,
  isAuthenticated,
  onHeadfiPatch,
  variant = 'default',
  mode = 'all',
}: HeadfiRadarSectionProps) {
  const [genresRefreshLoading, setGenresRefreshLoading] = useState(false);
  const [soundAnalysisLoading, setSoundAnalysisLoading] = useState(false);
  const [reviewRefreshLoading, setReviewRefreshLoading] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'review' | 'analysis' | null>(null);
  const [localSoundAnalysis, setLocalSoundAnalysis] = useState<string | null>(
    viewingItem.ai_sound_analysis?.trim() || null,
  );
  const [localReviewSummary, setLocalReviewSummary] = useState<string | null>(
    viewingItem.ai_review_summary?.trim() || null,
  );
  const [localReviewFetchedAt, setLocalReviewFetchedAt] = useState<string | null>(
    viewingItem.ai_review_fetched_at ?? null,
  );
  const [listenPane, setListenPane] = useState<ListenPane>('scores');
  const [analysisStaleFromReview, setAnalysisStaleFromReview] = useState(false);

  useEffect(() => {
    setListenPane('scores');
    setAnalysisStaleFromReview(false);
  }, [viewingItem.id]);

  useEffect(() => {
    setLocalSoundAnalysis(viewingItem.ai_sound_analysis?.trim() || null);
    setLocalReviewSummary(viewingItem.ai_review_summary?.trim() || null);
    setLocalReviewFetchedAt(viewingItem.ai_review_fetched_at ?? null);
  }, [
    viewingItem.id,
    viewingItem.ai_sound_analysis,
    viewingItem.ai_review_summary,
    viewingItem.ai_review_fetched_at,
  ]);

  const isWiredListeningDevice =
    viewingItem.category === '헤드폰' || viewingItem.category === '이어폰';
  const filledPerformanceCount = countFilledPerformanceFromGear(viewingItem);
  const showFullRadar = isWiredListeningDevice && hasCompletePerformanceRadar(viewingItem);
  const hasListeningInput = hasListeningEvaluationInput(viewingItem);
  const groupAverages = performanceGroupAverages(viewingItem);
  const traitTags = traitTagSummary(viewingItem);
  const radarData = LISTENING_PERFORMANCE_FIELDS.map((field) => ({
    subject: PERFORMANCE_LABELS[field],
    value: readNullableScore(viewingItem[field]) ?? 0,
    excellent: 7,
  }));
  const showWiredHeadphoneGenres =
    (mode === 'all' || mode === 'genres') && isWiredListeningDevice;
  const showListenDisplay = (mode === 'radar' || mode === 'all') && isWiredListeningDevice;

  const handleRecommendedGenresRefresh = async () => {
    if (!onHeadfiPatch || isAuthenticated !== true) return;
    setGenresRefreshLoading(true);
    try {
      const res = await fetch('/api/headfi-recommended-genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headfiId: viewingItem.id, force: true }),
      });
      const payload = (await res.json()) as { message?: string; recommended_genres?: string[] };
      if (!res.ok) {
        const msg =
          typeof payload.message === 'string'
            ? payload.message
            : '추천 장르를 다시 받지 못했습니다.';
        toast.error(msg);
        return;
      }
      if (payload.recommended_genres && Array.isArray(payload.recommended_genres)) {
        onHeadfiPatch({ id: viewingItem.id, recommended_genres: payload.recommended_genres });
        toast.success('추천 장르를 갱신했습니다.');
      }
    } catch {
      toast.error('요청 중 오류가 났습니다.');
    } finally {
      setGenresRefreshLoading(false);
    }
  };

  const applyReviewPayload = (payload: {
    summary?: string | null;
    sources?: unknown;
    fetched_at?: string | null;
  }) => {
    const summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';
    const sources = parseHeadfiReviewSources(payload.sources);
    const fetchedAt = typeof payload.fetched_at === 'string' ? payload.fetched_at : null;
    setLocalReviewSummary(summary || null);
    setLocalReviewFetchedAt(fetchedAt);
    onHeadfiPatch?.({
      id: viewingItem.id,
      ai_review_summary: summary || null,
      ai_review_sources: sources,
      ai_review_fetched_at: fetchedAt,
    });
  };

  const requestReviewSummary = async (force: boolean): Promise<boolean> => {
    const res = await fetch('/api/headfi-review-summary', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headfiId: viewingItem.id, force }),
    });
    const payload = (await res.json()) as {
      error?: string;
      summary?: string | null;
      sources?: unknown;
      fetched_at?: string | null;
    };
    if (!res.ok) {
      toast.error(typeof payload.error === 'string' ? payload.error : '외부 리뷰 요약에 실패했습니다.');
      return false;
    }
    applyReviewPayload(payload);
    return true;
  };

  const handleReviewRefresh = async () => {
    if (!onHeadfiPatch || isAuthenticated !== true) return;
    setReviewRefreshLoading(true);
    try {
      const ok = await requestReviewSummary(true);
      if (ok) {
        if (localSoundAnalysis?.trim()) setAnalysisStaleFromReview(true);
        toast.success('외부 리뷰 요약을 갱신했습니다.');
      }
    } catch {
      toast.error('외부 리뷰 요청 중 오류가 났습니다.');
    } finally {
      setReviewRefreshLoading(false);
    }
  };

  const handleSoundAnalysisRefresh = async () => {
    if (!onHeadfiPatch || isAuthenticated !== true || !hasListeningInput) return;
    setSoundAnalysisLoading(true);
    try {
      const needsReviewSearch = !hasCachedHeadfiReview({
        ai_review_summary: localReviewSummary,
        ai_review_fetched_at: localReviewFetchedAt,
      });
      if (needsReviewSearch) {
        setAnalysisPhase('review');
        try {
          await requestReviewSummary(false);
        } catch {
          toast.error('외부 리뷰 요청 중 오류가 났습니다.');
        }
      }
      setAnalysisPhase('analysis');
      const res = await fetch('/api/headfi-sound-analysis', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headfiId: viewingItem.id }),
      });
      const payload = (await res.json()) as { error?: string; analysis?: string };
      if (!res.ok) {
        toast.error(typeof payload.error === 'string' ? payload.error : 'AI 분석에 실패했습니다.');
        return;
      }
      const analysis = typeof payload.analysis === 'string' ? payload.analysis.trim() : '';
      onHeadfiPatch({ id: viewingItem.id, ai_sound_analysis: analysis || null });
      setLocalSoundAnalysis(analysis || null);
      setAnalysisStaleFromReview(false);
      toast.success('AI 분석을 갱신했습니다.');
    } catch {
      toast.error('AI 분석 요청 중 오류가 났습니다.');
    } finally {
      setSoundAnalysisLoading(false);
      setAnalysisPhase(null);
    }
  };

  if (mode === 'genres' && !showWiredHeadphoneGenres) return null;
  if (mode === 'all' && !showListenDisplay && !showWiredHeadphoneGenres) return null;
  if (mode === 'radar' && !isWiredListeningDevice) return null;

  const sectionWrapClass = variant === 'tab' ? 'space-y-4 text-sm' : 'space-y-4 text-sm mb-6';
  const blockClass = variant === 'tab' && mode !== 'radar' ? 'pt-4 border-t' : variant === 'tab' ? '' : 'pt-4 mt-2 border-t';
  const soundAnalysis = localSoundAnalysis?.trim() ?? '';
  const hasReviewCache = hasCachedHeadfiReview({
    ai_review_summary: localReviewSummary,
    ai_review_fetched_at: localReviewFetchedAt,
  });
  const showScoresPane = mode !== 'radar' || listenPane === 'scores';
  const showFrPane = mode === 'radar' && listenPane === 'fr';
  const showReviewPane = mode === 'radar' && listenPane === 'review';
  const showAnalysisPane = mode === 'radar' && listenPane === 'analysis';

  return (
    <div className={sectionWrapClass}>
      {showListenDisplay ? (
        <div className={mode === 'radar' ? '' : blockClass} style={{ borderColor: 'var(--border)' }}>
          {mode === 'radar' ? (
            <div className="mb-4 overflow-x-auto scrollbar-hide">
              <div
                className="flex w-max min-w-full gap-1 rounded-full p-0.5"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                role="tablist"
                aria-label="청음 평가 영역"
              >
                {LISTEN_PANES.map((pane) => {
                  const selected = listenPane === pane.id;
                  return (
                    <button
                      key={pane.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setListenPane(pane.id)}
                      className="shrink-0 flex-1 rounded-full px-2.5 py-1.5 text-center text-[11px] font-semibold leading-none whitespace-nowrap sm:text-xs"
                      style={{
                        background: selected ? 'var(--card-bg)' : 'transparent',
                        color: 'var(--foreground)',
                        opacity: selected ? 1 : 0.55,
                      }}
                    >
                      {pane.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <strong className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
              <Activity className="size-4 shrink-0 opacity-80" aria-hidden />
              청음 평가
            </strong>
          )}
          {showScoresPane && showFullRadar ? (
            <div>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 9, fill: 'var(--foreground)', opacity: 0.7 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 10]}
                    tick={{ fontSize: 9, opacity: 0.5 }}
                    tickCount={6}
                  />
                  <Radar
                    name="우수선"
                    dataKey="excellent"
                    stroke="var(--foreground)"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    isAnimationActive={false}
                  />
                  <Radar
                    name="점수"
                    dataKey="value"
                    stroke="#005bc1"
                    fill="#005bc1"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value, name) => [value, name === '우수선' ? '7점 우수선' : '점수']}
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <p className="-mt-1 text-center text-[11px] leading-none opacity-55">┄ 7점 (우수)</p>
            </div>
          ) : showScoresPane ? (
            <p className="mb-4 text-xs opacity-60">
              성능 {filledPerformanceCount}/13 입력 시 레이더가 표시됩니다
            </p>
          ) : null}

          {showScoresPane ? (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:flex-nowrap">
                {groupAverages.map((group) => (
                  <span
                    key={group.title}
                    className="inline-flex min-w-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] leading-5 sm:min-w-0 sm:flex-1 sm:justify-center"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    {group.title}{' '}
                    <span className="tabular-nums">
                      {group.average == null ? '—' : group.average.toFixed(1)}
                    </span>
                    {' · '}
                    {group.filled}개
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold opacity-90">성향</h3>
                {traitTags.length > 0 ? (
                  <p className="mb-3 text-xs leading-relaxed opacity-80">{traitTags.join(' · ')}</p>
                ) : (
                  <p className="mb-3 text-xs opacity-60">성향 미입력</p>
                )}
                <div className="space-y-3">
                  {LISTENING_TRAIT_DISPLAY.map((row) => {
                    const value = readNullableScore(viewingItem[row.key]);
                    return (
                      <div
                        key={row.key}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-2"
                      >
                        <span className="text-right text-xs opacity-70">{row.left}</span>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex w-full items-center justify-between px-1">
                            {LISTENING_TRAIT_STEPS.map((step) => {
                              const selected = value != null && value === step;
                              return (
                                <span
                                  key={step}
                                  className="flex size-8 items-center justify-center"
                                  aria-label={`${row.en} ${step}${selected ? ' 선택됨' : ''}`}
                                >
                                  <span
                                    className="block size-2.5 rounded-full"
                                    style={{
                                      background: selected ? 'var(--foreground)' : 'transparent',
                                      border: '1px solid var(--border)',
                                    }}
                                  />
                                </span>
                              );
                            })}
                          </div>
                          {value == null ? <span className="text-[10px] leading-none opacity-50">—</span> : null}
                        </div>
                        <span className="text-xs opacity-70">{row.right}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}

          {showFrPane ? (
            <HeadfiFrSection
              viewingItem={viewingItem}
              isAuthenticated={isAuthenticated}
              onHeadfiPatch={onHeadfiPatch}
              variant="tab"
              hideTitle
            />
          ) : null}

          {showAnalysisPane ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold opacity-90">
                  <Sparkles className="size-4 shrink-0 opacity-80" aria-hidden />
                  AI 분석
                </h3>
                {isAuthenticated === true && hasListeningInput && onHeadfiPatch ? (
                  <button
                    type="button"
                    onClick={() => void handleSoundAnalysisRefresh()}
                    disabled={soundAnalysisLoading || reviewRefreshLoading}
                    className="rounded-lg px-2 py-1 text-[11px] opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                    title="AI 분석 다시 생성"
                  >
                    {soundAnalysisLoading ? '분석 중…' : '분석 새로고침'}
                  </button>
                ) : null}
              </div>
              {!hasListeningInput ? (
                <p className="text-xs opacity-60">청음 평가 데이터가 없습니다.</p>
              ) : soundAnalysisLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <div
                    className="h-6 w-6 animate-spin rounded-full border-2"
                    style={{
                      borderColor: 'var(--border)',
                      borderTopColor: 'var(--foreground)',
                    }}
                    aria-hidden
                  />
                  <p className="text-xs opacity-70">
                    {analysisPhase === 'review'
                      ? '외부 리뷰를 검색하는 중…'
                      : 'AI가 음색을 분석하는 중…'}
                  </p>
                </div>
              ) : soundAnalysis ? (
                <div
                  className="text-sm space-y-3 p-4 rounded-xl leading-relaxed"
                  style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                >
                  {splitProseParagraphs(soundAnalysis).map((paragraph, index) => (
                    <p key={index} className="opacity-85">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-60">
                  AI 분석이 아직 없습니다. 로그인 후 새로고침으로 생성할 수 있습니다.
                </p>
              )}
            </div>
          ) : null}

          {showReviewPane ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold opacity-90">외부 리뷰</h3>
                {isAuthenticated === true && onHeadfiPatch ? (
                  <button
                    type="button"
                    onClick={() => void handleReviewRefresh()}
                    disabled={soundAnalysisLoading || reviewRefreshLoading}
                    className="rounded-lg px-2 py-1 text-[11px] opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                    title={hasReviewCache ? '외부 리뷰 다시 검색' : '외부 리뷰 수집'}
                  >
                    {reviewRefreshLoading ? '리뷰 검색 중…' : hasReviewCache ? '리뷰 갱신' : '리뷰 수집'}
                  </button>
                ) : null}
              </div>
              {analysisStaleFromReview && soundAnalysis ? (
                <p className="mb-3 text-[11px] leading-relaxed opacity-60">
                  리뷰가 갱신되었습니다. 분석은 AI 분석 탭에서 다시 생성하세요.
                </p>
              ) : null}
              {localReviewSummary || localReviewFetchedAt ? (
                <div className="space-y-2">
                  {localReviewFetchedAt ? (
                    <p className="text-[11px] opacity-50">{formatReviewFetchedAt(localReviewFetchedAt)}</p>
                  ) : null}
                  {localReviewSummary ? (
                    <div className="space-y-2 text-xs leading-relaxed opacity-80">
                      {splitProseParagraphs(localReviewSummary).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs opacity-60">요약 없음</p>
                  )}
                </div>
              ) : (
                <p className="text-xs opacity-60">외부 리뷰 요약이 없습니다. 로그인 후 수집할 수 있습니다.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {showWiredHeadphoneGenres ? (
        <div className={blockClass} style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-semibold opacity-90 flex items-center gap-1.5">
              <Music2 className="size-4 opacity-80 shrink-0" aria-hidden />
              추천 장르
            </p>
            {isAuthenticated === true ? (
              <button
                type="button"
                onClick={handleRecommendedGenresRefresh}
                disabled={genresRefreshLoading}
                className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
                title="추천 장르 다시 생성"
              >
                <RefreshCw
                  className={`size-3.5 ${genresRefreshLoading ? 'animate-spin' : ''}`}
                  aria-hidden
                />
              </button>
            ) : null}
          </div>
          {viewingItem.recommended_genres && viewingItem.recommended_genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {viewingItem.recommended_genres.slice(0, 4).map((g, i) => (
                <span key={`${g}-${i}`} className="badge-apple text-[11px] px-2.5 py-1 rounded-lg">
                  {g}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs opacity-60 leading-relaxed">
              {genresRefreshLoading
                ? '추천 장르를 생성하는 중…'
                : '추천 장르를 준비 중이거나 아직 없습니다. 유선 헤드폰·이어폰 저장 시 자동으로 생성되며, 로그인 후 새로고침으로 다시 받을 수 있습니다.'}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
