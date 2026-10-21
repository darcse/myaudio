'use client';

import type { CSSProperties } from 'react';
import {
  countFilledPerformanceScores,
  LISTENING_PERFORMANCE_GROUPS,
  LISTENING_TRAIT_DISPLAY,
  LISTENING_TRAIT_STEPS,
} from '../listeningEvaluation';
import type { HeadfiFormData } from '../types';
import type { HeadfiFormSectionProps } from './headfiFormTypes';

function traitButtonStyle(active: boolean): CSSProperties {
  return {
    background: active ? 'var(--foreground)' : 'var(--badge-bg)',
    color: active ? 'var(--background)' : 'var(--foreground)',
    border: '1px solid var(--border)',
  };
}

export function HeadfiFormListeningEvaluation({ formData, setFormData }: HeadfiFormSectionProps) {
  const filled = countFilledPerformanceScores(formData);

  const setField = (key: keyof HeadfiFormData, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <div className="col-span-2">
      <div className="border-t pt-4 mt-2" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold opacity-90">성능 (1~10, 선택)</h3>
          <p className="shrink-0 text-xs font-medium tabular-nums opacity-60">{filled}/13 입력</p>
        </div>
        <p className="mb-3 text-xs leading-relaxed opacity-60">
          5=같은 가격대 평균, 7=가격대 대비 우수(7점부터 우수), 9=보유 기기 중 최상위급, 10=들어본 것 중 최고.
        </p>

        {LISTENING_PERFORMANCE_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 mt-3 text-xs opacity-60">{group.title}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {group.fields.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-2">
                  <label className="min-w-0 flex-1 truncate text-xs opacity-80" title={`${field.en} (${field.ko})`}>
                    {field.en}{' '}
                    <span className="opacity-60">({field.ko})</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input-apple h-8 w-16 flex-shrink-0 px-2 text-center text-sm"
                    value={formData[field.key]}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <h3 className="mb-2 mt-6 text-sm font-semibold opacity-90">성향 (선택, 중앙=중립)</h3>
        <p className="mb-3 text-xs opacity-60">미선택은 — 입니다. 같은 칸을 다시 누르면 해제됩니다. 0(중립)과 미입력은 다릅니다.</p>
        <div className="space-y-3">
          {LISTENING_TRAIT_DISPLAY.map((row) => {
            const current = String(formData[row.key] ?? '').trim();
            return (
              <div key={row.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-2">
                <span className="text-right text-xs opacity-70">{row.left}</span>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center gap-1">
                    {LISTENING_TRAIT_STEPS.map((step) => {
                      const selected = current === String(step);
                      return (
                        <button
                          key={step}
                          type="button"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors"
                          style={traitButtonStyle(selected)}
                          aria-pressed={selected}
                          aria-label={`${row.en} ${step}`}
                          onClick={() => setField(row.key, selected ? '' : String(step))}
                        >
                          {step > 0 ? `+${step}` : String(step)}
                        </button>
                      );
                    })}
                  </div>
                  {current === '' ? <span className="text-[10px] leading-none opacity-50">—</span> : null}
                </div>
                <span className="text-xs opacity-70">{row.right}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
