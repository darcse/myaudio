'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { buildTimeMachineRecallMessage, type TimeMachineRecall } from '@/lib/timeMachineRecall';
import { Clock, X } from 'lucide-react';

const DISMISS_SESSION_KEY = 'time_machine_recall_dismissed';

type TimeMachineRecallBannerProps = {
  recall: TimeMachineRecall;
  onClick: () => void;
};

export function TimeMachineRecallBanner({ recall, onClick }: TimeMachineRecallBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_SESSION_KEY) === '1');
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  const message = buildTimeMachineRecallMessage(recall);

  return (
    <div
      className="relative mb-6 rounded-xl"
      style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl p-3 pr-10 text-left transition-opacity hover:opacity-90 sm:gap-4 sm:p-4 sm:pr-12"
      >
        <div
          className="relative size-14 shrink-0 overflow-hidden rounded-lg sm:size-16"
          style={{ background: 'var(--card-bg)' }}
        >
          {recall.coverImageUrl ? (
            <img src={recall.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center opacity-40">
              <Clock className="size-5" strokeWidth={1.5} aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-55">
            <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
            타임머신 회고
          </p>
          <p className="text-sm font-medium leading-snug opacity-90">{message}</p>
          <p className="mt-1 truncate text-xs opacity-60">
            {recall.albumName}
            {recall.artist ? ` · ${recall.artist}` : ''}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-lg p-1.5 opacity-50 transition-opacity hover:opacity-100 sm:right-3 sm:top-3"
        aria-label="타임머신 회고 닫기"
        title="닫기"
      >
        <X className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
