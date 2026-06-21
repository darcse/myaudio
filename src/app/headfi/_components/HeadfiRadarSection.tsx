'use client';

import { Activity, Music2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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
import type { Headfi } from '../types';

type HeadfiRadarSectionProps = {
  viewingItem: Headfi;
  isAuthenticated: boolean | null;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
  variant?: 'default' | 'tab';
  mode?: 'all' | 'radar' | 'genres';
};

function hasSoundScores(viewingItem: Headfi): boolean {
  const values = [
    viewingItem.bass_quantity,
    viewingItem.bass_depth,
    viewingItem.bass_speed,
    viewingItem.dynamics_slam,
    viewingItem.midrange_body,
    viewingItem.tone_warmth,
    viewingItem.vocal_position,
    viewingItem.midrange_clarity,
    viewingItem.treble_brightness,
    viewingItem.treble_smoothness,
    viewingItem.treble_airiness,
    viewingItem.resolution,
    viewingItem.separation,
    viewingItem.soundstage,
    viewingItem.imaging,
    viewingItem.timbre,
  ];
  return values.some((v) => v != null && Number(v) > 0);
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
  const [localSoundAnalysis, setLocalSoundAnalysis] = useState<string | null>(
    viewingItem.ai_sound_analysis?.trim() || null,
  );

  useEffect(() => {
    setLocalSoundAnalysis(viewingItem.ai_sound_analysis?.trim() || null);
  }, [viewingItem.id, viewingItem.ai_sound_analysis]);

  const radarData = [
    { subject: 'Bass Qty', value: viewingItem.bass_quantity ?? 0 },
    { subject: 'Bass Depth', value: viewingItem.bass_depth ?? 0 },
    { subject: 'Bass Speed', value: viewingItem.bass_speed ?? 0 },
    { subject: 'Dynamics', value: viewingItem.dynamics_slam ?? 0 },
    { subject: 'Mid Body', value: viewingItem.midrange_body ?? 0 },
    { subject: 'Warmth', value: viewingItem.tone_warmth ?? 0 },
    { subject: 'Vocal Pos', value: viewingItem.vocal_position ?? 0 },
    { subject: 'Mid Clarity', value: viewingItem.midrange_clarity ?? 0 },
    { subject: 'Treble Bright', value: viewingItem.treble_brightness ?? 0 },
    { subject: 'Treble Smooth', value: viewingItem.treble_smoothness ?? 0 },
    { subject: 'Airiness', value: viewingItem.treble_airiness ?? 0 },
    { subject: 'Resolution', value: viewingItem.resolution ?? 0 },
    { subject: 'Separation', value: viewingItem.separation ?? 0 },
    { subject: 'Soundstage', value: viewingItem.soundstage ?? 0 },
    { subject: 'Imaging', value: viewingItem.imaging ?? 0 },
    { subject: 'Timbre', value: viewingItem.timbre ?? 0 },
  ];
  const hasRadarData = hasSoundScores(viewingItem);
  const showRadarChart = viewingItem.category === '헤드폰' && hasRadarData;
  const showEarphoneRadar =
    mode === 'all' &&
    viewingItem.category === '이어폰' &&
    hasRadarData;
  const showRadar = showRadarChart || showEarphoneRadar;
  const showWiredHeadphoneGenres =
    (mode === 'all' || mode === 'genres') &&
    (viewingItem.category === '헤드폰' || viewingItem.category === '이어폰');

  const showRadarBlock = (mode === 'radar' || mode === 'all') && showRadar;

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

  const handleSoundAnalysisRefresh = async () => {
    if (!onHeadfiPatch || isAuthenticated !== true || !hasRadarData) return;
    setSoundAnalysisLoading(true);
    try {
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
      toast.success('AI 분석을 갱신했습니다.');
    } catch {
      toast.error('AI 분석 요청 중 오류가 났습니다.');
    } finally {
      setSoundAnalysisLoading(false);
    }
  };

  if (mode === 'genres' && !showWiredHeadphoneGenres) return null;
  if (mode === 'all' && !showRadar && !showWiredHeadphoneGenres) return null;
  if (mode === 'radar' && viewingItem.category !== '헤드폰') return null;

  const sectionWrapClass = variant === 'tab' ? 'space-y-4 text-sm' : 'space-y-4 text-sm mb-6';
  const blockClass = variant === 'tab' && mode !== 'radar' ? 'pt-4 border-t' : variant === 'tab' ? '' : 'pt-4 mt-2 border-t';
  const soundAnalysis = localSoundAnalysis?.trim() ?? '';

  return (
    <div className={sectionWrapClass}>
      {showRadarBlock ? (
        <div className={mode === 'radar' ? '' : blockClass} style={{ borderColor: 'var(--border)' }}>
          <strong className="text-sm flex items-center gap-1.5 mb-4 font-semibold">
            <Activity className="size-4 opacity-80 shrink-0" aria-hidden />
            청음 평가
          </strong>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: 'var(--foreground)', opacity: 0.7 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9, opacity: 0.5 }} tickCount={6} />
              <Radar
                name="점수"
                dataKey="value"
                stroke="#005bc1"
                fill="#005bc1"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value) => [value ?? 0, '점수']}
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {mode === 'radar' ? (
        <section className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold opacity-90">
              <Sparkles className="size-4 shrink-0 opacity-80" aria-hidden />
              AI 분석
            </h3>
            {isAuthenticated === true && hasRadarData && onHeadfiPatch ? (
              <button
                type="button"
                onClick={() => void handleSoundAnalysisRefresh()}
                disabled={soundAnalysisLoading}
                className="shrink-0 rounded-lg p-1.5 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                style={{ color: 'var(--foreground)' }}
                title="AI 분석 다시 생성"
                aria-label="AI 분석 다시 생성"
              >
                <RefreshCw className={`size-4 ${soundAnalysisLoading ? 'animate-spin' : ''}`} />
              </button>
            ) : null}
          </div>
          {!hasRadarData ? (
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
              <p className="text-xs opacity-70">Gemini가 음색을 분석 중이에요...</p>
            </div>
          ) : soundAnalysis ? (
            <p
              className="whitespace-pre-line rounded-xl p-3 text-xs leading-relaxed opacity-80"
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
            >
              {soundAnalysis}
            </p>
          ) : (
            <p className="text-xs opacity-60">
              AI 분석이 아직 없습니다. 로그인 후 새로고침으로 생성할 수 있습니다.
            </p>
          )}
        </section>
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
