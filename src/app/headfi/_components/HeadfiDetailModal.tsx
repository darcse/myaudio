/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Disc, Headphones, LineChart, Music2, Pencil, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';
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
import { DeletingLabel } from '@/components/AsyncMutationUi';
import type { Headfi, HeadfiFrInterpretation } from '../types';
import { formatVrmsAt32Ohm } from '../utils';

type HeadfiDetailModalProps = {
  viewingItem: Headfi;
  matchedAlbums: { id: number; album_name: string; artist: string; cover_image_url: string | null; release_date?: string | null }[];
  matchedMatchingDevice: { id: number; brand: string; model: string } | null;
  matchedHeadphones: { id: number; brand: string; model: string; category: string }[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
  isAuthenticated: boolean | null;
  isDeleting?: boolean;
};

function parseFrInterpretation(raw: string | null | undefined): HeadfiFrInterpretation | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const bass = typeof o.bass === 'string' ? o.bass : '';
    const mid = typeof o.mid === 'string' ? o.mid : '';
    const treble = typeof o.treble === 'string' ? o.treble : '';
    const summary = typeof o.summary === 'string' ? o.summary : '';
    if (!bass && !mid && !treble && !summary) return null;
    return { bass, mid, treble, summary };
  } catch {
    return null;
  }
}

function frGraphImageDisplaySrc(url: string, isAuthenticated: boolean | null): string {
  const u = url.trim();
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.pathname.includes('/storage/v1/object/public/')) {
      return u;
    }
  } catch {
    return u;
  }
  if (isAuthenticated === true) {
    return `/api/headfi-fr-image?url=${encodeURIComponent(u)}`;
  }
  return u;
}

