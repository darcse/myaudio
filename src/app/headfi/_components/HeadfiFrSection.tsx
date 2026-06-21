/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { LineChart } from 'lucide-react';
import { toast } from 'sonner';
import type { Headfi, HeadfiFrInterpretation } from '../types';

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

type HeadfiFrSectionProps = {
  viewingItem: Headfi;
  isAuthenticated: boolean | null;
  onHeadfiPatch?: (patch: Partial<Headfi>) => void;
  variant?: 'accordion' | 'tab';
};

export function HeadfiFrSection({
  viewingItem,
  isAuthenticated,
  onHeadfiPatch,
  variant = 'accordion',
}: HeadfiFrSectionProps) {
  const [frOpen, setFrOpen] = useState(variant === 'tab');
  const [frInterpretLoading, setFrInterpretLoading] = useState(false);

  useEffect(() => {
    setFrOpen(variant === 'tab');
  }, [viewingItem.id, variant]);

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

  if (!showFrSection) return null;

  const frContent = hasFrGraphUrl ? (
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
  ) : (
    <p className="text-sm opacity-70 py-1">
      등록된 FR 그래프가 없습니다. 수정 화면에서 이미지를 업로드하거나 외부 이미지 URL을 입력해 저장해 주세요.
    </p>
  );

  if (variant === 'tab') {
    return (
      <div className="space-y-4">
        <strong className="text-sm flex items-center gap-1.5 font-semibold">
          <LineChart className="size-4 opacity-80 shrink-0" aria-hidden />
          FR 그래프
        </strong>
        {frContent}
      </div>
    );
  }

  return (
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
          {frOpen ? frContent : null}
        </>
      ) : (
        <>
          <strong className="text-sm flex items-center gap-1.5 mb-3 font-semibold">
            <LineChart className="size-4 opacity-80 shrink-0" aria-hidden />
            FR 그래프
          </strong>
          {frContent}
        </>
      )}
    </div>
  );
}
