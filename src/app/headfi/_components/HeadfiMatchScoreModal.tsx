'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import type { Headfi } from '../types';
import type { HeadfiMatchScoreMode } from '@/lib/headfiMatchScore';

type ScoreResult = {
  gear_id: number;
  brand: string;
  model: string;
  category: string;
  drive: number;
  synergy: number;
  genre: number;
  total: number;
  comment: string;
};

type HeadfiMatchScoreModalProps = {
  open: boolean;
  onClose: () => void;
  library: Headfi[];
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="opacity-70">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--badge-bg)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, background: 'var(--foreground)' }}
        />
      </div>
    </div>
  );
}

export function HeadfiMatchScoreModal({ open, onClose, library }: HeadfiMatchScoreModalProps) {
  const [mode, setMode] = useState<HeadfiMatchScoreMode>('dac_amp');
  const [baseGearId, setBaseGearId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const owned = useMemo(
    () => library.filter((item) => item.status2 === '보유중'),
    [library],
  );

  const baseOptions = useMemo(() => {
    if (mode === 'dac_amp') {
      return owned.filter((item) => item.category === 'DAC/AMP');
    }
    return owned.filter((item) => item.category === '헤드폰');
  }, [owned, mode]);

  useEffect(() => {
    if (!open) {
      setMode('dac_amp');
      setBaseGearId('');
      setLoading(false);
      setResults([]);
      setExpandedId(null);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    setBaseGearId('');
    setResults([]);
    setExpandedId(null);
  }, [mode]);

  const fetchScores = useCallback(
    async (force = false) => {
      const res = await fetch('/api/headfi-match-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          baseGearId: Number(baseGearId),
          force,
        }),
      });
      const payload = (await res.json()) as { error?: string; results?: ScoreResult[] };
      if (!res.ok) {
        throw new Error(payload.error || '분석에 실패했습니다.');
      }
      return payload.results ?? [];
    },
    [mode, baseGearId],
  );

  const handleAnalyze = async (force = false) => {
    if (!baseGearId || loading) return;
    setLoading(true);
    setResults([]);
    setExpandedId(null);
    try {
      const list = await fetchScores(force);
      if (list.length === 0) {
        throw new Error('분석 결과가 없습니다.');
      }
      setResults(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = () => {
    if (!baseGearId || loading) return;
    if (!confirm('캐시를 삭제하고 다시 분석합니다. 계속할까요?')) return;
    void handleAnalyze(true);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-panel-apple relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title flex items-center gap-2 text-xl">
            <Shuffle className="size-5 opacity-80" strokeWidth={1.5} />
            기기 매칭
          </h2>
          <button
            type="button"
            className="text-2xl font-semibold opacity-60 transition-opacity hover:opacity-100"
            onClick={onClose}
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className="btn-apple flex-1 py-2 text-sm"
            style={{
              background: mode === 'dac_amp' ? 'var(--foreground)' : 'var(--badge-bg)',
              color: mode === 'dac_amp' ? 'var(--background)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setMode('dac_amp')}
          >
            DAC/AMP 기준
          </button>
          <button
            type="button"
            className="btn-apple flex-1 py-2 text-sm"
            style={{
              background: mode === 'headphone' ? 'var(--foreground)' : 'var(--badge-bg)',
              color: mode === 'headphone' ? 'var(--background)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setMode('headphone')}
          >
            헤드폰 기준
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold opacity-90">기준 기기</label>
          {baseOptions.length === 0 ? (
            <p className="text-sm opacity-60">보유중인 기준 기기가 없습니다.</p>
          ) : (
            <select
              className="select-apple h-[42px] w-full px-3 py-2"
              value={baseGearId}
              onChange={(e) => {
                setBaseGearId(e.target.value);
                setResults([]);
                setExpandedId(null);
              }}
            >
              <option value="">선택하세요</option>
              {baseOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand} {item.model}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-apple btn-apple-primary flex h-[42px] flex-1 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!baseGearId || loading || baseOptions.length === 0}
            onClick={() => void handleAnalyze(false)}
          >
            {loading ? (
              <span
                className="inline-block h-5 w-5 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--background)' }}
              />
            ) : (
              '매칭'
            )}
          </button>
          {results.length > 0 ? (
            <button
              type="button"
              className="btn-apple btn-apple-secondary h-[42px] shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!baseGearId || loading}
              onClick={handleReanalyze}
            >
              재분석
            </button>
          ) : null}
        </div>

        {results.length > 0 ? (
          <ul className="mt-8 space-y-2 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
            {results.map((item, index) => {
              const expanded = expandedId === item.gear_id;
              return (
                <li key={`${item.gear_id}-${index}`} className="card-apple p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : item.gear_id)}
                    className="w-full text-left transition-opacity hover:opacity-95"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'var(--badge-bg)' }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {item.brand} {item.model}
                        </p>
                        <p className="text-xs opacity-60">{item.category}</p>
                        {!expanded ? (
                          <>
                            <p className="mt-1 line-clamp-2 text-xs opacity-80">{item.comment}</p>
                            <div className="mt-2">
                              <ScoreBar label="합산" value={Math.round(item.total / 3)} />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </button>
                  {expanded ? (
                    <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                      <ScoreBar label="드라이브 능력" value={item.drive} />
                      <ScoreBar label="음색 시너지" value={item.synergy} />
                      <ScoreBar label="장르 매칭" value={item.genre} />
                      <p className="text-xs leading-relaxed opacity-70">{item.comment}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
