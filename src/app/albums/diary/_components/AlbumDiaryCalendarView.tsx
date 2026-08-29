'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatListenContextMeta } from '@/lib/listenContextDisplay';
import {
  buildDiaryCalendarGrid,
  buildEntriesByDate,
  countUniqueAlbums,
  getDiaryDayCalendarGradient,
  pickDayWeatherEntry,
  weekdayLabelForDate,
  type DiaryDayGroup,
  type DiaryListenEntry,
} from '../albumDiary';
import { DiaryListenEntryListItem } from './DiaryListenEntryListItem';

type AlbumDiaryCalendarViewProps = {
  year: number;
  month: number;
  monthHint?: string | null;
  dayGroups: DiaryDayGroup[];
  editingEntryId: number | null;
  listenSaving: boolean;
  isAuthenticated: boolean | null;
  onOpenAlbum: (albumId: number) => void;
  onEditEntry: (entry: DiaryListenEntry) => void;
  onDeleteEntry: (entryId: number) => void;
};

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

export function AlbumDiaryCalendarView({
  year,
  month,
  monthHint,
  dayGroups,
  editingEntryId,
  listenSaving,
  isAuthenticated,
  onOpenAlbum,
  onEditEntry,
  onDeleteEntry,
}: AlbumDiaryCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entriesByDate = useMemo(() => buildEntriesByDate(dayGroups), [dayGroups]);
  const cells = useMemo(
    () => buildDiaryCalendarGrid(year, month, entriesByDate),
    [year, month, entriesByDate],
  );
  const selectedEntries = selectedDate ? (entriesByDate.get(selectedDate) ?? []) : [];

  return (
    <>
      {monthHint ? <p className="mb-3 text-xs opacity-55">{monthHint}</p> : null}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold opacity-55">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell, index) => {
          if (!cell.inMonth || cell.day == null || !cell.date) {
            return (
              <div
                key={`pad-${index}`}
                className="min-h-[4.5rem] rounded-lg sm:min-h-[5.5rem]"
                aria-hidden
              />
            );
          }

          const hasEntries = cell.entries.length > 0;
          const gradient = hasEntries ? getDiaryDayCalendarGradient(cell.entries) : null;
          const weatherEntry = hasEntries ? pickDayWeatherEntry(cell.entries) : null;
          const weatherText =
            weatherEntry != null
              ? formatListenContextMeta({
                  weather_condition: weatherEntry.weatherCondition,
                  temperature: weatherEntry.temperature,
                })
              : null;
          const albumCount = hasEntries ? countUniqueAlbums(cell.entries) : 0;

          if (!hasEntries) {
            return (
              <div
                key={cell.date}
                className="flex min-h-[4.5rem] flex-col rounded-lg p-2 sm:min-h-[5.5rem]"
                style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
              >
                <span className="text-lg font-semibold tabular-nums opacity-25 sm:text-xl">{cell.day}</span>
              </div>
            );
          }

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelectedDate(cell.date)}
              className="flex min-h-[4.5rem] flex-col rounded-lg p-2 text-left transition-opacity hover:opacity-90 sm:min-h-[5.5rem]"
              style={{
                background: gradient ?? 'var(--badge-bg)',
                border: '1px solid var(--border)',
                color: gradient ? '#fff' : 'var(--foreground)',
                textShadow: gradient ? '0 1px 2px rgba(0,0,0,0.4)' : undefined,
              }}
            >
              <span className="text-xl font-bold tabular-nums leading-none sm:text-2xl">{cell.day}</span>
              {weatherText ? (
                <span className="mt-auto truncate text-[10px] opacity-90 sm:text-xs">{weatherText}</span>
              ) : (
                <span className="mt-auto" />
              )}
              <span className="mt-0.5 text-[10px] font-semibold opacity-90 sm:text-xs">{albumCount}장</span>
            </button>
          );
        })}
      </div>

      {selectedDate && selectedEntries.length > 0
        ? createPortal(
            <div
              className="modal-overlay-apple fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedDate(null)}
            >
              <div
                className="modal-panel-apple relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={`${selectedDate} 청취 기록`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
                  aria-label="닫기"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
                <h3 className="mb-4 pr-8 text-base font-semibold tabular-nums">
                  {selectedDate.replace(/-/g, '.')} ({weekdayLabelForDate(selectedDate)})
                </h3>
                <ul className="space-y-2">
                  {selectedEntries.map((entry) => (
                    <DiaryListenEntryListItem
                      key={entry.id}
                      entry={entry}
                      isEditing={editingEntryId === entry.id}
                      listenSaving={listenSaving}
                      showActions={isAuthenticated === true}
                      onOpenAlbum={onOpenAlbum}
                      onEdit={(item) => {
                        setSelectedDate(null);
                        onEditEntry(item);
                      }}
                      onDelete={onDeleteEntry}
                    />
                  ))}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
