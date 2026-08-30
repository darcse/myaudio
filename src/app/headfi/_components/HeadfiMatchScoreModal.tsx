'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { HeadfiComboManageSection } from './HeadfiComboManageSection';
import type { Headfi, HeadfiCombo } from '../types';
import { buildGearByIdMap, formatComboLabel } from '../headfiComboUtils';

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
  isAuthenticated: boolean | null;
};

type ModalTab = 'match' | 'manage';

function tabButtonClass(active: boolean): string {
  return `inline-flex shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 pb-3 text-xs transition-colors sm:px-1 sm:text-sm ${
    active
      ? 'border-[var(--foreground)] font-semibold opacity-100'
      : 'border-transparent opacity-60 hover:opacity-90'
  }`;
}

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

export function HeadfiMatchScoreModal({ open, onClose, library, isAuthenticated }: HeadfiMatchScoreModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('match');
  const [combos, setCombos] = useState<HeadfiCombo[]>([]);
  const [comboId, setComboId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reanalyzeConfirm, setReanalyzeConfirm] = useState(false);

  const gearById = useMemo(() => buildGearByIdMap(library), [library]);

  useEffect(() => {
    if (!open) {
      setActiveTab('match');
      setComboId('');
      setLoading(false);
      setResults([]);
      setExpandedId(null);
      setReanalyzeConfirm(false);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (comboId && !combos.some((combo) => combo.id === comboId)) {
      setComboId('');
      setResults([]);
      setExpandedId(null);
    }
  }, [comboId, combos]);

  const refreshCombos = useCallback(async () => {
    if (isAuthenticated !== true) {
      setCombos([]);
      return;
    }
    const { data, error } = await createClient()
      .from('headfi_combos')
      .select('id, select1_id, select2_id, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message || '조합 목록을 불러오지 못했습니다.');
      return;
    }
    setCombos((data ?? []) as HeadfiCombo[]);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return;
    void refreshCombos();
  }, [open, refreshCombos]);

  const fetchScores = useCallback(async (targetComboId: string, force = false) => {
    const res = await fetch('/api/headfi-match-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comboId: targetComboId,
        force,
      }),
    });
    const payload = (await res.json()) as { error?: string; results?: ScoreResult[] };
    if (!res.ok) {
      throw new Error(payload.error || '분석에 실패했습니다.');
    }
    return payload.results ?? [];
  }, []);

  const handleAnalyze = async (force = false) => {
    const targetComboId = comboId.trim();
    if (!targetComboId || loading) return;
    setLoading(true);
    setResults([]);
    setExpandedId(null);
    setReanalyzeConfirm(false);
    try {
      const list = await fetchScores(targetComboId, force);
      if (list.length === 0) {
        throw new Error('분석 결과가 없습니다. 잠시 후 다시 시도해 주세요.');
      }
      setResults(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = () => {
    const targetComboId = comboId.trim();
    if (!targetComboId || loading) return;
    void handleAnalyze(true);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-panel-apple relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title flex items-center gap-2 text-xl">
            <Shuffle className="size-5 opacity-80" strokeWidth={1.5} />
            매칭 조합
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

        <div className="-mt-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="-mb-px flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className={tabButtonClass(activeTab === 'match')}
              aria-pressed={activeTab === 'match'}
            >
              매칭 조합
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={tabButtonClass(activeTab === 'manage')}
              aria-pressed={activeTab === 'manage'}
            >
              조합 관리
            </button>
          </div>
        </div>

        <div className={activeTab === 'match' ? undefined : 'hidden'} aria-hidden={activeTab !== 'match'}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold opacity-90">매칭 조합</label>
            {combos.length === 0 ? (
              <p className="text-sm opacity-60">조합을 먼저 등록해 주세요.</p>
            ) : (
              <select
                className="select-apple h-[42px] w-full px-3 py-2"
                value={comboId}
                onChange={(e) => {
                  setComboId(e.target.value);
                  setResults([]);
                  setExpandedId(null);
                  setReanalyzeConfirm(false);
                }}
              >
                <option value="">선택하세요</option>
                {combos.map((combo) => (
                  <option key={combo.id} value={combo.id}>
                    {formatComboLabel(combo, gearById)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="mb-4 text-xs opacity-60">
            선택한 조합과 보유중인 헤드폰/이어폰의 궁합을 분석합니다.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-apple btn-apple-primary flex h-[42px] flex-1 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!comboId || loading || combos.length === 0}
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
              reanalyzeConfirm ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-medium opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
                    disabled={loading}
                    onClick={() => setReanalyzeConfirm(false)}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn-apple btn-apple-danger h-[42px] shrink-0 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!comboId || loading}
                    onClick={() => void handleReanalyze()}
                  >
                    {loading ? (
                      <span
                        className="inline-block h-5 w-5 animate-spin rounded-full border-2"
                        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--background)' }}
                      />
                    ) : (
                      '확인'
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-apple btn-apple-secondary h-[42px] shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!comboId || loading}
                  onClick={() => setReanalyzeConfirm(true)}
                >
                  재분석
                </button>
              )
            ) : null}
          </div>

          {results.length > 0 && reanalyzeConfirm ? (
            <p className="mt-2 text-xs opacity-60">캐시를 삭제하고 다시 분석합니다.</p>
          ) : null}

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

        <div className={activeTab === 'manage' ? undefined : 'hidden'} aria-hidden={activeTab !== 'manage'}>
          <HeadfiComboManageSection
            library={library}
            isAuthenticated={isAuthenticated}
            onCombosChange={setCombos}
            hideHeading
          />
        </div>
      </div>
    </div>
  );
}
