'use client';

import { Activity, Music2, RefreshCw } from 'lucide-react';
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
import { useState } from 'react';
import type { Headfi } from '../types';

type HeadfiRadarSectionProps = {
  viewingItem: Headfi;
  isAuthenticated: boolean | null;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
};

export function HeadfiRadarSection({ viewingItem, isAuthenticated, onHeadfiPatch }: HeadfiRadarSectionProps) {
  const [genresRefreshLoading, setGenresRefreshLoading] = useState(false);

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
  const hasRadarData = radarData.some((d) => d.value > 0);
  const showRadar =
    (viewingItem.category === '헤드폰' || viewingItem.category === '이어폰') && hasRadarData;
  const showWiredHeadphoneGenres =
    viewingItem.category === '헤드폰' || viewingItem.category === '이어폰';

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

  if (!showRadar && !showWiredHeadphoneGenres) return null;

  return (
    <div className="space-y-4 text-sm mb-6">
      {showRadar ? (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
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

      {showWiredHeadphoneGenres ? (
        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
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
