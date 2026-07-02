'use client';

import type { ChangeEvent } from 'react';
import type { HeadfiFormSectionProps } from './headfiFormTypes';
import { INPUT_BASE_CLASS } from './headfiFormUtils';

type HeadfiFormFrGraphSectionProps = HeadfiFormSectionProps & {
  onFrGraphFileChange?: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function HeadfiFormFrGraphSection({
  formData,
  setFormData,
  onFrGraphFileChange,
}: HeadfiFormFrGraphSectionProps) {
  return (
    <div className="col-span-2 p-4 rounded-xl space-y-3" style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}>
      <div>
        <label className="block text-sm font-semibold mb-1 opacity-90">FR 그래프 (주파수 응답)</label>
        <p className="text-[11px] opacity-65 mb-2">
          측정 그래프 이미지를 업로드하거나, 이미 호스팅된 이미지 URL을 붙여 넣으세요.
        </p>
        <input
          type="url"
          placeholder="https://… (외부 이미지 직접 링크)"
          className={`${INPUT_BASE_CLASS} w-full`}
          value={formData.fr_graph_url}
          onChange={(e) => setFormData({ ...formData, fr_graph_url: e.target.value })}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        {onFrGraphFileChange ? (
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onFrGraphFileChange}
            className="input-apple p-2 w-full sm:w-auto file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:opacity-90"
          />
        ) : null}
        {formData.fr_graph_url ? (
          <button
            type="button"
            className="text-xs font-medium opacity-80 hover:opacity-100 underline py-2"
            onClick={() => setFormData({ ...formData, fr_graph_url: '' })}
          >
            FR 그래프 URL/업로드 지우기
          </button>
        ) : null}
      </div>
    </div>
  );
}