export function HeadfiDetailModal({
  viewingItem,
  matchedAlbums,
  matchedMatchingDevice,
  matchedHeadphones,
  onClose,
  onEdit,
  onDelete,
  onHeadfiPatch,
  isAuthenticated,
  isDeleting = false,
}: HeadfiDetailModalProps) {
  const [specOpen, setSpecOpen] = useState(() => viewingItem.category === 'DAC/AMP');
  const [frOpen, setFrOpen] = useState(false);
  const [frInterpretLoading, setFrInterpretLoading] = useState(false);
  const [genresRefreshLoading, setGenresRefreshLoading] = useState(false);
  const [albumsOpen, setAlbumsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setSpecOpen(viewingItem.category === 'DAC/AMP');
  }, [viewingItem.id, viewingItem.category]);

  useEffect(() => {
    setFrOpen(false);
  }, [viewingItem.id]);

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
  const showFrSection = viewingItem.category === '헤드폰' || viewingItem.category === '이어폰';
  const frInterpretParsed = parseFrInterpretation(viewingItem.fr_interpretation ?? undefined);
  const hasFrGraphUrl = !!(viewingItem.fr_graph_url && String(viewingItem.fr_graph_url).trim());
  const frImageDisplaySrc = hasFrGraphUrl
    ? frGraphImageDisplaySrc(String(viewingItem.fr_graph_url).trim(), isAuthenticated)
    : '';

  const handleFrInterpret = async () => {
    if (!onHeadfiPatch || !hasFrGraphUrl || isAuthenticated === false) return;
    setFrInterpretLoading(true);
    try {
      const res = await fetch('/api/headfi-fr-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headfiId: viewingItem.id }),
      });
      const payload = await res.json();
      if (!res.ok) {
        const msg =
          typeof payload.message === 'string'
            ? payload.message
            : 'AI 해석에 실패했습니다.';
        toast.error(msg);
        return;
      }
      const interp = payload.fr_interpretation as HeadfiFrInterpretation;
      onHeadfiPatch({ id: viewingItem.id, fr_interpretation: JSON.stringify(interp) });
      toast.success('AI 해석을 저장했습니다.');
    } catch {
      toast.error('AI 해석 요청 중 오류가 났습니다.');
    } finally {
      setFrInterpretLoading(false);
    }
  };

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

  const showWiredHeadphoneGenres =
    viewingItem.category === '헤드폰' || viewingItem.category === '이어폰';

  return (
    <div className="modal-overlay-apple fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel-apple max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative scrollbar-hide">
        <div className="sticky top-0 z-50 flex justify-end h-0 overflow-visible">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-3xl font-semibold opacity-60 hover:opacity-100 transition-opacity leading-none bg-transparent rounded-bl-lg"
          >
            &times;
          </button>
        </div>

        <h2 className="section-title text-xl mb-4 pr-12">
          {viewingItem.brand} {viewingItem.model}
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 mb-2 pb-6">
          {viewingItem.image_url ? (
            <img
              src={viewingItem.image_url}
              alt="기기 이미지"
              className="w-32 h-32 object-cover rounded-xl mx-auto sm:mx-0 flex-shrink-0"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : null}
          <div className="space-y-2 text-sm opacity-90 flex-1">
            <p><strong>브랜드:</strong> {viewingItem.brand}</p>
            <p><strong>모델명:</strong> {viewingItem.model}</p>
            <p><strong>카테고리:</strong> {viewingItem.category}</p>
            <p><strong>구입일:</strong> {viewingItem.purchase_date || '-'}</p>
            <p>
              <strong>구매 정보:</strong>{' '}
              {viewingItem.status1 || '-'} /{' '}
              {viewingItem.price ? `${Number(viewingItem.price).toLocaleString()}원` : '-'} /{' '}
              <span className="font-semibold">{viewingItem.status2 || '-'}</span>
            </p>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => setSpecOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 text-left mb-3 rounded-lg -mx-1 px-1 py-1 hover:opacity-90 transition-opacity"
            aria-expanded={specOpen}
          >
            <strong className="text-sm flex items-center gap-1.5 font-semibold">
              <SlidersHorizontal className="size-4 opacity-80 shrink-0" aria-hidden />
              상세 스펙
            </strong>
            <span className="text-sm opacity-60 tabular-nums shrink-0">{specOpen ? '▴' : '▾'}</span>
          </button>
          {specOpen ? (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-4 opacity-90">
              {['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰'].includes(viewingItem.category) ? (
                <>
                  {(viewingItem.category === '헤드폰' ||
                    viewingItem.category === '이어폰' ||
                    viewingItem.category === '무선 헤드폰') && (
                    <p className="col-span-2">
                      <strong>타입:</strong> {viewingItem.type1 || '-'} / {viewingItem.type2 || '-'}
                    </p>
                  )}
                  {viewingItem.category === '무선 이어폰' ? (
                    <p className="col-span-2">
                      <strong>타입:</strong> {viewingItem.type1 || '-'}
                    </p>
                  ) : null}
                  {(viewingItem.category === '헤드폰' || viewingItem.category === '이어폰') && (
                    <>
                      <p>
                        <strong>임피던스:</strong>{' '}
                        {viewingItem.impedance ? `${viewingItem.impedance} Ω` : '-'}
                      </p>
                      <p>
                        <strong>감도:</strong>{' '}
                        {viewingItem.db1 != null ? `${String(viewingItem.db1)} dB/SPL V` : '-'}{' '}
                        {viewingItem.db1 != null && viewingItem.db2 != null && '·'}{' '}
                        {viewingItem.db2 != null ? `${String(viewingItem.db2)} dB/mW` : ''}
                      </p>
                    </>
                  )}
                  {viewingItem.category === '헤드폰' ? (
                    <>
                      <p>
                        <strong>구동력:</strong> {viewingItem.volume || '-'} / {viewingItem.volume_type || '-'}
                      </p>
                      <p>
                        <strong>음색 (온도/밝기):</strong> {viewingItem.temp || '-'} / {viewingItem.bright || '-'}
                      </p>
                    </>
                  ) : null}
                  {viewingItem.category === '이어폰' ? (
                    <p className="col-span-2">
                      <strong>음색 (온도/밝기):</strong> {viewingItem.temp || '-'} / {viewingItem.bright || '-'}
                    </p>
                  ) : null}
                  <p className="col-span-2">
                    <strong>매칭 (매칭 기기 / gain):</strong>{' '}
                    {viewingItem.matching && viewingItem.matching !== ' ' ? (
                      matchedMatchingDevice ? (
                        <Link href={`/headfi?view=${matchedMatchingDevice.id}`} className="link-apple">
                          {matchedMatchingDevice.brand} {matchedMatchingDevice.model}
                        </Link>
                      ) : (
                        <span>{viewingItem.matching}</span>
                      )
                    ) : (
                      '-'
                    )}
                    {viewingItem.category === '헤드폰' && (viewingItem.gain ? ` / ${viewingItem.gain}` : '')}
                  </p>
                  <p className="col-span-2">
                    <strong>케이블:</strong> {viewingItem.cable || '-'}
                    {viewingItem.cable && Number(viewingItem.cable_price) > 0
                      ? ` (${Number(viewingItem.cable_price).toLocaleString()}원)`
                      : ''}
                  </p>
                </>
              ) : null}
              {viewingItem.category === 'DAC/AMP' ? (
                <>
                  <p className="col-span-2">
                    <strong>앰프 타입:</strong> {viewingItem.amp_type || '-'}
                  </p>
                  <p className="col-span-2">
                    <strong>Rk (Ω):</strong>{' '}
                    {viewingItem.output_impedance != null &&
                    Number.isFinite(Number(viewingItem.output_impedance))
                      ? `${viewingItem.output_impedance} Ω`
                      : '-'}
                  </p>
                  <p className="col-span-2">
                    <strong>Chipset:</strong> {viewingItem.chipset || '-'}
                  </p>
                  {formatVrmsAt32Ohm(viewingItem.vrms_bal) ? (
                    <p className="col-span-2">
                      <strong>Vrms (BAL):</strong> {formatVrmsAt32Ohm(viewingItem.vrms_bal)}
                    </p>
                  ) : null}
                  {formatVrmsAt32Ohm(viewingItem.vrms_single) ? (
                    <p className="col-span-2">
                      <strong>Vrms (Single):</strong> {formatVrmsAt32Ohm(viewingItem.vrms_single)}
                    </p>
                  ) : null}
                </>
              ) : null}
              <p className="col-span-2"><strong>기타:</strong> {viewingItem.etc || '-'}</p>
            </div>
          ) : null}
        </div>

        {showFrSection ? (
          <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            {hasFrGraphUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setFrOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 text-left mb-3 rounded-lg -mx-1 px-1 py-1 hover:opacity-90 transition-opacity"
                  aria-expanded={frOpen}
                >
                  <strong className="text-sm flex items-center gap-1.5 font-semibold">
                    <LineChart className="size-4 opacity-80 shrink-0" aria-hidden />
                    FR 그래프
                  </strong>
                  <span className="text-sm opacity-60 tabular-nums shrink-0">{frOpen ? '▴' : '▾'}</span>
                </button>
                {frOpen ? (
                  <div className="space-y-4">
                    <div
                      className="rounded-xl overflow-hidden flex justify-center p-2"
                      style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                    >
                      <img
                        src={frImageDisplaySrc}
                        alt={`${viewingItem.brand} ${viewingItem.model} 주파수 응답 그래프`}
                        className="max-w-full max-h-[280px] object-contain"
                        onError={() =>
                          toast.error(
                            '이미지를 불러올 수 없습니다. URL을 확인하거나 로그인 후 다시 시도해 주세요.',
                          )
                        }
                      />
                    </div>
                    {frInterpretLoading ? (
                      <div className="flex items-center gap-2 py-2 text-sm opacity-80">
                        <div
                          className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
                          style={{
                            borderColor: 'var(--border)',
                            borderTopColor: 'var(--foreground)',
                          }}
                          aria-hidden
                        />
                        AI가 그래프를 해석하는 중…
                      </div>
                    ) : null}
                    {frInterpretParsed ? (
                      <div
                        className="text-sm space-y-3 p-4 rounded-xl leading-relaxed"
                        style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                      >
                        <p>
                          <span className="font-semibold opacity-90">저음</span>{' '}
                          <span className="opacity-85">{frInterpretParsed.bass}</span>
                        </p>
                        <p>
                          <span className="font-semibold opacity-90">중음</span>{' '}
                          <span className="opacity-85">{frInterpretParsed.mid}</span>
                        </p>
                        <p>
                          <span className="font-semibold opacity-90">고음</span>{' '}
                          <span className="opacity-85">{frInterpretParsed.treble}</span>
                        </p>
                        <p className="pt-2 border-t opacity-90" style={{ borderColor: 'var(--border)' }}>
                          {frInterpretParsed.summary}
                        </p>
                      </div>
                    ) : null}
                    {isAuthenticated !== false && !frInterpretParsed ? (
                      <button
                        type="button"
                        onClick={handleFrInterpret}
                        disabled={frInterpretLoading || !hasFrGraphUrl}
                        className="btn-apple btn-apple-secondary w-full py-2.5 text-sm disabled:opacity-40 disabled:pointer-events-none"
                      >
                        AI 해석
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <strong className="text-sm flex items-center gap-1.5 mb-3 font-semibold">
                  <LineChart className="size-4 opacity-80 shrink-0" aria-hidden />
                  FR 그래프
                </strong>
                <p className="text-sm opacity-70 py-1">
                  등록된 FR 그래프가 없습니다. 수정 화면에서 이미지를 업로드하거나 외부 이미지 URL을 입력해 저장해 주세요.
                </p>
              </>
            )}
          </div>
        ) : null}

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

          {matchedAlbums.length > 0 ? (
            <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setAlbumsOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 text-left mb-3 rounded-lg -mx-1 px-1 py-1 hover:opacity-90 transition-opacity"
                aria-expanded={albumsOpen}
              >
                <strong className="text-sm flex items-center gap-1.5 font-semibold opacity-90">
                  <Disc className="size-4 opacity-80 shrink-0" aria-hidden />
                  추천 앨범
                </strong>
                <span className="text-sm opacity-60 tabular-nums shrink-0">{albumsOpen ? '▴' : '▾'}</span>
              </button>
              {albumsOpen ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {matchedAlbums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/albums?view=${album.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:opacity-90 transition-opacity"
                      style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                      onClick={onClose}
                    >
                      {album.cover_image_url ? (
                        <img
                          src={album.cover_image_url}
                          alt=""
                          className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                          style={{ border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xs opacity-50"
                          style={{ background: 'var(--badge-bg)' }}
                        >
                          No
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{album.album_name}</p>
                        <p className="text-xs opacity-60 truncate">{album.artist}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {viewingItem.memo ? (
            <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <strong className="block mb-2">메모</strong>
              <p
                className="p-4 rounded-xl whitespace-pre-wrap leading-relaxed text-sm opacity-90"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
              >
                {viewingItem.memo}
              </p>
            </div>
          ) : null}

          {viewingItem.category === 'DAC/AMP' ? (
            <div className="pt-4 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <strong className="block mb-2 flex items-center">
                <Headphones className="size-4 opacity-80 shrink-0 mr-1.5" /> 매칭 모델
              </strong>
              {matchedHeadphones.length === 0 ? (
                <p className="text-sm opacity-70 py-2">이 기기를 매칭으로 선택한 헤드폰이 없습니다.</p>
              ) : (
                <ul className="space-y-1">
                  {matchedHeadphones.map((h) => (
                    <li key={h.id}>
                      <Link href={`/headfi?view=${h.id}`} className="link-apple text-sm">
                        {h.brand} {h.model}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {isAuthenticated ? (
          <div className="flex gap-4 pt-8 mb-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onEdit}
              className="btn-apple btn-apple-secondary flex-1 py-3 flex items-center justify-center disabled:opacity-60"
              disabled={isDeleting}
            >
              <Pencil className="size-4 shrink-0 mr-1.5" /> 정보 수정하기
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="btn-apple btn-apple-danger flex-1 py-3 flex items-center justify-center disabled:opacity-60 disabled:pointer-events-none"
              disabled={isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? (
                <DeletingLabel />
              ) : (
                <>
                  <Trash2 className="size-4 shrink-0 mr-1.5" /> 삭제하기
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
