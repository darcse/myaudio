'use client';

import type { ListenHistoryComboOption } from '../_hooks/useListenHistoryComboOptions';

type ListenHistoryComboSelectProps = {
  value: string;
  options: ListenHistoryComboOption[];
  orphanLabel?: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function ListenHistoryComboSelect({
  value,
  options,
  orphanLabel,
  disabled,
  onChange,
}: ListenHistoryComboSelectProps) {
  const hasOrphan = Boolean(value && orphanLabel && !options.some((option) => option.id === value));

  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[11px] font-semibold opacity-70">조합</label>
      <select
        className="select-apple h-[42px] w-full px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="조합"
      >
        <option value="">선택 안 함</option>
        {hasOrphan ? (
          <option value={value}>{orphanLabel}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
